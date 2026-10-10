/*
# Atomic Financial RPCs — Collection Recording & Order Creation

Fixes three critical data-integrity defects:
1. Collections overwrote accumulated paid_amount instead of incrementing.
2. Non-atomic 3-write sequence for collections caused book imbalances on partial failure.
3. Order creation never incremented customer current_due.

## New Functions
### record_collection(...)
SECURITY DEFINER. Atomically: inserts collection, decrements customer balance (floored at 0), increments order paid_amount. Returns inserted row as JSONB.

### create_order_with_items(p_order_data JSONB, p_items JSONB)
SECURITY DEFINER. Atomically: inserts order + all items, increments customer current_due by due_amount. Returns created order as JSONB.

## Security
- SECURITY DEFINER; EXECUTE granted to authenticated and anon.
- No new tables/columns — no data loss.
*/

DROP FUNCTION IF EXISTS record_collection(
  text, text, text, numeric, text, text, text, text
);

CREATE OR REPLACE FUNCTION record_collection(
  p_collection_number TEXT,
  p_customer_id       TEXT,
  p_order_id          TEXT,
  p_amount            NUMERIC,
  p_payment_method    TEXT,
  p_collection_date   TEXT,
  p_collected_by      TEXT,
  p_notes             TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted       JSONB;
  v_new_due        NUMERIC;
  v_order_due      NUMERIC;
  v_order_paid     NUMERIC;
  v_order_status   TEXT;
BEGIN
  INSERT INTO collections (
    collection_number, customer_id, order_id, amount,
    payment_method, collection_date, collected_by, notes
  )
  VALUES (
    p_collection_number,
    p_customer_id::uuid,
    CASE WHEN p_order_id IS NULL OR p_order_id = '' THEN NULL ELSE p_order_id::uuid END,
    p_amount,
    p_payment_method,
    p_collection_date,
    CASE WHEN p_collected_by IS NULL OR p_collected_by = '' THEN NULL ELSE p_collected_by::uuid END,
    p_notes
  )
  RETURNING to_jsonb(collections) INTO v_inserted;

  UPDATE customers
  SET current_due = GREATEST(0, current_due - p_amount),
      due_status = CASE
        WHEN GREATEST(0, current_due - p_amount) <= 0 THEN 'Clear'
        ELSE 'Partial'
      END,
      updated_at = now()
  WHERE id = p_customer_id::uuid
  RETURNING current_due INTO v_new_due;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  IF p_order_id IS NOT NULL AND p_order_id <> '' THEN
    SELECT due_amount, paid_amount INTO v_order_due, v_order_paid
    FROM orders WHERE id = p_order_id::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    v_order_paid := COALESCE(v_order_paid, 0) + p_amount;
    v_order_due  := GREATEST(0, COALESCE(v_order_due, 0) - p_amount);
    v_order_status := CASE WHEN v_order_due <= 0 THEN 'Paid' ELSE 'Partial' END;

    UPDATE orders
    SET paid_amount = v_order_paid,
        due_amount  = v_order_due,
        payment_status = v_order_status,
        updated_at = now()
    WHERE id = p_order_id::uuid;
  END IF;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION record_collection(
  text, text, text, numeric, text, text, text, text
) TO authenticated, anon;

-- ─── create_order_with_items ────────────────────────────────────────
DROP FUNCTION IF EXISTS create_order_with_items(JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order_data JSONB,
  p_items      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           JSONB;
  v_order_id        uuid;
  v_due_amount      NUMERIC;
  v_customer_id     uuid;
  v_item            JSONB;
  v_current_due     NUMERIC;
  v_delivery_date   TEXT;
  v_sales_rep_id    TEXT;
BEGIN
  v_delivery_date := p_order_data->>'delivery_date';
  v_delivery_date := CASE WHEN v_delivery_date IS NULL OR v_delivery_date = '' THEN NULL ELSE v_delivery_date END;
  v_sales_rep_id := p_order_data->>'sales_rep_id';
  v_sales_rep_id := CASE WHEN v_sales_rep_id IS NULL OR v_sales_rep_id = '' THEN NULL ELSE v_sales_rep_id END;

  INSERT INTO orders (
    order_number, customer_id, sales_rep_id, status,
    subtotal, discount, total_amount, due_amount,
    payment_status, notes, delivery_date
  )
  VALUES (
    p_order_data->>'order_number',
    (p_order_data->>'customer_id')::uuid,
    CASE WHEN v_sales_rep_id IS NULL THEN NULL ELSE v_sales_rep_id::uuid END,
    COALESCE(p_order_data->>'status', 'Pending'),
    COALESCE((p_order_data->>'subtotal')::numeric, 0),
    COALESCE((p_order_data->>'discount')::numeric, 0),
    COALESCE((p_order_data->>'total_amount')::numeric, 0),
    COALESCE((p_order_data->>'due_amount')::numeric, 0),
    COALESCE(p_order_data->>'payment_status', 'Unpaid'),
    p_order_data->>'notes',
    v_delivery_date
  )
  RETURNING id, to_jsonb(orders) INTO v_order_id, v_order;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price,
      discount, subtotal, price_tier
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'quantity')::numeric, 0),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount')::numeric, 0),
      COALESCE((v_item->>'subtotal')::numeric, 0),
      COALESCE(v_item->>'price_tier', 'DP')
    );
  END LOOP;

  v_due_amount := COALESCE((p_order_data->>'due_amount')::numeric, 0);
  v_customer_id := (p_order_data->>'customer_id')::uuid;

  IF v_due_amount > 0 THEN
    SELECT current_due INTO v_current_due
    FROM customers WHERE id = v_customer_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found: %', v_customer_id;
    END IF;

    UPDATE customers
    SET current_due = current_due + v_due_amount,
        due_status = 'Partial',
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB)
TO authenticated, anon;

/*
# Fix record_collection RPC Date Casting

Explicitly cast `p_collection_date::timestamptz` in the `record_collection` function to prevent:
"column collection_date is of type timestamp with time zone but expression is of type text"
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
  v_date_tz        TIMESTAMPTZ;
BEGIN
  IF p_collection_date IS NULL OR p_collection_date = '' THEN
    v_date_tz := now();
  ELSE
    v_date_tz := p_collection_date::timestamptz;
  END IF;

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
    v_date_tz,
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

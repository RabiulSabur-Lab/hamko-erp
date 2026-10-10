-- Enforce stock validation in create_order_with_items RPC
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
  v_prod_stock      NUMERIC;
  v_prod_name       TEXT;
  v_qty             NUMERIC;
BEGIN
  -- 1. Validate real-time stock availability for every requested item before inserting
  -- Skip strict validation if order status is 'Draft' (allows pre-orders/drafts overbooking)
  IF COALESCE(p_order_data->>'status', 'Pending') <> 'Draft' THEN
    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
      v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
      
      SELECT stock_quantity, name INTO v_prod_stock, v_prod_name
      FROM products
      WHERE id = (v_item->>'product_id')::uuid;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', (v_item->>'product_id');
      END IF;

      IF v_prod_stock IS NULL OR v_prod_stock <= 0 OR v_qty > v_prod_stock THEN
        RAISE EXCEPTION 'Insufficient stock available for %', v_prod_name;
      END IF;
    END LOOP;
  END IF;

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

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated, anon;

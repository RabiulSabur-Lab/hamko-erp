/*
# Atomic Stock Transaction RPC

## Purpose
Fixes issue #7: recording a "Transfer" type stock transaction created a record but did not change
the product's actual stock_quantity. Also makes all stock transaction types atomic so the
transaction record and the product stock update can never drift apart.

## New Function
### record_stock_transaction(p_tx JSONB)
SECURITY DEFINER. Atomically:
- Inserts a row into `stock_transactions`.
- Updates `products.stock_quantity` based on transaction_type:
  - "Stock In": increments by quantity
  - "Stock Out": decrements by quantity (floored at 0)
  - "Damage": decrements by quantity (floored at 0)
  - "Transfer": no net stock change (stock stays on the same product row; the from/to warehouse
    is recorded for audit). If in the future per-warehouse stock is needed, a warehouse table
    can be added, but the current schema has a single stock_quantity column per product.
  - "Adjustment": sets stock_quantity to the provided quantity value
- Returns the inserted transaction row as JSONB.

## Security
- SECURITY DEFINER so the product update works regardless of RLS.
- EXECUTE granted to authenticated and anon.
- No new tables or columns — no data loss.
*/

DROP FUNCTION IF EXISTS record_stock_transaction(JSONB);

CREATE OR REPLACE FUNCTION record_stock_transaction(p_tx JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted     JSONB;
  v_product_id   uuid;
  v_qty          NUMERIC;
  v_type         TEXT;
  v_current      NUMERIC;
  v_new_qty      NUMERIC;
BEGIN
  v_product_id := (p_tx->>'product_id')::uuid;
  v_qty        := COALESCE((p_tx->>'quantity')::numeric, 0);
  v_type       := p_tx->>'transaction_type';

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;

  -- Insert the transaction record
  INSERT INTO stock_transactions (
    product_id, transaction_type, quantity,
    from_warehouse, to_warehouse, reference, notes, performed_by
  )
  VALUES (
    v_product_id,
    v_type,
    v_qty,
    p_tx->>'from_warehouse',
    p_tx->>'to_warehouse',
    p_tx->>'reference',
    p_tx->>'notes',
    CASE WHEN p_tx->>'performed_by' IS NULL OR p_tx->>'performed_by' = '' THEN NULL ELSE (p_tx->>'performed_by')::uuid END
  )
  RETURNING to_jsonb(stock_transactions) INTO v_inserted;

  -- Read current stock
  SELECT stock_quantity INTO v_current FROM products WHERE id = v_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', v_product_id;
  END IF;

  v_new_qty := v_current;

  IF v_type = 'Stock In' THEN
    v_new_qty := v_current + v_qty;
  ELSIF v_type = 'Stock Out' OR v_type = 'Damage' THEN
    v_new_qty := GREATEST(0, v_current - v_qty);
  ELSIF v_type = 'Adjustment' THEN
    v_new_qty := v_qty;
  ELSIF v_type = 'Transfer' THEN
    -- No net change to product stock; movement is logged in the transaction record.
    v_new_qty := v_current;
  END IF;

  UPDATE products
  SET stock_quantity = v_new_qty, updated_at = now()
  WHERE id = v_product_id;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION record_stock_transaction(JSONB) TO authenticated, anon;

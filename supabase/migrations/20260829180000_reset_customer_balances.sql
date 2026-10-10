-- ==============================================================================
-- SQL Script to Reset All Orders, Sales, Collections, Expenses & Reset Stock to 100
-- ==============================================================================

-- 1. Clear all records from collections table
DELETE FROM collections;

-- 2. Clear all records from order_items and orders tables
DELETE FROM order_items;
DELETE FROM orders;

-- 3. Clear all records from expenses table
DELETE FROM expenses;

-- 4. Clear all stock transactions
DELETE FROM stock_transactions;

-- 5. Reset all customer dues, opening balances, and set status to 'Clear'
UPDATE customers
SET
  current_due = 0,
  due_status = 'Clear',
  opening_balance = 0,
  updated_at = NOW();

-- 6. Set stock for every product in products table to exactly 100
UPDATE products
SET
  stock_quantity = 100,
  updated_at = NOW();

-- 7. Set stock for every product in inventory table to exactly 100
INSERT INTO inventory (product_id, warehouse, quantity, updated_at)
SELECT id, 'Main', 100, NOW()
FROM products
ON CONFLICT (product_id, warehouse)
DO UPDATE SET quantity = 100, updated_at = NOW();

-- 8. RPC function for one-click calling from frontend or backend
CREATE OR REPLACE FUNCTION reset_all_customer_balances()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear transactions
  DELETE FROM collections;
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM expenses;
  DELETE FROM stock_transactions;

  -- Reset customers
  UPDATE customers
  SET
    current_due = 0,
    due_status = 'Clear',
    opening_balance = 0,
    updated_at = NOW();

  -- Reset product stock to 100
  UPDATE products
  SET
    stock_quantity = 100,
    updated_at = NOW();

  -- Sync inventory table
  INSERT INTO inventory (product_id, warehouse, quantity, updated_at)
  SELECT id, 'Main', 100, NOW()
  FROM products
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET quantity = 100, updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'message', 'All orders, sales, collections, expenses cleared. Products untouched with stock set to 100.'
  );
END;
$$;

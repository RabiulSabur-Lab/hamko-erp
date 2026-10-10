/*
# Pricing Tiers: D10, B12 + order_items.price_tier

Adds two optional price tier columns to products (d10_price, b12_price) and
a price_tier column to order_items so the selected tier is saved per line.

No tables or columns are dropped; no user data is deleted or altered.
*/

-- 1. Product price tier columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS d10_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS b12_price numeric DEFAULT NULL;

-- Backfill: D10 = dealer_price + 10%, B12 = dealer_price + 12%
UPDATE products SET d10_price = dealer_price * 1.10 WHERE d10_price IS NULL AND dealer_price > 0;
UPDATE products SET b12_price = dealer_price * 1.12 WHERE b12_price IS NULL AND dealer_price > 0;

-- 2. order_items: save which tier was applied
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_tier text DEFAULT 'DP';

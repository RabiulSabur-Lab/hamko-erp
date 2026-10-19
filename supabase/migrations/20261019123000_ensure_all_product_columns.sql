/*
# Comprehensive migration: Ensure all product table schema columns exist
#
# Fixes errors:
# - Could not find the 'distributor_price' column of 'products' in the schema cache
# - Could not find the 'brand' column of 'products' in the schema cache
# - Ensures dealer_price, unit_price, mrp, unit, reorder_level, price_tiers exist
*/

-- 1. Essential Pricing & Product columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS distributor_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dealer_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text DEFAULT 'Hamko';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Dynamic price tiers
ALTER TABLE products ADD COLUMN IF NOT EXISTS d10_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS b12_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT '[]'::jsonb;

-- 3. Backfill defaults for any NULL rows
UPDATE products SET distributor_price = 0 WHERE distributor_price IS NULL;
UPDATE products SET dealer_price = unit_price WHERE (dealer_price IS NULL OR dealer_price = 0) AND unit_price > 0;
UPDATE products SET unit_price = dealer_price WHERE (unit_price IS NULL OR unit_price = 0) AND dealer_price > 0;
UPDATE products SET brand = 'Hamko' WHERE brand IS NULL OR TRIM(brand) = '';
UPDATE products SET unit = 'pcs' WHERE unit IS NULL OR TRIM(unit) = '';
UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL;
UPDATE products SET reorder_level = 10 WHERE reorder_level IS NULL;
UPDATE products SET is_active = true WHERE is_active IS NULL;

-- 4. Fast query indexes
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 5. Force PostgREST schema cache to immediately reload all columns
NOTIFY pgrst, 'reload schema';

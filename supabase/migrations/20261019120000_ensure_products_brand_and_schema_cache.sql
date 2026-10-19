/*
# Ensure 'brand' and required columns exist on products table
#
# Fixes error: Could not find the 'brand' column of 'products' in the schema cache
# Ensures compatibility between Supabase database and frontend application
*/

-- 1. Ensure brand column exists with default 'Hamko'
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text DEFAULT 'Hamko';

-- 2. Backfill existing products where brand is NULL or empty
UPDATE products 
SET brand = 'Hamko' 
WHERE brand IS NULL OR TRIM(brand) = '';

-- 3. Ensure other dynamic pricing and sync columns exist safely
ALTER TABLE products ADD COLUMN IF NOT EXISTS d10_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS b12_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

-- 4. Create an index on brand for fast search and filtering
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- 5. Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

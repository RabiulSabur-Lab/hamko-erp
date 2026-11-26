-- =============================================================================
-- HAMKO COOKWARE OFFICIAL PRODUCT CATALOG — SUPABASE ERP IMPORT SCRIPT
-- Total Products: 230 | Categories: 12
-- Dealer Price (unit_price / dealer_price) initialized to 0 for manual pricing.
-- Uses erp_sku_code to avoid overwriting 3 printed catalog duplicate codes
-- (HG-01-06-RR, HA15-01-GS, HA15-02-GS).
-- =============================================================================

BEGIN;

-- 1. Upsert Categories
INSERT INTO public.categories (name, description)
VALUES
  ('Gas Stove', 'HAMKO Cookware — Gas Stove'),
  ('Induction Cooker', 'HAMKO Cookware — Induction Cooker'),
  ('Infrared Cooker', 'HAMKO Cookware — Infrared Cooker'),
  ('Mixer Grinder', 'HAMKO Cookware — Mixer Grinder'),
  ('Electric Kettle', 'HAMKO Cookware — Electric Kettle'),
  ('Rice Cooker', 'HAMKO Cookware — Rice Cooker'),
  ('Ceramic Coating Cookware', 'HAMKO Cookware — Ceramic Coating Cookware'),
  ('Non-Stick Cookware', 'HAMKO Cookware — Non-Stick Cookware'),
  ('Pressure Cooker', 'HAMKO Cookware — Pressure Cooker'),
  ('Aluminum Cookware', 'HAMKO Cookware — Aluminum Cookware'),
  ('Stainless Steel Cookware', 'HAMKO Cookware — Stainless Steel Cookware'),
  ('Hot Pot & Food Carrier', 'HAMKO Cookware — Hot Pot & Food Carrier')
ON CONFLICT (name) DO NOTHING;

-- 2. Upsert Products (matches DbProductRow schema in src/lib/supabase.ts)
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-02-07', 'Blue Lily Single Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-02-09', 'Red Crown Single Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-02-11', 'Black Rose Single Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-06', 'Ocean Blue Double Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-06-RR', 'Red Rose Double Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-07', 'Black Pansy Single Burner (Glass Top)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-02-16', 'Single Honeycomb Burner (SS Body)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-02-17', 'Single Jumbo Burner (SS Body)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-16', 'Double Burner Printed Top (SS Body)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-14', 'Double Honeycomb Burner (SS Body)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HG-01-15', 'Double Jumbo Burner (SS Body)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Gas Stove'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HEC1-03', 'Induction Cooker 2200W', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Induction Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HEC2-01', 'Infrared Cooker 2200W', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Infrared Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HB1-01', 'Classic HC 750', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Mixer Grinder'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HB1-02', 'Classic HC 850', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Mixer Grinder'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HB1-03', 'Exclusive HE 750', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Mixer Grinder'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HB1-07', 'Pride HP 850', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Mixer Grinder'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS18-05', 'SS Straight Body Electric Kettle 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Electric Kettle'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS18-06', 'SS Straight Body Electric Kettle 2.2 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Electric Kettle'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS18-07', 'Plastic Body Electric Kettle 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Electric Kettle'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-07', 'Full Body Rice Cooker (1 Alu + 1 SS Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-16', 'Full Body Rice Cooker (1 Alu + 1 SS Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-05', 'Full Body Rice Cooker (Double SS Pot, SS Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-15', 'Full Body Rice Cooker (Double SS Pot, SS Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-08', 'Full Body Rice Cooker (Single Alu Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-17', 'Full Body Rice Cooker (Single Alu Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-10', 'Full Body Rice Cooker (Single SS Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-18', 'Full Body Rice Cooker (Single SS Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA14-07', 'Full Body Matching Color Rice Cooker (1 Alu + 1 SS Pot, SS Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA14-16', 'Full Body Matching Color Rice Cooker (1 Alu + 1 SS Pot, SS Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-01', 'Joint Steel Body Rice Cooker (1 Alu + 1 SS Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-11', 'Joint Steel Body Rice Cooker (1 Alu + 1 SS Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-04', 'Joint Steel Body Rice Cooker (Double SS Pot, SS Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-14', 'Joint Steel Body Rice Cooker (Double SS Pot, SS Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-02', 'Joint Steel Body Rice Cooker (Single Alu Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-12', 'Joint Steel Body Rice Cooker (Single Alu Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-03', 'Joint Steel Body Rice Cooker (Single SS Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-13', 'Joint Steel Body Rice Cooker (Single SS Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA14-01', 'Joint Steel Body Matching Color Rice Cooker (1 Alu + 1 SS Pot, SS Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA14-11', 'Joint Steel Body Matching Color Rice Cooker (1 Alu + 1 SS Pot, SS Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-30', 'Premium Rice Cooker (1 Alu + 1 SS Pot, Steel Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-33', 'Premium Rice Cooker (1 Alu + 1 SS Pot, Steel Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-31', 'Premium Rice Cooker (Single Alu Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-34', 'Premium Rice Cooker (Single Alu Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-32', 'Premium Rice Cooker (Single SS Pot, Alu Steamer) 1.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-35', 'Premium Rice Cooker (Single SS Pot, Alu Steamer) 2.8 Ltr', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Rice Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-01', 'Super Ceramic Casserole Pan 18cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-02', 'Super Ceramic Casserole Pan 20cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-03', 'Super Ceramic Casserole Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-04', 'Super Ceramic Casserole Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-05', 'Super Ceramic Casserole Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-06', 'Super Ceramic Casserole Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-07', 'Super Ceramic Casserole Pan 18cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-08', 'Super Ceramic Casserole Pan 20cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-09', 'Super Ceramic Casserole Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-10', 'Super Ceramic Casserole Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-11', 'Super Ceramic Casserole Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC1-12', 'Super Ceramic Casserole Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-01', 'Super Ceramic Fry Pan 20cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-02', 'Super Ceramic Fry Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-03', 'Super Ceramic Fry Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-04', 'Super Ceramic Fry Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-05', 'Super Ceramic Fry Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-06', 'Super Ceramic Fry Pan 20cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-07', 'Super Ceramic Fry Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-08', 'Super Ceramic Fry Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-09', 'Super Ceramic Fry Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC3-10', 'Super Ceramic Fry Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-02', 'Super Ceramic Wok Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-03', 'Super Ceramic Wok Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-04', 'Super Ceramic Wok Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-05', 'Super Ceramic Wok Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-06', 'Super Ceramic Wok Pan 30cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-08', 'Super Ceramic Wok Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-09', 'Super Ceramic Wok Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-10', 'Super Ceramic Wok Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-11', 'Super Ceramic Wok Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HCC12-12', 'Super Ceramic Wok Pan 30cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Ceramic Coating Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-01', 'Non-Stick Casserole Pan 18cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-02', 'Non-Stick Casserole Pan 20cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-03', 'Non-Stick Casserole Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-04', 'Non-Stick Casserole Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-05', 'Non-Stick Casserole Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-06', 'Non-Stick Casserole Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-07', 'Non-Stick Casserole Pan 18cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-08', 'Non-Stick Casserole Pan 20cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-09', 'Non-Stick Casserole Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-10', 'Non-Stick Casserole Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-11', 'Non-Stick Casserole Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF1-12', 'Non-Stick Casserole Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-01', 'Non-Stick Fry Pan 20cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-02', 'Non-Stick Fry Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-03', 'Non-Stick Fry Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-04', 'Non-Stick Fry Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-05', 'Non-Stick Fry Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-06', 'Non-Stick Fry Pan 20cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-07', 'Non-Stick Fry Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-08', 'Non-Stick Fry Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-09', 'Non-Stick Fry Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-10', 'Non-Stick Fry Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-21', 'Non-Stick Fry Pan Without Lid 20cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-22', 'Non-Stick Fry Pan Without Lid 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-23', 'Non-Stick Fry Pan Without Lid 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-24', 'Non-Stick Fry Pan Without Lid 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-25', 'Non-Stick Fry Pan Without Lid 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-26', 'Non-Stick Fry Pan Without Lid 20cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-27', 'Non-Stick Fry Pan Without Lid 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-28', 'Non-Stick Fry Pan Without Lid 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-29', 'Non-Stick Fry Pan Without Lid 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF3-30', 'Non-Stick Fry Pan Without Lid 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA13-01', 'Non-Stick Milk Pan 18cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA13-04', 'Non-Stick Milk Pan 18cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA7-01', 'Non-Stick Ruti Tawa 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA7-02', 'Non-Stick Ruti Tawa 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-01', 'Non-Stick Pizza Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-02', 'Non-Stick Pizza Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-03', 'Non-Stick Pizza Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-04', 'Non-Stick Pizza Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-05', 'Non-Stick Pizza Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA8-06', 'Non-Stick Pizza Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF8-01', 'Forge Pizza Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF8-02', 'Forge Pizza Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF8-07', 'Forge Grill Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HAF8-08', 'Forge Grill Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-02', 'Non-Stick Wok Pan 22cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-03', 'Non-Stick Wok Pan 24cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-04', 'Non-Stick Wok Pan 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-05', 'Non-Stick Wok Pan 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-06', 'Non-Stick Wok Pan 30cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-08', 'Non-Stick Wok Pan 22cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-09', 'Non-Stick Wok Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-10', 'Non-Stick Wok Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-11', 'Non-Stick Wok Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA12-12', 'Non-Stick Wok Pan 30cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-01-GS', '7 Pieces Gift Set (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA15-02-GS', '7 Pieces Gift Set (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Non-Stick Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-09', 'Straight Pressure Cooker [Inner Lid] 2.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-01', 'Straight Pressure Cooker [Inner Lid] 3.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-02', 'Straight Pressure Cooker [Inner Lid] 4.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-03', 'Straight Pressure Cooker [Inner Lid] 5.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-04', 'Straight Pressure Cooker [Inner Lid] 6.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-11', 'Straight Pressure Cooker [Inner Lid] 8 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-10', 'Straight Pressure Cooker [Inner Lid] 2.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-05', 'Straight Pressure Cooker [Inner Lid] 3.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-06', 'Straight Pressure Cooker [Inner Lid] 4.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-07', 'Straight Pressure Cooker [Inner Lid] 5.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-08', 'Straight Pressure Cooker [Inner Lid] 6.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA5-12', 'Straight Pressure Cooker [Inner Lid] 8 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-01', 'Oval Pressure Cooker [Inner Lid] 3.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-02', 'Oval Pressure Cooker [Inner Lid] 4.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-03', 'Oval Pressure Cooker [Inner Lid] 5.5 Ltr. (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-04', 'Oval Pressure Cooker [Inner Lid] 3.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-05', 'Oval Pressure Cooker [Inner Lid] 4.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA6-06', 'Oval Pressure Cooker [Inner Lid] 5.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Pressure Cooker'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA9-01', 'TH Aluminum Sauce Pan 26cm (8.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA9-02', 'TH Aluminum Sauce Pan 28cm (10.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA9-03', 'TH Aluminum Sauce Pan 30cm (12.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA10-01', 'Aluminum Deep Curry Pan 26cm (6.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA10-02', 'Aluminum Deep Curry Pan 28cm (7.5Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA10-03', 'Aluminum Deep Curry Pan 30cm (9.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-01', 'Classic Super Karai 26cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-02', 'Classic Super Karai 28cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-03', 'Classic Super Karai 30cm (Non-IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-04', 'Classic Super Karai 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-05', 'Classic Super Karai 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HA11-06', 'Classic Super Karai 30cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Aluminum Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS11-00', 'Three Layer Fry Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS11-04', 'Three Layer Fry Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS11-01', 'Three Layer Wok Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS11-02', 'Three Layer Wok Pan 28cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS11-03', 'Three Layer Wok Pan 30cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS19-01', 'Three Layer Sauce Pan 19cm (3.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS19-02', 'Three Layer Sauce Pan 19cm (4.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS19-03', 'Three Layer Sauce Pan 23cm (5.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS19-04', 'Three Layer Sauce Pan 23cm (6.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS20-01', 'Three Layer Pizza Pan 24cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS20-02', 'Three Layer Pizza Pan 26cm (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS21-01', 'Three Layer Pressure Cooker 3.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS21-02', 'Three Layer Pressure Cooker 4.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS21-03', 'Three Layer Pressure Cooker 5.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS21-04', 'Three Layer Pressure Cooker 6.5 Ltr. (IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS1-01', 'Oval Sauce Pan With Glass Lid 20cm (3.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS1-02', 'Oval Sauce Pan With Glass Lid 22cm (3.5Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS1-03', 'Oval Sauce Pan With Glass Lid 24cm (4.5Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS1-04', 'Oval Sauce Pan With Glass Lid 26cm (6.0Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS03-01', 'Straight Sauce Pan With SS Lid 24cm (4.25Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS03-02', 'Straight Sauce Pan With SS Lid 26cm (5.25Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS03-03', 'Straight Sauce Pan With SS Lid 30cm (7.25Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS02-05', 'SS Fry Pan With Lid 24cm (1.9Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS4-01', 'Two Side Handle Pot 14cm (0.600Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS4-02', 'Two Side Handle Pot 16cm (0.800Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS4-03', 'Two Side Handle Pot 18cm (1.2Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS4-04', 'Two Side Handle Pot 20cm (1.6Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS4-05', 'Two Side Handle Pot 22cm (2.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-00', 'Classic Bowl 10cm (0.270Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-01', 'Classic Bowl 12cm (0.400Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-02', 'Classic Bowl 14cm (0.600Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-03', 'Classic Bowl 16cm (0.900Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-04', 'Classic Bowl 18cm (1.20Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-05', 'Classic Bowl 20cm (1.60Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-06', 'Classic Bowl 22cm (2.25Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-07', 'Classic Bowl 24cm (2.90Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS5-08', 'Classic Bowl 26cm (3.70Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS7-01', 'SS Milk Pan With SS Lid 20cm (2.85Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS7-02', 'SS Milk Pan With Glass Lid 20cm (2.85Ltr IB)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS8-01', 'Super Bowl 14cm (0.600Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS8-02', 'Super Bowl 16cm (0.800Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS8-03', 'Super Bowl 18cm (1.2Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS8-04', 'Super Bowl 20cm (1.6Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS8-05', 'Super Bowl 22cm (2.0Ltr)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-00', 'Deep Baby Plate 18cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-01', 'Classic Half Plate 18cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-09', 'Deep Plate 22cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-03', 'Deep Plate 24cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-05', 'Deep Plate 26cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-02', 'Flat Plate 24cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-07', 'Round Plate 24cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS6-04', 'Classic Plate 26cm', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Stainless Steel Cookware'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS14-01', 'Deep Hot Pot (Single Pot 750ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS15-01', 'Tiffin Carrier (Three Pot 1500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS15-02', 'Classic Tiffin Box (Single Pot 500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS17-01', 'Smart Hot Pot (Two Pot 1500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS17-02', 'Smart Hot Pot (One Pot 750ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS16-01', 'Lunch Carrier (Three Pot 1000ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS16-02', 'Lunch Carrier (Four Pot 1350ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS13-01', 'Magnum Hot Pot (Single Pot 500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS13-02', 'Magnum Hot Pot (Single Pot 1000ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS13-03', 'Magnum Hot Pot (Single Pot 1500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS13-04', 'Magnum Hot Pot (Single Pot 2000ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();
INSERT INTO public.products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit, is_active)
SELECT 'HS13-05', 'Magnum Hot Pot (Single Pot 2500ml)', 'Hamko', c.id, 0, 0, 0, 0, 10, 'pcs', true
FROM public.categories c WHERE c.name = 'Hot Pot & Food Carrier'
ON CONFLICT (sku_code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  updated_at = now();

COMMIT;

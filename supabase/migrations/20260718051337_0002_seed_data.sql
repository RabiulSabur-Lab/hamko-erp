/*
# Sales ERP Pro - Seed Data

Inserts reference data: 5 roles, 6 categories, 4 territories, 12 cookware
products with tiered pricing, 6 sample customers. Uses ON CONFLICT DO NOTHING
so re-running is safe.
*/

-- Roles
INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Full system access including user management and configuration'),
  ('Sales Manager', 'Manages sales team, approves orders, views all reports'),
  ('Sales Officer', 'Creates orders, manages assigned customers, logs visits'),
  ('Distributor', 'Distributes products, manages distributor-level inventory and dues'),
  ('Accountant', 'Manages collections, expenses, and financial reports')
ON CONFLICT (name) DO NOTHING;

-- Territories
INSERT INTO territories (name, code, region) VALUES
  ('Dhaka North', 'DN-01', 'Dhaka'),
  ('Dhaka South', 'DS-01', 'Dhaka'),
  ('Chittagong', 'CTG-01', 'Chittagong'),
  ('Sylhet', 'SYL-01', 'Sylhet')
ON CONFLICT (name) DO NOTHING;

-- Categories
INSERT INTO categories (name, description) VALUES
  ('Cookware', 'Pots, pans, and cooking vessels'),
  ('Bakeware', 'Baking dishes, trays, and molds'),
  ('Kitchen Tools', 'Utensils and kitchen gadgets'),
  ('Cutlery', 'Knives and cutting tools'),
  ('Small Appliances', 'Electric kitchen appliances'),
  ('Accessories', 'Kitchen accessories and add-ons')
ON CONFLICT (name) DO NOTHING;

-- Products
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit)
SELECT v.sku, v.pname, v.brand, c.id, v.unit_price, v.dealer_price, v.distributor_price, v.stock, v.reorder, v.unit
FROM (VALUES
  ('CW-NS-20', 'Non-Stick Frying Pan 20cm', 'ChefPro', 'Cookware', 1200, 980, 880, 150, 30, 'pcs'),
  ('CW-NS-24', 'Non-Stick Frying Pan 24cm', 'ChefPro', 'Cookware', 1500, 1220, 1100, 120, 30, 'pcs'),
  ('CW-SP-28', 'Stainless Steel Stock Pot 28cm', 'RoyalCook', 'Cookware', 2200, 1850, 1680, 80, 20, 'pcs'),
  ('CW-SP-32', 'Stainless Steel Stock Pot 32cm', 'RoyalCook', 'Cookware', 2800, 2350, 2150, 60, 20, 'pcs'),
  ('CW-WOK-30', 'Carbon Steel Wok 30cm', 'WokMaster', 'Cookware', 1800, 1500, 1350, 8, 25, 'pcs'),
  ('BW-CA-09', 'Round Cake Pan 9 inch', 'BakeEasy', 'Bakeware', 650, 520, 460, 200, 40, 'pcs'),
  ('BW-MF-12', 'Muffin Tray 12 Cup', 'BakeEasy', 'Bakeware', 850, 700, 620, 90, 25, 'pcs'),
  ('KT-SP-SET', 'Stainless Spoons Set of 6', 'HomeChef', 'Kitchen Tools', 750, 600, 540, 300, 50, 'set'),
  ('KT-TURN-01', 'Silicone Turner Spatula', 'HomeChef', 'Kitchen Tools', 350, 280, 250, 12, 40, 'pcs'),
  ('CL-CHEF-08', 'Chef Knife 8 inch', 'SharpEdge', 'Cutlery', 1600, 1300, 1180, 75, 20, 'pcs'),
  ('SA-BLND-12', 'Hand Blender 1200W', 'PowerMix', 'Small Appliances', 3500, 2950, 2700, 45, 15, 'pcs'),
  ('AC-APRON-01', 'Cotton Kitchen Apron', 'HomeChef', 'Accessories', 550, 430, 380, 180, 30, 'pcs')
) AS v(sku, pname, brand, cat_name, unit_price, dealer_price, distributor_price, stock, reorder, unit)
JOIN categories c ON c.name = v.cat_name
ON CONFLICT (sku_code) DO NOTHING;

-- Customers
INSERT INTO customers (name, customer_type, contact_person, phone, email, address, city, territory_id, trade_license_number, opening_balance, current_due, due_status, notes)
SELECT v.cname, v.ctype, v.contact, v.phone, v.email, v.addr, v.city, t.id, v.license, v.opening, v.due, v.dstatus, v.notes
FROM (VALUES
  ('Bengal Cookware Mart', 'Dealer', 'Rahim Uddin', '01711-223344', 'rahim@bengalmart.com', '123 Gulshan Ave', 'Dhaka', 'Dhaka North', 'DL-2021-001', 25000, 12000, 'Partial', 'Key dealer in Gulshan'),
  ('City Kitchen Store', 'Retailer', 'Karim Ahmed', '01822-334455', 'karim@citykitchen.com', '45 Mirpur Rd', 'Dhaka', 'Dhaka North', 'RT-2022-045', 5000, 0, 'Clear', 'Regular retailer'),
  ('Premium Home Goods', 'Wholesale', 'Salma Begum', '01933-445566', 'salma@premiumhg.com', '78 Chawkbazar', 'Chittagong', 'Chittagong', 'WS-2020-012', 48000, 30000, 'Overdue', 'Large wholesaler, needs follow-up'),
  ('Sylhet Kitchen Center', 'Dealer', 'Jamal Hossain', '01644-556677', 'jamal@sylhetc.com', '12 Zindabazar', 'Sylhet', 'Sylhet', 'DL-2023-088', 15000, 8500, 'Partial', 'Growing dealer'),
  ('Dhanmondi Home Shop', 'Retailer', 'Nadia Islam', '01555-667788', 'nadia@dhanmondi.com', '23 Dhanmondi 27', 'Dhaka', 'Dhaka South', 'RT-2021-112', 2000, 0, 'Clear', 'Small retailer'),
  ('Chittagong Wholesale Kitchen', 'Wholesale', 'Alam Chowdhury', '01366-778899', 'alam@cwk.com', '34 Agrabad', 'Chittagong', 'Chittagong', 'WS-2021-033', 60000, 15000, 'Partial', 'Top wholesaler in CTG')
) AS v(cname, ctype, contact, phone, email, addr, city, tname, license, opening, due, dstatus, notes)
JOIN territories t ON t.name = v.tname
ON CONFLICT DO NOTHING;

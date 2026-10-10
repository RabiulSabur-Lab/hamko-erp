-- Load and seed Hamko data from Excel files
-- Products from New_DP_April_v3.xlsx (145 products, 17 categories)
-- Customers from Credit_Summery.xlsx (22 dealers across 3 territories)
-- Collections from Collection_and_Delivery.xlsx (9 entries)
-- Order from Hamko_Invoice.xlsx (invoice 24865)

-- First clear old seed data
DELETE FROM order_items;
DELETE FROM collections;
DELETE FROM orders;
DELETE FROM expenses;
DELETE FROM sales_targets;
DELETE FROM notifications;
DELETE FROM visits;
DELETE FROM stock_transactions;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM categories WHERE name NOT IN ('Cookware','Electronics','Accessories');
DELETE FROM territories WHERE name NOT IN ('Dhaka','Chittagong','Khulna');

-- Categories from DP report
INSERT INTO categories (name, description) VALUES ('Rice Cooker', 'Hamko Rice Cooker') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Pressure Cooker', 'Hamko Pressure Cooker') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Casserole', 'Hamko Casserole') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Deep Frypan', 'Hamko Deep Frypan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Frypan', 'Hamko Frypan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Wokpan', 'Hamko Wokpan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Milk Pan', 'Hamko Milk Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Ruti/Pizza Pan', 'Hamko Ruti/Pizza Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('SS Sauce Pan', 'Hamko SS Sauce Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('SS 3 Layer Sauce Pan', 'Hamko SS 3 Layer Sauce Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('SS Fry Pan', 'Hamko SS Fry Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('SS 3 Layer Wok Pan', 'Hamko SS 3 Layer Wok Pan') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Two Side Handle Pot', 'Hamko Two Side Handle Pot') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('SS Plate/Bowl', 'Hamko SS Plate/Bowl') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Electric Kettle', 'Hamko Electric Kettle') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Blander', 'Hamko Blander') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, description) VALUES ('Gas Stove', 'Hamko Gas Stove') ON CONFLICT (name) DO NOTHING;

-- Territories
INSERT INTO territories (name, code, region) VALUES ('Bhandaria', 'BHA', 'Barishal') ON CONFLICT (name) DO NOTHING;
INSERT INTO territories (name, code, region) VALUES ('Mathbaria', 'MAT', 'Barishal') ON CONFLICT (name) DO NOTHING;
INSERT INTO territories (name, code, region) VALUES ('Zianagar', 'ZIA', 'Barishal') ON CONFLICT (name) DO NOTHING;

-- Customers from Credit Summary (22 dealers)
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Moumita', 'Dealer', 'Moumita', '0110000000', 'Bhandaria Market', 'Bhandaria', t.id, 231438, 'Overdue', 231438 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Razapur', 'Dealer', 'Razapur', '0110000001', 'Bhandaria Market', 'Bhandaria', t.id, 24878, 'Partial', 24878 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Kabir', 'Dealer', 'Kabir', '0110000002', 'Bhandaria Market', 'Bhandaria', t.id, 22116, 'Partial', 22116 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Miya', 'Dealer', 'Miya', '0110000003', 'Bhandaria Market', 'Bhandaria', t.id, 25574, 'Partial', 25574 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Rafid', 'Dealer', 'Rafid', '0110000004', 'Bhandaria Market', 'Bhandaria', t.id, 16000, 'Partial', 16000 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Fatema', 'Dealer', 'Fatema', '0110000005', 'Bhandaria Market', 'Bhandaria', t.id, 44719, 'Partial', 44719 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Badhon', 'Dealer', 'Badhon', '0110000006', 'Bhandaria Market', 'Bhandaria', t.id, 0, 'Clear', 0 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Alam', 'Dealer', 'Alam', '0110000007', 'Bhandaria Market', 'Bhandaria', t.id, 4732, 'Partial', 4732 FROM territories t WHERE t.name='Bhandaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'PakAzad', 'Dealer', 'PakAzad', '0110000008', 'Mathbaria Market', 'Mathbaria', t.id, 47616, 'Partial', 47616 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Himel', 'Dealer', 'Himel', '0110000009', 'Mathbaria Market', 'Mathbaria', t.id, 1022, 'Partial', 1022 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'BhaiBhai', 'Dealer', 'BhaiBhai', '0110000010', 'Mathbaria Market', 'Mathbaria', t.id, 3450, 'Partial', 3450 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Akon', 'Dealer', 'Akon', '0110000011', 'Mathbaria Market', 'Mathbaria', t.id, 15000, 'Partial', 15000 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Modina', 'Dealer', 'Modina', '0110000012', 'Mathbaria Market', 'Mathbaria', t.id, 90945, 'Overdue', 90945 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Digital', 'Dealer', 'Digital', '0110000013', 'Mathbaria Market', 'Mathbaria', t.id, 52538, 'Overdue', 52538 FROM territories t WHERE t.name='Mathbaria';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Talukder', 'Dealer', 'Talukder', '0110000014', 'Zianagar Market', 'Zianagar', t.id, 5500, 'Partial', 5500 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Khan', 'Dealer', 'Khan', '0110000015', 'Zianagar Market', 'Zianagar', t.id, 5395, 'Partial', 5395 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Naim', 'Dealer', 'Naim', '0110000016', 'Zianagar Market', 'Zianagar', t.id, 10400, 'Partial', 10400 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Hasan', 'Dealer', 'Hasan', '0110000017', 'Zianagar Market', 'Zianagar', t.id, 3600, 'Partial', 3600 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'RafiqZ', 'Dealer', 'RafiqZ', '0110000018', 'Zianagar Market', 'Zianagar', t.id, 3274, 'Partial', 3274 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Ebrahim', 'Dealer', 'Ebrahim', '0110000019', 'Zianagar Market', 'Zianagar', t.id, 0, 'Clear', 0 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'RafiqB', 'Dealer', 'RafiqB', '0110000020', 'Zianagar Market', 'Zianagar', t.id, 14360, 'Partial', 14360 FROM territories t WHERE t.name='Zianagar';
INSERT INTO customers (name, customer_type, contact_person, phone, address, city, territory_id, current_due, due_status, opening_balance) SELECT 'Maisha', 'Dealer', 'Maisha', '0110000021', 'Zianagar Market', 'Zianagar', t.id, 141769, 'Overdue', 141769 FROM territories t WHERE t.name='Zianagar';
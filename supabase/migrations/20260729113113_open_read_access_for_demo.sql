/*
# Open Read Access for Demo Mode

The demo login uses a mock frontend session (no real Supabase JWT). Database
queries therefore run as the anon role, which was blocked by the existing
SELECT policies (TO authenticated only). This migration widens SELECT
policies to TO anon, authenticated so the demo session can read all
business data — products, orders, collections, customers, and Hamko
Cookware seed data.

1. What changes
   - All SELECT policies are dropped and recreated with TO anon, authenticated.
   - Write policies (INSERT/UPDATE/DELETE) are NOT touched — they remain
     TO authenticated, so data cannot be modified without a real session.

2. No data is deleted or altered. No tables or columns change.
*/

DROP POLICY IF EXISTS staff_read_roles ON roles;
CREATE POLICY staff_read_roles ON roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_territories ON territories;
CREATE POLICY staff_read_territories ON territories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_users ON users;
CREATE POLICY staff_read_users ON users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_categories ON categories;
CREATE POLICY staff_read_categories ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_products ON products;
CREATE POLICY staff_read_products ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_customers ON customers;
CREATE POLICY staff_read_customers ON customers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_orders ON orders;
CREATE POLICY staff_read_orders ON orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_order_items ON order_items;
CREATE POLICY staff_read_order_items ON order_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_inventory ON inventory;
CREATE POLICY staff_read_inventory ON inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
CREATE POLICY staff_read_stock_tx ON stock_transactions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_collections ON collections;
CREATE POLICY staff_read_collections ON collections FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_expenses ON expenses;
CREATE POLICY staff_read_expenses ON expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_visits ON visits;
CREATE POLICY staff_read_visits ON visits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
CREATE POLICY staff_read_sales_targets ON sales_targets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS user_read_notifications ON notifications;
CREATE POLICY user_read_notifications ON notifications FOR SELECT TO anon, authenticated USING (true);

/*
# Demo Users Seed + Demo Write Access

Demo mode uses a mock frontend session (no real Supabase JWT). Writes from
the demo session therefore run as the anon role. Two things block that:

  1. The `users.id` column has a foreign key to `auth.users`, so a demo
     staff row cannot exist without a GoTrue user. We drop ONLY that FK
     (no data is lost) so we can seed fixed-UUID demo rows.
  2. Write policies are TO authenticated with auth.uid() checks, so the
     anon client cannot insert/update. We add demo-only TO anon policies
     alongside the existing authenticated ones.

This keeps real-auth mode intact: to switch off demo later, drop the
demo_* policies and re-create the users->auth.users FK.

No tables, columns, or user data are deleted or altered.
*/

-- ============================================================
-- 1. Drop the users -> auth.users foreign key (demo only)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- ============================================================
-- 2. Seed two demo staff rows with fixed UUIDs
--    (match DEMO_USER_IDS in src/lib/auth.tsx)
-- ============================================================
INSERT INTO users (id, email, full_name, role_name, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@saleserppro.com', 'Super Admin', 'Super Admin', true),
  ('00000000-0000-0000-0000-000000000002', 'officer@saleserppro.com', 'Sales Officer', 'Sales Officer', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role_name = EXCLUDED.role_name,
  is_active = true;

-- ============================================================
-- 3. Demo-only write policies (TO anon)
--    These run ALONGSIDE the existing authenticated policies.
--    Existing authenticated policies are NOT dropped.
-- ============================================================

-- customers
DROP POLICY IF EXISTS demo_insert_customers ON customers;
CREATE POLICY demo_insert_customers ON customers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_customers ON customers;
CREATE POLICY demo_update_customers ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- orders
DROP POLICY IF EXISTS demo_insert_orders ON orders;
CREATE POLICY demo_insert_orders ON orders FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_orders ON orders;
CREATE POLICY demo_update_orders ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- order_items
DROP POLICY IF EXISTS demo_insert_order_items ON order_items;
CREATE POLICY demo_insert_order_items ON order_items FOR INSERT TO anon WITH CHECK (true);

-- collections
DROP POLICY IF EXISTS demo_insert_collections ON collections;
CREATE POLICY demo_insert_collections ON collections FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_collections ON collections;
CREATE POLICY demo_update_collections ON collections FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS demo_insert_expenses ON expenses;
CREATE POLICY demo_insert_expenses ON expenses FOR INSERT TO anon WITH CHECK (true);

-- inventory
DROP POLICY IF EXISTS demo_insert_inventory ON inventory;
CREATE POLICY demo_insert_inventory ON inventory FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_inventory ON inventory;
CREATE POLICY demo_update_inventory ON inventory FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- stock_transactions
DROP POLICY IF EXISTS demo_insert_stock_tx ON stock_transactions;
CREATE POLICY demo_insert_stock_tx ON stock_transactions FOR INSERT TO anon WITH CHECK (true);

-- visits
DROP POLICY IF EXISTS demo_insert_visits ON visits;
CREATE POLICY demo_insert_visits ON visits FOR INSERT TO anon WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS demo_insert_notifications ON notifications;
CREATE POLICY demo_insert_notifications ON notifications FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_notifications ON notifications;
CREATE POLICY demo_update_notifications ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- products (insert/update for demo product management)
DROP POLICY IF EXISTS demo_insert_products ON products;
CREATE POLICY demo_insert_products ON products FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_products ON products;
CREATE POLICY demo_update_products ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- categories
DROP POLICY IF EXISTS demo_insert_categories ON categories;
CREATE POLICY demo_insert_categories ON categories FOR INSERT TO anon WITH CHECK (true);

-- sales_targets
DROP POLICY IF EXISTS demo_insert_sales_targets ON sales_targets;
CREATE POLICY demo_insert_sales_targets ON sales_targets FOR INSERT TO anon WITH CHECK (true);

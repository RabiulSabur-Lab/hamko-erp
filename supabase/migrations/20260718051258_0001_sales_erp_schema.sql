/*
# Sales ERP Pro - Core Database Schema

Creates all 15 core tables with relationships, constraints, and RLS.
Tables: roles, territories, users, categories, products, customers, orders,
order_items, inventory, stock_transactions, collections, expenses, visits,
sales_targets, notifications.

Security: RLS on all tables; policies scoped to authenticated users with
role checks. Tables created first, then policies (some policies reference
users table which must exist before the policy can be created).
*/

-- ============================================================
-- TABLES (created first, no policies yet)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE,
  manager_id uuid,
  region text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role_name text NOT NULL DEFAULT 'Sales Officer',
  territory_id uuid REFERENCES territories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Now link territories.manager_id to users (both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'territories_manager_id_fkey' AND table_name = 'territories'
  ) THEN
    ALTER TABLE territories
      ADD CONSTRAINT territories_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code text UNIQUE NOT NULL,
  name text NOT NULL,
  brand text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  dealer_price numeric(12,2) NOT NULL DEFAULT 0,
  distributor_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 10,
  unit text DEFAULT 'pcs',
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_type text NOT NULL CHECK (customer_type IN ('Dealer','Retailer','Wholesale')),
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  territory_id uuid REFERENCES territories(id) ON DELETE SET NULL,
  trade_license_number text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  opening_balance numeric(12,2) DEFAULT 0,
  current_due numeric(12,2) DEFAULT 0,
  due_status text DEFAULT 'Clear' CHECK (due_status IN ('Clear','Overdue','Partial')),
  notes text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sales_rep_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_date timestamptz DEFAULT now(),
  delivery_date date,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Pending','Approved','Delivered','Cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  due_amount numeric(12,2) DEFAULT 0,
  payment_status text DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid','Partial','Paid')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse text NOT NULL DEFAULT 'Main',
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, warehouse)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Stock In','Stock Out','Transfer','Adjustment','Damage')),
  quantity integer NOT NULL,
  from_warehouse text,
  to_warehouse text,
  reference text,
  notes text,
  performed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  transaction_date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text DEFAULT 'Cash' CHECK (payment_method IN ('Cash','Cheque','Bank Transfer','Mobile Banking')),
  collection_date timestamptz DEFAULT now(),
  collected_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  visited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  visit_date timestamptz DEFAULT now(),
  check_in timestamptz,
  check_out timestamptz,
  latitude numeric(10,6),
  longitude numeric(10,6),
  purpose text,
  outcome text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  territory_id uuid REFERENCES territories(id) ON DELETE SET NULL,
  period text NOT NULL CHECK (period IN ('Daily','Weekly','Monthly','Quarterly','Yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_amount numeric(12,2) NOT NULL DEFAULT 0,
  achieved_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Due Reminder','Low Stock','Sales Target','Order Status','General')),
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES (all tables exist now, so cross-table checks are safe)
-- ============================================================

-- roles
DROP POLICY IF EXISTS staff_read_roles ON roles;
CREATE POLICY staff_read_roles ON roles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_roles ON roles;
CREATE POLICY admin_insert_roles ON roles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

DROP POLICY IF EXISTS admin_update_roles ON roles;
CREATE POLICY admin_update_roles ON roles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

DROP POLICY IF EXISTS admin_delete_roles ON roles;
CREATE POLICY admin_delete_roles ON roles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- territories
DROP POLICY IF EXISTS staff_read_territories ON territories;
CREATE POLICY staff_read_territories ON territories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS manager_insert_territories ON territories;
CREATE POLICY manager_insert_territories ON territories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

DROP POLICY IF EXISTS manager_update_territories ON territories;
CREATE POLICY manager_update_territories ON territories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_delete_territories ON territories;
CREATE POLICY admin_delete_territories ON territories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- users
DROP POLICY IF EXISTS staff_read_users ON users;
CREATE POLICY staff_read_users ON users FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_users ON users;
CREATE POLICY admin_insert_users ON users FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_or_self_update_users ON users;
CREATE POLICY admin_or_self_update_users ON users FOR UPDATE
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_delete_users ON users;
CREATE POLICY admin_delete_users ON users FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- categories
DROP POLICY IF EXISTS staff_read_categories ON categories;
CREATE POLICY staff_read_categories ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_categories ON categories;
CREATE POLICY staff_insert_categories ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_categories ON categories;
CREATE POLICY staff_update_categories ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_categories ON categories;
CREATE POLICY admin_delete_categories ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- products
DROP POLICY IF EXISTS staff_read_products ON products;
CREATE POLICY staff_read_products ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_products ON products;
CREATE POLICY staff_insert_products ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_products ON products;
CREATE POLICY staff_update_products ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_products ON products;
CREATE POLICY admin_delete_products ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- customers
DROP POLICY IF EXISTS staff_read_customers ON customers;
CREATE POLICY staff_read_customers ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_customers ON customers;
CREATE POLICY staff_insert_customers ON customers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_customers ON customers;
CREATE POLICY staff_update_customers ON customers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_customers ON customers;
CREATE POLICY manager_delete_customers ON customers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- orders
DROP POLICY IF EXISTS staff_read_orders ON orders;
CREATE POLICY staff_read_orders ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_orders ON orders;
CREATE POLICY staff_insert_orders ON orders FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_orders ON orders;
CREATE POLICY staff_update_orders ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_orders ON orders;
CREATE POLICY manager_delete_orders ON orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- order_items
DROP POLICY IF EXISTS staff_read_order_items ON order_items;
CREATE POLICY staff_read_order_items ON order_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_order_items ON order_items;
CREATE POLICY staff_insert_order_items ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_order_items ON order_items;
CREATE POLICY staff_update_order_items ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_order_items ON order_items;
CREATE POLICY manager_delete_order_items ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- inventory
DROP POLICY IF EXISTS staff_read_inventory ON inventory;
CREATE POLICY staff_read_inventory ON inventory FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_inventory ON inventory;
CREATE POLICY staff_insert_inventory ON inventory FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_inventory ON inventory;
CREATE POLICY staff_update_inventory ON inventory FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_inventory ON inventory;
CREATE POLICY manager_delete_inventory ON inventory FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

-- stock_transactions
DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
CREATE POLICY staff_read_stock_tx ON stock_transactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_stock_tx ON stock_transactions;
CREATE POLICY staff_insert_stock_tx ON stock_transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_stock_tx ON stock_transactions;
CREATE POLICY manager_delete_stock_tx ON stock_transactions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

-- collections
DROP POLICY IF EXISTS staff_read_collections ON collections;
CREATE POLICY staff_read_collections ON collections FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_collections ON collections;
CREATE POLICY staff_insert_collections ON collections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_collections ON collections;
CREATE POLICY staff_update_collections ON collections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_collections ON collections;
CREATE POLICY admin_delete_collections ON collections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Accountant'))
  );

-- expenses
DROP POLICY IF EXISTS staff_read_expenses ON expenses;
CREATE POLICY staff_read_expenses ON expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_expenses ON expenses;
CREATE POLICY staff_insert_expenses ON expenses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_expenses ON expenses;
CREATE POLICY staff_update_expenses ON expenses FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_expenses ON expenses;
CREATE POLICY admin_delete_expenses ON expenses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Accountant'))
  );

-- visits
DROP POLICY IF EXISTS staff_read_visits ON visits;
CREATE POLICY staff_read_visits ON visits FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_visits ON visits;
CREATE POLICY staff_insert_visits ON visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_visits ON visits;
CREATE POLICY staff_update_visits ON visits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_visits ON visits;
CREATE POLICY manager_delete_visits ON visits FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- sales_targets
DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
CREATE POLICY staff_read_sales_targets ON sales_targets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS manager_insert_sales_targets ON sales_targets;
CREATE POLICY manager_insert_sales_targets ON sales_targets FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS manager_update_sales_targets ON sales_targets;
CREATE POLICY manager_update_sales_targets ON sales_targets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_delete_sales_targets ON sales_targets;
CREATE POLICY admin_delete_sales_targets ON sales_targets FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- notifications
DROP POLICY IF EXISTS user_read_notifications ON notifications;
CREATE POLICY user_read_notifications ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS staff_insert_notifications ON notifications;
CREATE POLICY staff_insert_notifications ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS user_update_notifications ON notifications;
CREATE POLICY user_update_notifications ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_delete_notifications ON notifications;
CREATE POLICY owner_delete_notifications ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku_code);
CREATE INDEX IF NOT EXISTS idx_customers_territory ON customers(territory_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_sales_rep ON orders(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_product ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON stock_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_collections_customer ON collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_by ON visits(visited_by);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_sales_targets_user ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HELPER: generate order/collection numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS collection_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  seq_val integer;
BEGIN
  SELECT nextval('order_number_seq') INTO seq_val;
  RETURN 'ORD-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_collection_number()
RETURNS text AS $$
DECLARE
  seq_val integer;
BEGIN
  SELECT nextval('collection_number_seq') INTO seq_val;
  RETURN 'COL-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

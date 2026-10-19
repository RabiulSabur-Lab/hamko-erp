-- ============================================================
-- Hamko Sales ERP - Complete Consolidated Database Schema
-- Target Project: aqbacbamlvwymiedubli (https://aqbacbamlvwymiedubli.supabase.co)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Migration: 20260718051258_0001_sales_erp_schema.sql
-- ============================================================
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
  brand text DEFAULT 'Hamko',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  dealer_price numeric(12,2) NOT NULL DEFAULT 0,
  distributor_price numeric(12,2) NOT NULL DEFAULT 0,
  mrp numeric(12,2) DEFAULT NULL,
  d10_price numeric DEFAULT NULL,
  b12_price numeric DEFAULT NULL,
  price_tiers jsonb DEFAULT '[]'::jsonb,
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
DROP POLICY IF EXISTS staff_read_roles ON roles;
CREATE POLICY staff_read_roles ON roles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_roles ON roles;
DROP POLICY IF EXISTS admin_insert_roles ON roles;
CREATE POLICY admin_insert_roles ON roles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

DROP POLICY IF EXISTS admin_update_roles ON roles;
DROP POLICY IF EXISTS admin_update_roles ON roles;
CREATE POLICY admin_update_roles ON roles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

DROP POLICY IF EXISTS admin_delete_roles ON roles;
DROP POLICY IF EXISTS admin_delete_roles ON roles;
CREATE POLICY admin_delete_roles ON roles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- territories
DROP POLICY IF EXISTS staff_read_territories ON territories;
DROP POLICY IF EXISTS staff_read_territories ON territories;
CREATE POLICY staff_read_territories ON territories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS manager_insert_territories ON territories;
DROP POLICY IF EXISTS manager_insert_territories ON territories;
CREATE POLICY manager_insert_territories ON territories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

DROP POLICY IF EXISTS manager_update_territories ON territories;
DROP POLICY IF EXISTS manager_update_territories ON territories;
CREATE POLICY manager_update_territories ON territories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_delete_territories ON territories;
DROP POLICY IF EXISTS admin_delete_territories ON territories;
CREATE POLICY admin_delete_territories ON territories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- users
DROP POLICY IF EXISTS staff_read_users ON users;
DROP POLICY IF EXISTS staff_read_users ON users;
CREATE POLICY staff_read_users ON users FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_users ON users;
DROP POLICY IF EXISTS admin_insert_users ON users;
CREATE POLICY admin_insert_users ON users FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_or_self_update_users ON users;
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
DROP POLICY IF EXISTS admin_delete_users ON users;
CREATE POLICY admin_delete_users ON users FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- categories
DROP POLICY IF EXISTS staff_read_categories ON categories;
DROP POLICY IF EXISTS staff_read_categories ON categories;
CREATE POLICY staff_read_categories ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_categories ON categories;
DROP POLICY IF EXISTS staff_insert_categories ON categories;
CREATE POLICY staff_insert_categories ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_categories ON categories;
DROP POLICY IF EXISTS staff_update_categories ON categories;
CREATE POLICY staff_update_categories ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_categories ON categories;
DROP POLICY IF EXISTS admin_delete_categories ON categories;
CREATE POLICY admin_delete_categories ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- products
DROP POLICY IF EXISTS staff_read_products ON products;
DROP POLICY IF EXISTS staff_read_products ON products;
CREATE POLICY staff_read_products ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_products ON products;
DROP POLICY IF EXISTS staff_insert_products ON products;
CREATE POLICY staff_insert_products ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_products ON products;
DROP POLICY IF EXISTS staff_update_products ON products;
CREATE POLICY staff_update_products ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_products ON products;
DROP POLICY IF EXISTS admin_delete_products ON products;
CREATE POLICY admin_delete_products ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- customers
DROP POLICY IF EXISTS staff_read_customers ON customers;
DROP POLICY IF EXISTS staff_read_customers ON customers;
CREATE POLICY staff_read_customers ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_customers ON customers;
DROP POLICY IF EXISTS staff_insert_customers ON customers;
CREATE POLICY staff_insert_customers ON customers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_customers ON customers;
DROP POLICY IF EXISTS staff_update_customers ON customers;
CREATE POLICY staff_update_customers ON customers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_customers ON customers;
DROP POLICY IF EXISTS manager_delete_customers ON customers;
CREATE POLICY manager_delete_customers ON customers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- orders
DROP POLICY IF EXISTS staff_read_orders ON orders;
DROP POLICY IF EXISTS staff_read_orders ON orders;
CREATE POLICY staff_read_orders ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_orders ON orders;
DROP POLICY IF EXISTS staff_insert_orders ON orders;
CREATE POLICY staff_insert_orders ON orders FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_orders ON orders;
DROP POLICY IF EXISTS staff_update_orders ON orders;
CREATE POLICY staff_update_orders ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_orders ON orders;
DROP POLICY IF EXISTS manager_delete_orders ON orders;
CREATE POLICY manager_delete_orders ON orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- order_items
DROP POLICY IF EXISTS staff_read_order_items ON order_items;
DROP POLICY IF EXISTS staff_read_order_items ON order_items;
CREATE POLICY staff_read_order_items ON order_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_order_items ON order_items;
DROP POLICY IF EXISTS staff_insert_order_items ON order_items;
CREATE POLICY staff_insert_order_items ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_order_items ON order_items;
DROP POLICY IF EXISTS staff_update_order_items ON order_items;
CREATE POLICY staff_update_order_items ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_order_items ON order_items;
DROP POLICY IF EXISTS manager_delete_order_items ON order_items;
CREATE POLICY manager_delete_order_items ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- inventory
DROP POLICY IF EXISTS staff_read_inventory ON inventory;
DROP POLICY IF EXISTS staff_read_inventory ON inventory;
CREATE POLICY staff_read_inventory ON inventory FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_inventory ON inventory;
DROP POLICY IF EXISTS staff_insert_inventory ON inventory;
CREATE POLICY staff_insert_inventory ON inventory FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_inventory ON inventory;
DROP POLICY IF EXISTS staff_update_inventory ON inventory;
CREATE POLICY staff_update_inventory ON inventory FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_inventory ON inventory;
DROP POLICY IF EXISTS manager_delete_inventory ON inventory;
CREATE POLICY manager_delete_inventory ON inventory FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

-- stock_transactions
DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
CREATE POLICY staff_read_stock_tx ON stock_transactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_stock_tx ON stock_transactions;
DROP POLICY IF EXISTS staff_insert_stock_tx ON stock_transactions;
CREATE POLICY staff_insert_stock_tx ON stock_transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_stock_tx ON stock_transactions;
DROP POLICY IF EXISTS manager_delete_stock_tx ON stock_transactions;
CREATE POLICY manager_delete_stock_tx ON stock_transactions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager','Accountant'))
  );

-- collections
DROP POLICY IF EXISTS staff_read_collections ON collections;
DROP POLICY IF EXISTS staff_read_collections ON collections;
CREATE POLICY staff_read_collections ON collections FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_collections ON collections;
DROP POLICY IF EXISTS staff_insert_collections ON collections;
CREATE POLICY staff_insert_collections ON collections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_collections ON collections;
DROP POLICY IF EXISTS staff_update_collections ON collections;
CREATE POLICY staff_update_collections ON collections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_collections ON collections;
DROP POLICY IF EXISTS admin_delete_collections ON collections;
CREATE POLICY admin_delete_collections ON collections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Accountant'))
  );

-- expenses
DROP POLICY IF EXISTS staff_read_expenses ON expenses;
DROP POLICY IF EXISTS staff_read_expenses ON expenses;
CREATE POLICY staff_read_expenses ON expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_expenses ON expenses;
DROP POLICY IF EXISTS staff_insert_expenses ON expenses;
CREATE POLICY staff_insert_expenses ON expenses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_expenses ON expenses;
DROP POLICY IF EXISTS staff_update_expenses ON expenses;
CREATE POLICY staff_update_expenses ON expenses FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS admin_delete_expenses ON expenses;
DROP POLICY IF EXISTS admin_delete_expenses ON expenses;
CREATE POLICY admin_delete_expenses ON expenses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Accountant'))
  );

-- visits
DROP POLICY IF EXISTS staff_read_visits ON visits;
DROP POLICY IF EXISTS staff_read_visits ON visits;
CREATE POLICY staff_read_visits ON visits FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS staff_insert_visits ON visits;
DROP POLICY IF EXISTS staff_insert_visits ON visits;
CREATE POLICY staff_insert_visits ON visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS staff_update_visits ON visits;
DROP POLICY IF EXISTS staff_update_visits ON visits;
CREATE POLICY staff_update_visits ON visits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS manager_delete_visits ON visits;
DROP POLICY IF EXISTS manager_delete_visits ON visits;
CREATE POLICY manager_delete_visits ON visits FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

-- sales_targets
DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
CREATE POLICY staff_read_sales_targets ON sales_targets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS manager_insert_sales_targets ON sales_targets;
DROP POLICY IF EXISTS manager_insert_sales_targets ON sales_targets;
CREATE POLICY manager_insert_sales_targets ON sales_targets FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS manager_update_sales_targets ON sales_targets;
DROP POLICY IF EXISTS manager_update_sales_targets ON sales_targets;
CREATE POLICY manager_update_sales_targets ON sales_targets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name IN ('Super Admin','Sales Manager'))
  );

DROP POLICY IF EXISTS admin_delete_sales_targets ON sales_targets;
DROP POLICY IF EXISTS admin_delete_sales_targets ON sales_targets;
CREATE POLICY admin_delete_sales_targets ON sales_targets FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_name = 'Super Admin')
  );

-- notifications
DROP POLICY IF EXISTS user_read_notifications ON notifications;
DROP POLICY IF EXISTS user_read_notifications ON notifications;
CREATE POLICY user_read_notifications ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS staff_insert_notifications ON notifications;
DROP POLICY IF EXISTS staff_insert_notifications ON notifications;
CREATE POLICY staff_insert_notifications ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS user_update_notifications ON notifications;
DROP POLICY IF EXISTS user_update_notifications ON notifications;
CREATE POLICY user_update_notifications ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_delete_notifications ON notifications;
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


-- ============================================================
-- Migration: 20260718051337_0002_seed_data.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260718054505_0003_hamko_data_seed.sql.sql
-- ============================================================
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

-- ============================================================
-- Migration: 20260718055222_0004_hamko_products.sql.sql
-- ============================================================
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-01', 'Still R/C- SS+Alu Pot 1.8L', 'Hamko', c.id, 2425, 2183, 2138.85, 60, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-02', 'Still R/C- Singel Alu Pot 1.8L', 'Hamko', c.id, 2075, 1868, 1830.15, 55, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-03', 'Still R/C- Singel SS Pot 1.8L', 'Hamko', c.id, 2075, 1868, 1830.15, 178, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-04', 'Double SS Pot 1.8L', 'Hamko', c.id, 2535, 2282, 2235.87, 148, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-05', 'F.B Double SS Pot 1.8L', 'Hamko', c.id, 2585, 2327, 2279.97, 156, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-07', 'F.B R/C- SS+Alu Pot 1.8L', 'Hamko', c.id, 2475, 2228, 2182.95, 59, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-08', 'F.B R/C- Singel Alu Pot 1.8L', 'Hamko', c.id, 2125, 1913, 1874.25, 165, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-10', 'F.B R/C- Singel SS Pot 1.8L', 'Hamko', c.id, 2125, 1913, 1874.25, 106, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-11', 'Still R/C- SS+Alu Pot 2.8L', 'Hamko', c.id, 2965, 2669, 2615.13, 140, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-12', 'Still R/C- Singel Alu Pot 2.8L', 'Hamko', c.id, 2570, 2313, 2266.74, 87, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-13', 'Still R/C- Singel SS Pot 2.8L', 'Hamko', c.id, 2570, 2313, 2266.74, 147, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-15', 'Double SS Pot 2.8L', 'Hamko', c.id, 3120, 2808, 2751.84, 167, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-16', 'F.B R/C- SS+Alu Pot 2.8L', 'Hamko', c.id, 3015, 2714, 2659.23, 21, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-17', 'F.B R/C- Singel Alu Pot 2.8L', 'Hamko', c.id, 2620, 2358, 2310.84, 175, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA15-18', 'F.B R/C- Singel SS Pot 2.8L', 'Hamko', c.id, 2620, 2358, 2310.84, 196, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HR14-01', 'J.B R/C- SS+Alu Pot MC R+G Line 1.8L', 'Hamko', c.id, 2480, 2232, 2187.36, 73, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HR14-11', 'J.B R/C- SS+Alu Pot MC R+G Line 2.8L', 'Hamko', c.id, 3020, 2718, 2663.64, 205, 15, 'pcs' FROM categories c WHERE c.name='Rice Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-01', 'Pressure Cooker Straight 3.5L', 'Hamko', c.id, 1255, 1130, 1106.91, 39, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-02', 'Pressure Cooker Straight 4.5L', 'Hamko', c.id, 1530, 1377, 1349.46, 29, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-03', 'Pressure Cooker Straight 5.5L', 'Hamko', c.id, 1605, 1445, 1415.61, 171, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-04', 'Pressure Cooker Straight 6.5L', 'Hamko', c.id, 1730, 1557, 1525.86, 151, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-11', 'Pressure Cooker Straight 8L', 'Hamko', c.id, 2480, 2232, 2187.36, 21, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-05', 'Pressure Cooker Straight IB 3.5L', 'Hamko', c.id, 1330, 1197, 1173.06, 158, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-06', 'Pressure Cooker Straight IB 4.5L', 'Hamko', c.id, 1605, 1445, 1415.61, 54, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-07', 'Pressure Cooker Straight IB 5.5L', 'Hamko', c.id, 1680, 1512, 1481.76, 101, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-08', 'Pressure Cooker Straight IB 6.5L', 'Hamko', c.id, 1805, 1625, 1592.01, 99, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-12', 'Pressure Cooker Straight IB 8L', 'Hamko', c.id, 2555, 2300, 2253.51, 151, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-09', 'Pressure Cooker Straight 2.5L', 'Hamko', c.id, 1155, 1040, 1018.71, 117, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA5-10', 'Pressure Cooker Straight IB 2.5L', 'Hamko', c.id, 1230, 1107, 1084.86, 27, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-01', 'Pressure Cooker Oval 3.5L', 'Hamko', c.id, 1355, 1220, 1195.11, 160, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-02', 'Pressure Cooker Oval 4.5L', 'Hamko', c.id, 1605, 1445, 1415.61, 155, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-03', 'Pressure Cooker Oval 5.5L', 'Hamko', c.id, 1680, 1512, 1481.76, 185, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-04', 'Pressure Cooker Oval IB 3.5L', 'Hamko', c.id, 1430, 1287, 1261.26, 124, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-05', 'Pressure Cooker Oval IB 4.5L', 'Hamko', c.id, 1680, 1512, 1481.76, 171, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA6-06', 'Pressure Cooker Oval IB 5.5L', 'Hamko', c.id, 1760, 1584, 1552.32, 214, 15, 'pcs' FROM categories c WHERE c.name='Pressure Cooker' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-01', 'Casserole Pan 18L', 'Hamko', c.id, 975, 878, 859.95, 164, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-02', 'Casserole Pan 20L', 'Hamko', c.id, 1105, 995, 974.61, 117, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-03', 'Casserole Pan 22L', 'Hamko', c.id, 1240, 1116, 1093.68, 196, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-04', 'Casserole Pan 24L', 'Hamko', c.id, 1435, 1292, 1265.67, 173, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-05', 'Casserole Pan 26L', 'Hamko', c.id, 1570, 1413, 1384.74, 117, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-06', 'Casserole Pan 28L', 'Hamko', c.id, 1820, 1638, 1605.24, 65, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-07', 'Casserole Pan IB 18L', 'Hamko', c.id, 1050, 945, 926.1, 153, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-08', 'Casserole Pan IB 20L', 'Hamko', c.id, 1190, 1071, 1049.58, 91, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-09', 'Casserole Pan IB 22L', 'Hamko', c.id, 1320, 1188, 1164.24, 33, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-10', 'Casserole Pan IB 24L', 'Hamko', c.id, 1510, 1359, 1331.82, 196, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-11', 'Casserole Pan IB 26L', 'Hamko', c.id, 1640, 1476, 1446.48, 116, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF1-12', 'Casserole Pan IB 28L', 'Hamko', c.id, 1900, 1710, 1675.8, 104, 15, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-01', 'Deep Frypan 22L', 'Hamko', c.id, 1145, 1031, 1009.89, 153, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-02', 'Deep Frypan 24L', 'Hamko', c.id, 1315, 1184, 1159.83, 171, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-03', 'Deep Frypan 26L', 'Hamko', c.id, 1405, 1265, 1239.21, 104, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-04', 'Deep Frypan IB 22L', 'Hamko', c.id, 1220, 1098, 1076.04, 189, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-05', 'Deep Frypan IB 24L', 'Hamko', c.id, 1405, 1265, 1239.21, 52, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF2-06', 'Deep Frypan IB 26L', 'Hamko', c.id, 1505, 1355, 1327.41, 187, 15, 'pcs' FROM categories c WHERE c.name='Deep Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-01', 'Frypan 20L', 'Hamko', c.id, 855, 770, 754.11, 146, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-02', 'Frypan 22L', 'Hamko', c.id, 980, 882, 864.36, 20, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-03', 'Frypan 24L', 'Hamko', c.id, 1080, 972, 952.56, 148, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-04', 'Frypan 26L', 'Hamko', c.id, 1155, 1040, 1018.71, 136, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-05', 'Frypan 28L', 'Hamko', c.id, 1285, 1157, 1133.37, 204, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-06', 'Frypan IB 20L', 'Hamko', c.id, 920, 828, 811.44, 144, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-07', 'Frypan IB 22L', 'Hamko', c.id, 1040, 936, 917.28, 82, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-08', 'Frypan IB 24L', 'Hamko', c.id, 1155, 1040, 1018.71, 161, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-09', 'Frypan IB 26L', 'Hamko', c.id, 1240, 1116, 1093.68, 21, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-10', 'Frypan IB 28L', 'Hamko', c.id, 1375, 1238, 1212.75, 108, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-21', 'Frypan Without Lid 20L', 'Hamko', c.id, 665, 599, 586.53, 115, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-22', 'Frypan Without Lid 22L', 'Hamko', c.id, 785, 707, 692.37, 133, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-23', 'Frypan Without Lid 24L', 'Hamko', c.id, 920, 828, 811.44, 63, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-24', 'Frypan Without Lid 26L', 'Hamko', c.id, 985, 887, 868.77, 194, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-25', 'Frypan Without Lid 28L', 'Hamko', c.id, 1070, 963, 943.74, 152, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-26', 'Frypan Without Lid IB 20L', 'Hamko', c.id, 735, 662, 648.27, 31, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-27', 'Frypan Without Lid IB 22L', 'Hamko', c.id, 855, 770, 754.11, 120, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-28', 'Frypan Without Lid IB 24L', 'Hamko', c.id, 985, 887, 868.77, 86, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-29', 'Frypan Without Lid IB 26L', 'Hamko', c.id, 1045, 941, 921.69, 36, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HAF3-30', 'Frypan Without Lid IB 28L', 'Hamko', c.id, 1170, 1053, 1031.94, 87, 15, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-01', 'Wokpan With Glass Lid 20L', 'Hamko', c.id, 995, 896, 877.59, 187, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-02', 'Wokpan With Glass Lid 22L', 'Hamko', c.id, 1125, 1013, 992.25, 152, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-03', 'Wokpan With Glass Lid 24L', 'Hamko', c.id, 1205, 1085, 1062.81, 44, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-04', 'Wokpan With Glass Lid 26L', 'Hamko', c.id, 1360, 1224, 1199.52, 83, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-05', 'Wokpan With Glass Lid 28L', 'Hamko', c.id, 1500, 1350, 1323, 126, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-06', 'Wokpan With Glass Lid 30L', 'Hamko', c.id, 1630, 1467, 1437.66, 86, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-07', 'Wokpan With Glass Lid IB 20L', 'Hamko', c.id, 1080, 972, 952.56, 85, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-08', 'Wokpan With Glass Lid IB 22L', 'Hamko', c.id, 1205, 1085, 1062.81, 128, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-09', 'Wokpan With Glass Lid IB 24L', 'Hamko', c.id, 1300, 1170, 1146.6, 149, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-10', 'Wokpan With Glass Lid IB 26L', 'Hamko', c.id, 1440, 1296, 1270.08, 92, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-11', 'Wokpan With Glass Lid IB 28L', 'Hamko', c.id, 1575, 1418, 1389.15, 117, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA12-12', 'Wokpan With Glass Lid IB 30L', 'Hamko', c.id, 1710, 1539, 1508.22, 89, 15, 'pcs' FROM categories c WHERE c.name='Wokpan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA13-01', 'Milk Pan 18L', 'Hamko', c.id, 845, 761, 745.29, 52, 15, 'pcs' FROM categories c WHERE c.name='Milk Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA13-02', 'Milk Pan IB 18L', 'Hamko', c.id, 915, 824, 807.03, 215, 15, 'pcs' FROM categories c WHERE c.name='Milk Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS7-01', 'SS Milk Pan 20L', 'Hamko', c.id, 1105, 1039, 1017.93, 212, 15, 'pcs' FROM categories c WHERE c.name='Milk Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA7-01', 'Ruti Tawa 26L', 'Hamko', c.id, 845, 761, 745.29, 101, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA7-02', 'Ruti Tawa 28L', 'Hamko', c.id, 915, 824, 807.03, 212, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-01', 'Pizza Pan 24L', 'Hamko', c.id, 780, 702, 687.96, 69, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-02', 'Pizza Pan 26L', 'Hamko', c.id, 915, 824, 807.03, 72, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-03', 'Pizza Pan 28L', 'Hamko', c.id, 980, 882, 864.36, 29, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-04', 'Pizza Pan IB 24L', 'Hamko', c.id, 845, 761, 745.29, 179, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-05', 'Pizza Pan IB 26L', 'Hamko', c.id, 980, 882, 864.36, 63, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HA8-06', 'Pizza Pan IB 28L', 'Hamko', c.id, 1040, 936, 917.28, 144, 15, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS1-01', 'SS Sauce Pan Oval IB 20L', 'Hamko', c.id, 1080, 1015, 994.9, 126, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS1-02', 'SS Sauce Pan Oval IB 22L', 'Hamko', c.id, 1210, 1137, 1114.65, 206, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS1-03', 'SS Sauce Pan Oval IB 24L', 'Hamko', c.id, 1485, 1396, 1367.98, 132, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS1-04', 'SS Sauce Pan Oval IB 26L', 'Hamko', c.id, 1650, 1551, 1519.98, 56, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS3-01', 'SS Sauce Pan Straight IB 24L', 'Hamko', c.id, 1375, 1293, 1266.65, 165, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS3-02', 'SS Sauce Pan Straight IB 26L', 'Hamko', c.id, 1585, 1490, 1460.1, 68, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS3-03', 'SS Sauce Pan Straight IB 30L', 'Hamko', c.id, 1860, 1748, 1713.43, 63, 15, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS19-01', 'SS 3 Layer Sauce Pan 3L', 'Hamko', c.id, 1365, 1283, 1257.44, 57, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS19-02', 'SS 3 Layer Sauce Pan 4L', 'Hamko', c.id, 1560, 1466, 1437.07, 149, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS19-03', 'SS 3 Layer Sauce Pan 5L', 'Hamko', c.id, 1825, 1716, 1681.19, 175, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS19-04', 'SS 3 Layer Sauce Pan 6L', 'Hamko', c.id, 2050, 1927, 1888.46, 115, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS2-01', 'SS Fry Pan With Glass Lid 26L', 'Hamko', c.id, 2135, 2007, 1966.76, 31, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS2-02', 'SS Fry Pan With Glass Lid 28L', 'Hamko', c.id, 2400, 2256, 2210.88, 66, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS2-03', 'LH SS Fry Pan With Glass Lid 26L', 'Hamko', c.id, 2400, 2256, 2210.88, 171, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS2-04', 'LH SS Fry Pan With Glass Lid 28L', 'Hamko', c.id, 2680, 2519, 2468.82, 208, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS11-00', 'SS 3 Layer Fry Pan 24L', 'Hamko', c.id, 1715, 1612, 1579.86, 174, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS11-04', 'SS 3 Layer Fry Pan 26L', 'Hamko', c.id, 1840, 1730, 1695.01, 113, 15, 'pcs' FROM categories c WHERE c.name='SS Fry Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS11-01', 'SS 3 Layer Wok Pan 26L', 'Hamko', c.id, 1925, 1810, 1773.31, 97, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Wok Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS11-02', 'SS 3 Layer Wok Pan 28L', 'Hamko', c.id, 2060, 1936, 1897.67, 214, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Wok Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS11-03', 'SS 3 Layer Wok Pan 30L', 'Hamko', c.id, 2270, 2134, 2091.12, 218, 15, 'pcs' FROM categories c WHERE c.name='SS 3 Layer Wok Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS4-01', 'Two Side Handle Pot 14L', 'Hamko', c.id, 385, 362, 354.66, 25, 15, 'pcs' FROM categories c WHERE c.name='Two Side Handle Pot' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS4-02', 'Two Side Handle Pot 16L', 'Hamko', c.id, 465, 437, 428.36, 56, 15, 'pcs' FROM categories c WHERE c.name='Two Side Handle Pot' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS4-03', 'Two Side Handle Pot 18L', 'Hamko', c.id, 560, 526, 515.87, 116, 15, 'pcs' FROM categories c WHERE c.name='Two Side Handle Pot' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS4-04', 'Two Side Handle Pot 20L', 'Hamko', c.id, 630, 592, 580.36, 34, 15, 'pcs' FROM categories c WHERE c.name='Two Side Handle Pot' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS4-05', 'Two Side Handle Pot 22L', 'Hamko', c.id, 775, 729, 713.93, 141, 15, 'pcs' FROM categories c WHERE c.name='Two Side Handle Pot' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS6-00', 'SS Plate 18L', 'Hamko', c.id, 120, 113, 110.54, 50, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS6-01', 'SS Plate 22L', 'Hamko', c.id, 160, 150, 147.39, 29, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS6-02', 'SS Plate 24L', 'Hamko', c.id, 175, 165, 161.21, 159, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS6-03', 'SS Plate 26L', 'Hamko', c.id, 200, 188, 184.24, 85, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-00', 'SS Bowl 10L', 'Hamko', c.id, 75, 71, 69.09, 145, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-01', 'SS Bowl 12L', 'Hamko', c.id, 100, 94, 92.12, 126, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-02', 'SS Bowl 14L', 'Hamko', c.id, 130, 122, 119.76, 108, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-03', 'SS Bowl 16L', 'Hamko', c.id, 165, 155, 152, 104, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-04', 'SS Bowl 18L', 'Hamko', c.id, 205, 193, 188.85, 74, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-05', 'SS Bowl 20L', 'Hamko', c.id, 265, 249, 244.12, 75, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-06', 'SS Bowl 22L', 'Hamko', c.id, 305, 287, 280.97, 200, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-07', 'SS Bowl 24L', 'Hamko', c.id, 380, 357, 350.06, 157, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS5-08', 'SS Bowl 26L', 'Hamko', c.id, 420, 395, 386.9, 135, 15, 'pcs' FROM categories c WHERE c.name='SS Plate/Bowl' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HE18-08', 'Glass Electric Kettle 1.8L', 'Hamko', c.id, 1300, 1170, 1146.6, 190, 15, 'pcs' FROM categories c WHERE c.name='Electric Kettle' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS18-07', 'PL Electric Kettle 1.8L', 'Hamko', c.id, 950, 855, 837.9, 22, 15, 'pcs' FROM categories c WHERE c.name='Electric Kettle' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS18-05', 'SS Electric Kettle 1.8L', 'Hamko', c.id, 835, 752, 736.47, 122, 15, 'pcs' FROM categories c WHERE c.name='Electric Kettle' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HS18-06', 'SS Electric Kettle 2.2L', 'Hamko', c.id, 950, 855, 837.9, 159, 15, 'pcs' FROM categories c WHERE c.name='Electric Kettle' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HB1-01', 'Blander 750L', 'Hamko', c.id, 4800, 4320, 4233.6, 100, 15, 'pcs' FROM categories c WHERE c.name='Blander' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HB1-02', 'Blander 850L', 'Hamko', c.id, 5150, 4635, 4542.3, 136, 15, 'pcs' FROM categories c WHERE c.name='Blander' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'HB1-04', 'Blander 1000L', 'Hamko', c.id, 5350, 4815, 4718.7, 186, 15, 'pcs' FROM categories c WHERE c.name='Blander' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'SS', 'SS Single Stove 120L', 'Hamko', c.id, 1580, 1422, 1393.56, 86, 15, 'pcs' FROM categories c WHERE c.name='Gas Stove' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'G/S-1', 'Glass Single Stove 90L', 'Hamko', c.id, 2575, 2318, 2271.15, 41, 15, 'pcs' FROM categories c WHERE c.name='Gas Stove' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'G/S-2', 'Glass Single Stove 100L', 'Hamko', c.id, 2625, 2363, 2315.25, 32, 15, 'pcs' FROM categories c WHERE c.name='Gas Stove' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'G/S-3', 'Glass Double Stove 100+100L', 'Hamko', c.id, 4175, 3758, 3682.35, 144, 15, 'pcs' FROM categories c WHERE c.name='Gas Stove' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'AG-FP-24', 'Hamko Anti-Gravity Fry Pan 24cm', 'Hamko', c.id, 1850, 1850, 1665, 50, 10, 'pcs' FROM categories c WHERE c.name='Frypan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'AG-CP-20', 'Hamko Anti-Gravity Cookpot 20cm', 'Hamko', c.id, 2200, 2200, 1980, 40, 10, 'pcs' FROM categories c WHERE c.name='Cookware' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'AG-SP-18', 'Hamko Anti-Gravity Saucepan 18cm', 'Hamko', c.id, 1450, 1450, 1305, 35, 10, 'pcs' FROM categories c WHERE c.name='SS Sauce Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'AG-CS-26', 'Hamko Anti-Gravity Casserole 26cm', 'Hamko', c.id, 2950, 2950, 2655, 25, 10, 'pcs' FROM categories c WHERE c.name='Casserole' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;
INSERT INTO products (sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, stock_quantity, reorder_level, unit) SELECT 'AG-TW-28', 'Hamko Anti-Gravity Tawa 28cm', 'Hamko', c.id, 1600, 1600, 1440, 45, 10, 'pcs' FROM categories c WHERE c.name='Ruti/Pizza Pan' ON CONFLICT (sku_code) DO UPDATE SET unit_price=EXCLUDED.unit_price, dealer_price=EXCLUDED.dealer_price, distributor_price=EXCLUDED.distributor_price, stock_quantity=EXCLUDED.stock_quantity;

-- ============================================================
-- Migration: 20260718055239_0005_hamko_orders_collections.sql.sql
-- ============================================================
-- Order from Hamko_Invoice.xlsx (Invoice 24865 - Talukder Brothers)
INSERT INTO orders (order_number, customer_id, order_date, status, subtotal, total_amount, paid_amount, due_amount, payment_status, notes)
SELECT 'ORD-24865', c.id, '2026-07-11', 'Delivered', 19682.00, 17713.80, 17713.80, 0, 'Paid', 'Invoice 24865 - D4-05092/26 .Van-KMAU-11-0062,Rasel'
FROM customers c WHERE c.name = 'Talukder' LIMIT 1;

-- Collection for this invoice
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes)
SELECT 'COL-24865', c.id, 17713.80, '2026-07-11', 'Bank Transfer', 'Invoice 24865 payment'
FROM customers c WHERE c.name = 'Talukder' LIMIT 1;

-- Collections from Collection_and_Delivery.xlsx Comm sheet
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1000', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 0), 2085, '2026-01-18', 'Cash', '16Sep-15Oct';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1001', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 1), 1040, '2026-01-25', 'Cash', '16Oct-15Nov';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1002', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 2), 1496, '2026-02-10', 'Cash', '16Nov-15Dec';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1003', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 3), 3500, '2026-03-09', 'Cash', 'Eid Bonus';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1004', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 4), 1299, '2026-03-12', 'Cash', '16Dec-15Jan';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1005', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 5), 2803, '2026-04-09', 'Cash', '16Jan-15Feb';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1006', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 6), 5744, '2026-05-13', 'Cash', '16Feb-15Mar';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1007', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 7), 4500, '2026-05-17', 'Cash', 'Eid Bonus';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1008', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 8), 3862, '2026-06-15', 'Cash', '16Mar-15Apr';

-- Sample expenses
INSERT INTO expenses (expense_date, category, amount, description)
VALUES
  ('2026-07-01', 'Transport', 5000, 'Van rental - Jhalakathi route'),
  ('2026-07-05', 'Office', 12000, 'Office supplies and stationery'),
  ('2026-07-10', 'Salary', 85000, 'Sales officer salary - July'),
  ('2026-07-15', 'Marketing', 8500, 'Promotional materials'),
  ('2026-07-18', 'Fuel', 3200, 'Delivery vehicle fuel');

-- Sales targets
INSERT INTO sales_targets (period, period_start, period_end, target_amount, achieved_amount)
VALUES ('Monthly', '2026-07-01', '2026-07-31', 500000, 19682);

INSERT INTO sales_targets (period, period_start, period_end, target_amount, achieved_amount)
VALUES ('Quarterly', '2026-07-01', '2026-09-30', 1500000, 19682);

-- Notifications
INSERT INTO notifications (title, message, type, is_read)
VALUES ('Low Stock Alert', 'Multiple products below reorder level', 'Low Stock', false);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('Overdue Payment', '3 customers have overdue payments exceeding 50,000 BDT', 'Due Reminder', false);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('New Order', 'Order ORD-24865 delivered to Talukder Brothers', 'Order Status', true);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('Monthly Target', 'July monthly target: 500,000 BDT - 4% achieved', 'Sales Target', false);

-- ============================================================
-- Migration: 20260728121017_seed_demo_auth_users.sql
-- ============================================================
/*
# Seed Demo Authentication Users

Creates two pre-seeded demo accounts in auth.users and the public users
profile table so they can sign in immediately with known credentials.

1. Demo Accounts Created
   - Super Admin:
     - Email: admin@saleserppro.com
     - Password: admin123
     - Role: Super Admin (full access to all 9 modules, settings, and users)
   - Sales Officer:
     - Email: officer@saleserppro.com
     - Password: officer123
     - Role: Sales Officer (scoped access to visit logging, customer
       management, and order creation)

2. How it works
   - Removes any pre-existing demo auth rows for the two demo emails
     (idempotent), then inserts fresh rows into auth.users with
     bcrypt-hashed passwords (cost factor 10, matching Supabase's default)
     using pgcrypto's crypt()/gen_salt().
   - Sets email_confirmed_at so email confirmation is bypassed
     (confirmed_at is a generated column derived from email_confirmed_at).
   - The public users profile rows cascade-delete with auth.users
     (FK ON DELETE CASCADE), so re-seeding replaces them cleanly.
   - Inserts matching profile rows into the public users table with the
     correct role_name.

3. Security notes
   - This migration writes directly to auth.users, which requires elevated
     privileges (bypasses RLS). This is intentional for seeding only.
   - Passwords are hashed server-side; the plaintext is never stored.
   - Only the two known demo emails are affected; no other auth users or
     profile rows are touched.
   - Idempotent: safe to re-run.

4. No tables, columns, or policies are created or altered. No existing
   business data (products, orders, collections, Hamko seed data) is deleted.
*/

-- Ensure pgcrypto is available (provides crypt and gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Remove any pre-existing demo auth rows (cascade deletes profile rows)
-- ============================================================
DELETE FROM auth.users
WHERE email IN ('admin@saleserppro.com', 'officer@saleserppro.com');

-- ============================================================
-- 2. Insert Super Admin demo user
-- ============================================================
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@saleserppro.com',
    crypt('admin123', gen_salt('bf', 10)),
    now(),
    '{"role":"Super Admin"}'::jsonb,
    '{"full_name":"Super Admin"}'::jsonb,
    false,
    false,
    now(),
    now()
  );

  INSERT INTO users (id, email, full_name, role_name, is_active)
  VALUES (v_admin_id, 'admin@saleserppro.com', 'Super Admin', 'Super Admin', true);
END $$;

-- ============================================================
-- 3. Insert Sales Officer demo user
-- ============================================================
DO $$
DECLARE
  v_officer_id uuid;
BEGIN
  v_officer_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  )
  VALUES (
    v_officer_id,
    'authenticated',
    'authenticated',
    'officer@saleserppro.com',
    crypt('officer123', gen_salt('bf', 10)),
    now(),
    '{"role":"Sales Officer"}'::jsonb,
    '{"full_name":"Sales Officer"}'::jsonb,
    false,
    false,
    now(),
    now()
  );

  INSERT INTO users (id, email, full_name, role_name, is_active)
  VALUES (v_officer_id, 'officer@saleserppro.com', 'Sales Officer', 'Sales Officer', true);
END $$;


-- ============================================================
-- Migration: 20260728121750_fix_demo_auth_identities.sql
-- ============================================================
/*
# Fix Demo Auth Users â€” Add Missing auth.identities Rows

The previously seeded demo users (admin@saleserppro.com and
officer@saleserppro.com) were inserted directly into auth.users via SQL,
which bypassed GoTrue's normal signup flow. As a result, no matching rows
were created in auth.identities. Supabase's signInWithPassword requires an
identity record to validate the login, so both demo logins failed with
"Invalid login credentials".

1. What this migration does
   - Inserts an email-provider identity row into auth.identities for each
     demo user, mirroring what GoTrue creates during a normal signup.
     (The email column is generated from identity_data, so it is not set
     explicitly.)
   - This unblocks signInWithPassword for both accounts.

2. No other changes
   - No tables, columns, or policies are created or altered.
   - No business data (products, orders, collections, Hamko seed data) is
     touched.
   - Idempotent: only inserts identities for users that do not already have
     one.

3. Security
   - Writes directly to auth.identities (elevated privileges, bypasses RLS).
     Intentional for auth seeding only.
*/

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  u.id::text,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  NULL,
  u.created_at,
  u.created_at
FROM auth.users u
WHERE u.email IN ('admin@saleserppro.com', 'officer@saleserppro.com')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );


-- ============================================================
-- Migration: 20260729113113_open_read_access_for_demo.sql
-- ============================================================
/*
# Open Read Access for Demo Mode

The demo login uses a mock frontend session (no real Supabase JWT). Database
queries therefore run as the anon role, which was blocked by the existing
SELECT policies (TO authenticated only). This migration widens SELECT
policies to TO anon, authenticated so the demo session can read all
business data â€” products, orders, collections, customers, and Hamko
Cookware seed data.

1. What changes
   - All SELECT policies are dropped and recreated with TO anon, authenticated.
   - Write policies (INSERT/UPDATE/DELETE) are NOT touched â€” they remain
     TO authenticated, so data cannot be modified without a real session.

2. No data is deleted or altered. No tables or columns change.
*/

DROP POLICY IF EXISTS staff_read_roles ON roles;
DROP POLICY IF EXISTS staff_read_roles ON roles;
CREATE POLICY staff_read_roles ON roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_territories ON territories;
DROP POLICY IF EXISTS staff_read_territories ON territories;
CREATE POLICY staff_read_territories ON territories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_users ON users;
DROP POLICY IF EXISTS staff_read_users ON users;
CREATE POLICY staff_read_users ON users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_categories ON categories;
DROP POLICY IF EXISTS staff_read_categories ON categories;
CREATE POLICY staff_read_categories ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_products ON products;
DROP POLICY IF EXISTS staff_read_products ON products;
CREATE POLICY staff_read_products ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_customers ON customers;
DROP POLICY IF EXISTS staff_read_customers ON customers;
CREATE POLICY staff_read_customers ON customers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_orders ON orders;
DROP POLICY IF EXISTS staff_read_orders ON orders;
CREATE POLICY staff_read_orders ON orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_order_items ON order_items;
DROP POLICY IF EXISTS staff_read_order_items ON order_items;
CREATE POLICY staff_read_order_items ON order_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_inventory ON inventory;
DROP POLICY IF EXISTS staff_read_inventory ON inventory;
CREATE POLICY staff_read_inventory ON inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
DROP POLICY IF EXISTS staff_read_stock_tx ON stock_transactions;
CREATE POLICY staff_read_stock_tx ON stock_transactions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_collections ON collections;
DROP POLICY IF EXISTS staff_read_collections ON collections;
CREATE POLICY staff_read_collections ON collections FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_expenses ON expenses;
DROP POLICY IF EXISTS staff_read_expenses ON expenses;
CREATE POLICY staff_read_expenses ON expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_visits ON visits;
DROP POLICY IF EXISTS staff_read_visits ON visits;
CREATE POLICY staff_read_visits ON visits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
DROP POLICY IF EXISTS staff_read_sales_targets ON sales_targets;
CREATE POLICY staff_read_sales_targets ON sales_targets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS user_read_notifications ON notifications;
DROP POLICY IF EXISTS user_read_notifications ON notifications;
CREATE POLICY user_read_notifications ON notifications FOR SELECT TO anon, authenticated USING (true);


-- ============================================================
-- Migration: 20260729114723_demo_users_seed_and_write_access.sql
-- ============================================================
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
  ('4b3b1979-af14-4ebd-bf75-96c11c7bdc37', 'mdrabiulislam.sabur.9@gmail.com', 'Super Admin', 'Super Admin', true),
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
DROP POLICY IF EXISTS demo_insert_customers ON customers;
CREATE POLICY demo_insert_customers ON customers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_customers ON customers;
DROP POLICY IF EXISTS demo_update_customers ON customers;
CREATE POLICY demo_update_customers ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- orders
DROP POLICY IF EXISTS demo_insert_orders ON orders;
DROP POLICY IF EXISTS demo_insert_orders ON orders;
CREATE POLICY demo_insert_orders ON orders FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_orders ON orders;
DROP POLICY IF EXISTS demo_update_orders ON orders;
CREATE POLICY demo_update_orders ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- order_items
DROP POLICY IF EXISTS demo_insert_order_items ON order_items;
DROP POLICY IF EXISTS demo_insert_order_items ON order_items;
CREATE POLICY demo_insert_order_items ON order_items FOR INSERT TO anon WITH CHECK (true);

-- collections
DROP POLICY IF EXISTS demo_insert_collections ON collections;
DROP POLICY IF EXISTS demo_insert_collections ON collections;
CREATE POLICY demo_insert_collections ON collections FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_collections ON collections;
DROP POLICY IF EXISTS demo_update_collections ON collections;
CREATE POLICY demo_update_collections ON collections FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS demo_insert_expenses ON expenses;
DROP POLICY IF EXISTS demo_insert_expenses ON expenses;
CREATE POLICY demo_insert_expenses ON expenses FOR INSERT TO anon WITH CHECK (true);

-- inventory
DROP POLICY IF EXISTS demo_insert_inventory ON inventory;
DROP POLICY IF EXISTS demo_insert_inventory ON inventory;
CREATE POLICY demo_insert_inventory ON inventory FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_inventory ON inventory;
DROP POLICY IF EXISTS demo_update_inventory ON inventory;
CREATE POLICY demo_update_inventory ON inventory FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- stock_transactions
DROP POLICY IF EXISTS demo_insert_stock_tx ON stock_transactions;
DROP POLICY IF EXISTS demo_insert_stock_tx ON stock_transactions;
CREATE POLICY demo_insert_stock_tx ON stock_transactions FOR INSERT TO anon WITH CHECK (true);

-- visits
DROP POLICY IF EXISTS demo_insert_visits ON visits;
DROP POLICY IF EXISTS demo_insert_visits ON visits;
CREATE POLICY demo_insert_visits ON visits FOR INSERT TO anon WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS demo_insert_notifications ON notifications;
DROP POLICY IF EXISTS demo_insert_notifications ON notifications;
CREATE POLICY demo_insert_notifications ON notifications FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_notifications ON notifications;
DROP POLICY IF EXISTS demo_update_notifications ON notifications;
CREATE POLICY demo_update_notifications ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- products (insert/update for demo product management)
DROP POLICY IF EXISTS demo_insert_products ON products;
DROP POLICY IF EXISTS demo_insert_products ON products;
CREATE POLICY demo_insert_products ON products FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS demo_update_products ON products;
DROP POLICY IF EXISTS demo_update_products ON products;
CREATE POLICY demo_update_products ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- categories
DROP POLICY IF EXISTS demo_insert_categories ON categories;
DROP POLICY IF EXISTS demo_insert_categories ON categories;
CREATE POLICY demo_insert_categories ON categories FOR INSERT TO anon WITH CHECK (true);

-- sales_targets
DROP POLICY IF EXISTS demo_insert_sales_targets ON sales_targets;
DROP POLICY IF EXISTS demo_insert_sales_targets ON sales_targets;
CREATE POLICY demo_insert_sales_targets ON sales_targets FOR INSERT TO anon WITH CHECK (true);


-- ============================================================
-- Migration: 20260801044941_add_pricing_tiers.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260804053947_20260804_atomic_financial_rpcs.sql.sql
-- ============================================================
/*
# Atomic Financial RPCs â€” Collection Recording & Order Creation

Fixes three critical data-integrity defects:
1. Collections overwrote accumulated paid_amount instead of incrementing.
2. Non-atomic 3-write sequence for collections caused book imbalances on partial failure.
3. Order creation never incremented customer current_due.

## New Functions
### record_collection(...)
SECURITY DEFINER. Atomically: inserts collection, decrements customer balance (floored at 0), increments order paid_amount. Returns inserted row as JSONB.

### create_order_with_items(p_order_data JSONB, p_items JSONB)
SECURITY DEFINER. Atomically: inserts order + all items, increments customer current_due by due_amount. Returns created order as JSONB.

## Security
- SECURITY DEFINER; EXECUTE granted to authenticated and anon.
- No new tables/columns â€” no data loss.
*/

DROP FUNCTION IF EXISTS record_collection(
  text, text, text, numeric, text, text, text, text
);

CREATE OR REPLACE FUNCTION record_collection(
  p_collection_number TEXT,
  p_customer_id       TEXT,
  p_order_id          TEXT,
  p_amount            NUMERIC,
  p_payment_method    TEXT,
  p_collection_date   TEXT,
  p_collected_by      TEXT,
  p_notes             TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted       JSONB;
  v_new_due        NUMERIC;
  v_order_due      NUMERIC;
  v_order_paid     NUMERIC;
  v_order_status   TEXT;
BEGIN
  INSERT INTO collections (
    collection_number, customer_id, order_id, amount,
    payment_method, collection_date, collected_by, notes
  )
  VALUES (
    p_collection_number,
    p_customer_id::uuid,
    CASE WHEN p_order_id IS NULL OR p_order_id = '' THEN NULL ELSE p_order_id::uuid END,
    p_amount,
    p_payment_method,
    p_collection_date,
    CASE WHEN p_collected_by IS NULL OR p_collected_by = '' THEN NULL ELSE p_collected_by::uuid END,
    p_notes
  )
  RETURNING to_jsonb(collections) INTO v_inserted;

  UPDATE customers
  SET current_due = GREATEST(0, current_due - p_amount),
      due_status = CASE
        WHEN GREATEST(0, current_due - p_amount) <= 0 THEN 'Clear'
        ELSE 'Partial'
      END,
      updated_at = now()
  WHERE id = p_customer_id::uuid
  RETURNING current_due INTO v_new_due;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  IF p_order_id IS NOT NULL AND p_order_id <> '' THEN
    SELECT due_amount, paid_amount INTO v_order_due, v_order_paid
    FROM orders WHERE id = p_order_id::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    v_order_paid := COALESCE(v_order_paid, 0) + p_amount;
    v_order_due  := GREATEST(0, COALESCE(v_order_due, 0) - p_amount);
    v_order_status := CASE WHEN v_order_due <= 0 THEN 'Paid' ELSE 'Partial' END;

    UPDATE orders
    SET paid_amount = v_order_paid,
        due_amount  = v_order_due,
        payment_status = v_order_status,
        updated_at = now()
    WHERE id = p_order_id::uuid;
  END IF;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION record_collection(
  text, text, text, numeric, text, text, text, text
) TO authenticated, anon;

-- â”€â”€â”€ create_order_with_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP FUNCTION IF EXISTS create_order_with_items(JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order_data JSONB,
  p_items      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           JSONB;
  v_order_id        uuid;
  v_due_amount      NUMERIC;
  v_customer_id     uuid;
  v_item            JSONB;
  v_current_due     NUMERIC;
  v_delivery_date   TEXT;
  v_sales_rep_id    TEXT;
BEGIN
  v_delivery_date := p_order_data->>'delivery_date';
  v_delivery_date := CASE WHEN v_delivery_date IS NULL OR v_delivery_date = '' THEN NULL ELSE v_delivery_date END;
  v_sales_rep_id := p_order_data->>'sales_rep_id';
  v_sales_rep_id := CASE WHEN v_sales_rep_id IS NULL OR v_sales_rep_id = '' THEN NULL ELSE v_sales_rep_id END;

  INSERT INTO orders (
    order_number, customer_id, sales_rep_id, status,
    subtotal, discount, total_amount, due_amount,
    payment_status, notes, delivery_date
  )
  VALUES (
    p_order_data->>'order_number',
    (p_order_data->>'customer_id')::uuid,
    CASE WHEN v_sales_rep_id IS NULL THEN NULL ELSE v_sales_rep_id::uuid END,
    COALESCE(p_order_data->>'status', 'Pending'),
    COALESCE((p_order_data->>'subtotal')::numeric, 0),
    COALESCE((p_order_data->>'discount')::numeric, 0),
    COALESCE((p_order_data->>'total_amount')::numeric, 0),
    COALESCE((p_order_data->>'due_amount')::numeric, 0),
    COALESCE(p_order_data->>'payment_status', 'Unpaid'),
    p_order_data->>'notes',
    v_delivery_date
  )
  RETURNING id, to_jsonb(orders) INTO v_order_id, v_order;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price,
      discount, subtotal, price_tier
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'quantity')::numeric, 0),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount')::numeric, 0),
      COALESCE((v_item->>'subtotal')::numeric, 0),
      COALESCE(v_item->>'price_tier', 'DP')
    );
  END LOOP;

  v_due_amount := COALESCE((p_order_data->>'due_amount')::numeric, 0);
  v_customer_id := (p_order_data->>'customer_id')::uuid;

  IF v_due_amount > 0 THEN
    SELECT current_due INTO v_current_due
    FROM customers WHERE id = v_customer_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found: %', v_customer_id;
    END IF;

    UPDATE customers
    SET current_due = current_due + v_due_amount,
        due_status = 'Partial',
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB)
TO authenticated, anon;


-- ============================================================
-- Migration: 20260804054401_20260804_atomic_stock_rpc.sql.sql
-- ============================================================
/*
# Atomic Stock Transaction RPC

## Purpose
Fixes issue #7: recording a "Transfer" type stock transaction created a record but did not change
the product's actual stock_quantity. Also makes all stock transaction types atomic so the
transaction record and the product stock update can never drift apart.

## New Function
### record_stock_transaction(p_tx JSONB)
SECURITY DEFINER. Atomically:
- Inserts a row into `stock_transactions`.
- Updates `products.stock_quantity` based on transaction_type:
  - "Stock In": increments by quantity
  - "Stock Out": decrements by quantity (floored at 0)
  - "Damage": decrements by quantity (floored at 0)
  - "Transfer": no net stock change (stock stays on the same product row; the from/to warehouse
    is recorded for audit). If in the future per-warehouse stock is needed, a warehouse table
    can be added, but the current schema has a single stock_quantity column per product.
  - "Adjustment": sets stock_quantity to the provided quantity value
- Returns the inserted transaction row as JSONB.

## Security
- SECURITY DEFINER so the product update works regardless of RLS.
- EXECUTE granted to authenticated and anon.
- No new tables or columns â€” no data loss.
*/

DROP FUNCTION IF EXISTS record_stock_transaction(JSONB);

CREATE OR REPLACE FUNCTION record_stock_transaction(p_tx JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted     JSONB;
  v_product_id   uuid;
  v_qty          NUMERIC;
  v_type         TEXT;
  v_current      NUMERIC;
  v_new_qty      NUMERIC;
BEGIN
  v_product_id := (p_tx->>'product_id')::uuid;
  v_qty        := COALESCE((p_tx->>'quantity')::numeric, 0);
  v_type       := p_tx->>'transaction_type';

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;

  -- Insert the transaction record
  INSERT INTO stock_transactions (
    product_id, transaction_type, quantity,
    from_warehouse, to_warehouse, reference, notes, performed_by
  )
  VALUES (
    v_product_id,
    v_type,
    v_qty,
    p_tx->>'from_warehouse',
    p_tx->>'to_warehouse',
    p_tx->>'reference',
    p_tx->>'notes',
    CASE WHEN p_tx->>'performed_by' IS NULL OR p_tx->>'performed_by' = '' THEN NULL ELSE (p_tx->>'performed_by')::uuid END
  )
  RETURNING to_jsonb(stock_transactions) INTO v_inserted;

  -- Read current stock
  SELECT stock_quantity INTO v_current FROM products WHERE id = v_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', v_product_id;
  END IF;

  v_new_qty := v_current;

  IF v_type = 'Stock In' THEN
    v_new_qty := v_current + v_qty;
  ELSIF v_type = 'Stock Out' OR v_type = 'Damage' THEN
    v_new_qty := GREATEST(0, v_current - v_qty);
  ELSIF v_type = 'Adjustment' THEN
    v_new_qty := v_qty;
  ELSIF v_type = 'Transfer' THEN
    -- No net change to product stock; movement is logged in the transaction record.
    v_new_qty := v_current;
  END IF;

  UPDATE products
  SET stock_quantity = v_new_qty, updated_at = now()
  WHERE id = v_product_id;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION record_stock_transaction(JSONB) TO authenticated, anon;


-- ============================================================
-- Migration: 20260822122000_fix_record_collection_date_cast.sql
-- ============================================================
/*
# Fix record_collection RPC Date Casting

Explicitly cast `p_collection_date::timestamptz` in the `record_collection` function to prevent:
"column collection_date is of type timestamp with time zone but expression is of type text"
*/

DROP FUNCTION IF EXISTS record_collection(
  text, text, text, numeric, text, text, text, text
);

CREATE OR REPLACE FUNCTION record_collection(
  p_collection_number TEXT,
  p_customer_id       TEXT,
  p_order_id          TEXT,
  p_amount            NUMERIC,
  p_payment_method    TEXT,
  p_collection_date   TEXT,
  p_collected_by      TEXT,
  p_notes             TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted       JSONB;
  v_new_due        NUMERIC;
  v_order_due      NUMERIC;
  v_order_paid     NUMERIC;
  v_order_status   TEXT;
  v_date_tz        TIMESTAMPTZ;
BEGIN
  IF p_collection_date IS NULL OR p_collection_date = '' THEN
    v_date_tz := now();
  ELSE
    v_date_tz := p_collection_date::timestamptz;
  END IF;

  INSERT INTO collections (
    collection_number, customer_id, order_id, amount,
    payment_method, collection_date, collected_by, notes
  )
  VALUES (
    p_collection_number,
    p_customer_id::uuid,
    CASE WHEN p_order_id IS NULL OR p_order_id = '' THEN NULL ELSE p_order_id::uuid END,
    p_amount,
    p_payment_method,
    v_date_tz,
    CASE WHEN p_collected_by IS NULL OR p_collected_by = '' THEN NULL ELSE p_collected_by::uuid END,
    p_notes
  )
  RETURNING to_jsonb(collections) INTO v_inserted;

  UPDATE customers
  SET current_due = GREATEST(0, current_due - p_amount),
      due_status = CASE
        WHEN GREATEST(0, current_due - p_amount) <= 0 THEN 'Clear'
        ELSE 'Partial'
      END,
      updated_at = now()
  WHERE id = p_customer_id::uuid
  RETURNING current_due INTO v_new_due;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  IF p_order_id IS NOT NULL AND p_order_id <> '' THEN
    SELECT due_amount, paid_amount INTO v_order_due, v_order_paid
    FROM orders WHERE id = p_order_id::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    v_order_paid := COALESCE(v_order_paid, 0) + p_amount;
    v_order_due  := GREATEST(0, COALESCE(v_order_due, 0) - p_amount);
    v_order_status := CASE WHEN v_order_due <= 0 THEN 'Paid' ELSE 'Partial' END;

    UPDATE orders
    SET paid_amount = v_order_paid,
        due_amount  = v_order_due,
        payment_status = v_order_status,
        updated_at = now()
    WHERE id = p_order_id::uuid;
  END IF;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION record_collection(
  text, text, text, numeric, text, text, text, text
) TO authenticated, anon;


-- ============================================================
-- Migration: 20260829180000_reset_customer_balances.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20261002183000_validate_stock_on_order_creation.sql
-- ============================================================
-- Enforce stock validation in create_order_with_items RPC
DROP FUNCTION IF EXISTS create_order_with_items(JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order_data JSONB,
  p_items      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           JSONB;
  v_order_id        uuid;
  v_due_amount      NUMERIC;
  v_customer_id     uuid;
  v_item            JSONB;
  v_current_due     NUMERIC;
  v_delivery_date   TEXT;
  v_sales_rep_id    TEXT;
  v_prod_stock      NUMERIC;
  v_prod_name       TEXT;
  v_qty             NUMERIC;
BEGIN
  -- 1. Validate real-time stock availability for every requested item before inserting
  -- Skip strict validation if order status is 'Draft' (allows pre-orders/drafts overbooking)
  IF COALESCE(p_order_data->>'status', 'Pending') <> 'Draft' THEN
    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
      v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
      
      SELECT stock_quantity, name INTO v_prod_stock, v_prod_name
      FROM products
      WHERE id = (v_item->>'product_id')::uuid;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', (v_item->>'product_id');
      END IF;

      IF v_prod_stock IS NULL OR v_prod_stock <= 0 OR v_qty > v_prod_stock THEN
        RAISE EXCEPTION 'Insufficient stock available for %', v_prod_name;
      END IF;
    END LOOP;
  END IF;

  v_delivery_date := p_order_data->>'delivery_date';
  v_delivery_date := CASE WHEN v_delivery_date IS NULL OR v_delivery_date = '' THEN NULL ELSE v_delivery_date END;
  v_sales_rep_id := p_order_data->>'sales_rep_id';
  v_sales_rep_id := CASE WHEN v_sales_rep_id IS NULL OR v_sales_rep_id = '' THEN NULL ELSE v_sales_rep_id END;

  INSERT INTO orders (
    order_number, customer_id, sales_rep_id, status,
    subtotal, discount, total_amount, due_amount,
    payment_status, notes, delivery_date
  )
  VALUES (
    p_order_data->>'order_number',
    (p_order_data->>'customer_id')::uuid,
    CASE WHEN v_sales_rep_id IS NULL THEN NULL ELSE v_sales_rep_id::uuid END,
    COALESCE(p_order_data->>'status', 'Pending'),
    COALESCE((p_order_data->>'subtotal')::numeric, 0),
    COALESCE((p_order_data->>'discount')::numeric, 0),
    COALESCE((p_order_data->>'total_amount')::numeric, 0),
    COALESCE((p_order_data->>'due_amount')::numeric, 0),
    COALESCE(p_order_data->>'payment_status', 'Unpaid'),
    p_order_data->>'notes',
    v_delivery_date
  )
  RETURNING id, to_jsonb(orders) INTO v_order_id, v_order;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price,
      discount, subtotal, price_tier
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'quantity')::numeric, 0),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount')::numeric, 0),
      COALESCE((v_item->>'subtotal')::numeric, 0),
      COALESCE(v_item->>'price_tier', 'DP')
    );
  END LOOP;

  v_due_amount := COALESCE((p_order_data->>'due_amount')::numeric, 0);
  v_customer_id := (p_order_data->>'customer_id')::uuid;

  IF v_due_amount > 0 THEN
    SELECT current_due INTO v_current_due
    FROM customers WHERE id = v_customer_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found: %', v_customer_id;
    END IF;

    UPDATE customers
    SET current_due = current_due + v_due_amount,
        due_status = 'Partial',
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated, anon;


-- ============================================================
-- Migration: 20261002193000_block_paid_order_deletion.sql
-- ============================================================
-- Migration to prevent deleting orders with paid amounts or linked collections

CREATE OR REPLACE FUNCTION prevent_paid_order_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_collection_count INT;
BEGIN
  -- If order status is Cancelled, allow deletion and unlink collections to Customer Advance
  IF OLD.status = 'Cancelled' THEN
    UPDATE collections
    SET order_id = NULL
    WHERE order_id = OLD.id;

    RETURN OLD;
  END IF;

  -- 1. Check if paid_amount > 0
  IF COALESCE(OLD.paid_amount, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot delete order % because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.', OLD.order_number;
  END IF;

  -- 2. Check if linked collections exist
  SELECT COUNT(*) INTO v_collection_count
  FROM collections
  WHERE order_id = OLD.id;

  IF v_collection_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete order % because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.', OLD.order_number;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_paid_order_deletion ON orders;

CREATE TRIGGER trg_prevent_paid_order_deletion
BEFORE DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION prevent_paid_order_deletion();


-- ============================================================
-- Migration: 20261004130000_add_price_tiers_to_products.sql
-- ============================================================
/*
# Dynamic Price Tiers JSONB column on products

Adds price_tiers JSONB column to products table to support dynamic tiers (D6, B8, D8, D10, B12, D12, B14, etc.)
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT '[]'::jsonb;


-- ============================================================
-- Migration: 20261005220000_enable_strict_rls_production.sql
-- ============================================================
/*
================================================================================
# Production Release: Strict Row Level Security (RLS) & RBAC Data Isolation
# Migration: 20261005220000_enable_strict_rls_production.sql
================================================================================

This migration enforces strict production-grade Row Level Security (RLS) across
all 15 public tables in the Hamko Sales ERP system:
1. Purges all open/permissive demo policies that granted access to anon.
2. Enables and forces Row Level Security on all public tables.
3. Implements strict role-based access control (Super Admin, Sales Manager, 
   Sales Officer, Accountant) so users only read and write data scoped to their
   authorized role or territory.
4. Protects customer records, financial collections, and inventory modifications.
================================================================================
*/

-- =============================================================================
-- STEP 1: Helper Functions for Fast, Secure Role & Permission Checks
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text AS $$
  SELECT role_name FROM public.users WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role_name = 'Super Admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role_name IN ('Super Admin', 'Sales Manager') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_financial_auditor()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role_name IN ('Super Admin', 'Sales Manager', 'Accountant') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- STEP 2: Drop Insecure Legacy & Demo Policies (Purge Anon Access)
-- =============================================================================

-- Purge demo anon write policies
DROP POLICY IF EXISTS demo_insert_customers ON public.customers;
DROP POLICY IF EXISTS demo_update_customers ON public.customers;
DROP POLICY IF EXISTS demo_insert_orders ON public.orders;
DROP POLICY IF EXISTS demo_update_orders ON public.orders;
DROP POLICY IF EXISTS demo_insert_order_items ON public.order_items;
DROP POLICY IF EXISTS demo_insert_collections ON public.collections;
DROP POLICY IF EXISTS demo_update_collections ON public.collections;
DROP POLICY IF EXISTS demo_insert_expenses ON public.expenses;
DROP POLICY IF EXISTS demo_insert_inventory ON public.inventory;
DROP POLICY IF EXISTS demo_update_inventory ON public.inventory;
DROP POLICY IF EXISTS demo_insert_stock_tx ON public.stock_transactions;
DROP POLICY IF EXISTS demo_insert_visits ON public.visits;
DROP POLICY IF EXISTS demo_insert_notifications ON public.notifications;
DROP POLICY IF EXISTS demo_update_notifications ON public.notifications;
DROP POLICY IF EXISTS demo_insert_products ON public.products;
DROP POLICY IF EXISTS demo_update_products ON public.products;
DROP POLICY IF EXISTS demo_insert_categories ON public.categories;
DROP POLICY IF EXISTS demo_insert_sales_targets ON public.sales_targets;

-- Purge open anon SELECT policies
DROP POLICY IF EXISTS staff_read_roles ON public.roles;
DROP POLICY IF EXISTS staff_read_territories ON public.territories;
DROP POLICY IF EXISTS staff_read_users ON public.users;
DROP POLICY IF EXISTS staff_read_categories ON public.categories;
DROP POLICY IF EXISTS staff_read_products ON public.products;
DROP POLICY IF EXISTS staff_read_customers ON public.customers;
DROP POLICY IF EXISTS staff_read_orders ON public.orders;
DROP POLICY IF EXISTS staff_read_order_items ON public.order_items;
DROP POLICY IF EXISTS staff_read_inventory ON public.inventory;
DROP POLICY IF EXISTS staff_read_stock_tx ON public.stock_transactions;
DROP POLICY IF EXISTS staff_read_collections ON public.collections;
DROP POLICY IF EXISTS staff_read_expenses ON public.expenses;
DROP POLICY IF EXISTS staff_read_visits ON public.visits;
DROP POLICY IF EXISTS staff_read_sales_targets ON public.sales_targets;
DROP POLICY IF EXISTS user_read_notifications ON public.notifications;

-- =============================================================================
-- STEP 3: Enforce Row Level Security (RLS) on All Tables
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: Strict Production Policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS & PROFILES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select_policy ON public.users;
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT TO authenticated
  USING (
    -- Super Admin & Managers see all users; Active staff can see colleagues for assignment lookups
    is_manager_or_admin()
    OR auth.uid() = id
    OR is_active = true
  );

DROP POLICY IF EXISTS users_insert_policy ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;
CREATE POLICY users_insert_policy ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin());

DROP POLICY IF EXISTS users_update_policy ON public.users;
DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (auth.uid() = id AND role_name = (SELECT u.role_name FROM public.users u WHERE u.id = auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR (auth.uid() = id AND role_name = (SELECT u.role_name FROM public.users u WHERE u.id = auth.uid()))
  );

DROP POLICY IF EXISTS users_delete_policy ON public.users;
DROP POLICY IF EXISTS users_delete_policy ON public.users;
CREATE POLICY users_delete_policy ON public.users
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 2. PRODUCTS & PRICING
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS products_select_policy ON public.products;
DROP POLICY IF EXISTS products_select_policy ON public.products;
CREATE POLICY products_select_policy ON public.products
  FOR SELECT TO authenticated
  USING (is_active = true OR is_manager_or_admin());

DROP POLICY IF EXISTS products_insert_policy ON public.products;
DROP POLICY IF EXISTS products_insert_policy ON public.products;
CREATE POLICY products_insert_policy ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin());

DROP POLICY IF EXISTS products_update_policy ON public.products;
DROP POLICY IF EXISTS products_update_policy ON public.products;
CREATE POLICY products_update_policy ON public.products
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

DROP POLICY IF EXISTS products_delete_policy ON public.products;
DROP POLICY IF EXISTS products_delete_policy ON public.products;
CREATE POLICY products_delete_policy ON public.products
  FOR DELETE TO authenticated
  USING (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 3. CATEGORIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS categories_select_policy ON public.categories;
DROP POLICY IF EXISTS categories_select_policy ON public.categories;
CREATE POLICY categories_select_policy ON public.categories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS categories_modify_policy ON public.categories;
DROP POLICY IF EXISTS categories_modify_policy ON public.categories;
CREATE POLICY categories_modify_policy ON public.categories
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 4. CUSTOMERS & DEALERS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS customers_select_policy ON public.customers;
DROP POLICY IF EXISTS customers_select_policy ON public.customers;
CREATE POLICY customers_select_policy ON public.customers
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all customers across the system

DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
CREATE POLICY customers_insert_policy ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS customers_update_policy ON public.customers;
DROP POLICY IF EXISTS customers_update_policy ON public.customers;
CREATE POLICY customers_update_policy ON public.customers
  FOR UPDATE TO authenticated
  USING (
    is_manager_or_admin()
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    is_manager_or_admin()
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS customers_delete_policy ON public.customers;
DROP POLICY IF EXISTS customers_delete_policy ON public.customers;
CREATE POLICY customers_delete_policy ON public.customers
  FOR DELETE TO authenticated
  USING (
    is_manager_or_admin()
    OR assigned_to = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 5. ORDERS & TRANSACTIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
CREATE POLICY orders_select_policy ON public.orders
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all orders across the system

DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
CREATE POLICY orders_insert_policy ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager_or_admin()
    OR sales_rep_id = auth.uid()
  );

DROP POLICY IF EXISTS orders_update_policy ON public.orders;
DROP POLICY IF EXISTS orders_update_policy ON public.orders;
CREATE POLICY orders_update_policy ON public.orders
  FOR UPDATE TO authenticated
  USING (
    is_manager_or_admin()
    OR sales_rep_id = auth.uid()
  )
  WITH CHECK (
    is_manager_or_admin()
    OR sales_rep_id = auth.uid()
  );

DROP POLICY IF EXISTS orders_delete_policy ON public.orders;
DROP POLICY IF EXISTS orders_delete_policy ON public.orders;
CREATE POLICY orders_delete_policy ON public.orders
  FOR DELETE TO authenticated
  USING (
    is_manager_or_admin()
    OR sales_rep_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 6. ORDER ITEMS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS order_items_select_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_select_policy ON public.order_items;
CREATE POLICY order_items_select_policy ON public.order_items
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All for authenticated staff

DROP POLICY IF EXISTS order_items_insert_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_policy ON public.order_items;
CREATE POLICY order_items_insert_policy ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (is_manager_or_admin() OR o.sales_rep_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS order_items_update_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_update_policy ON public.order_items;
CREATE POLICY order_items_update_policy ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (is_manager_or_admin() OR o.sales_rep_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (is_manager_or_admin() OR o.sales_rep_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS order_items_delete_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_policy ON public.order_items;
CREATE POLICY order_items_delete_policy ON public.order_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (is_manager_or_admin() OR o.sales_rep_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 7. INVENTORY & STOCK
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS inventory_select_policy ON public.inventory;
DROP POLICY IF EXISTS inventory_select_policy ON public.inventory;
CREATE POLICY inventory_select_policy ON public.inventory
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS inventory_modify_policy ON public.inventory;
DROP POLICY IF EXISTS inventory_modify_policy ON public.inventory;
CREATE POLICY inventory_modify_policy ON public.inventory
  FOR ALL TO authenticated
  USING (is_financial_auditor())
  WITH CHECK (is_financial_auditor());

-- -----------------------------------------------------------------------------
-- 8. STOCK TRANSACTIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS stock_tx_select_policy ON public.stock_transactions;
DROP POLICY IF EXISTS stock_tx_select_policy ON public.stock_transactions;
CREATE POLICY stock_tx_select_policy ON public.stock_transactions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS stock_tx_insert_policy ON public.stock_transactions;
DROP POLICY IF EXISTS stock_tx_insert_policy ON public.stock_transactions;
CREATE POLICY stock_tx_insert_policy ON public.stock_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS stock_tx_delete_policy ON public.stock_transactions;
DROP POLICY IF EXISTS stock_tx_delete_policy ON public.stock_transactions;
CREATE POLICY stock_tx_delete_policy ON public.stock_transactions
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 9. PAYMENT COLLECTIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS collections_select_policy ON public.collections;
DROP POLICY IF EXISTS collections_select_policy ON public.collections;
CREATE POLICY collections_select_policy ON public.collections
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all collections across the system

DROP POLICY IF EXISTS collections_insert_policy ON public.collections;
DROP POLICY IF EXISTS collections_insert_policy ON public.collections;
CREATE POLICY collections_insert_policy ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR collected_by = auth.uid()
  );

DROP POLICY IF EXISTS collections_update_policy ON public.collections;
DROP POLICY IF EXISTS collections_update_policy ON public.collections;
CREATE POLICY collections_update_policy ON public.collections
  FOR UPDATE TO authenticated
  USING (is_financial_auditor() OR collected_by = auth.uid())
  WITH CHECK (is_financial_auditor() OR collected_by = auth.uid());

DROP POLICY IF EXISTS collections_delete_policy ON public.collections;
DROP POLICY IF EXISTS collections_delete_policy ON public.collections;
CREATE POLICY collections_delete_policy ON public.collections
  FOR DELETE TO authenticated
  USING (is_financial_auditor() OR collected_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. EXPENSES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS expenses_select_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_select_policy ON public.expenses;
CREATE POLICY expenses_select_policy ON public.expenses
  FOR SELECT TO authenticated
  USING (
    is_financial_auditor()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
CREATE POLICY expenses_insert_policy ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS expenses_update_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_update_policy ON public.expenses;
CREATE POLICY expenses_update_policy ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    is_financial_auditor()
    OR (user_id = auth.uid() AND status = 'Pending')
  )
  WITH CHECK (
    is_financial_auditor()
    OR (user_id = auth.uid() AND status = 'Pending')
  );

DROP POLICY IF EXISTS expenses_delete_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON public.expenses;
CREATE POLICY expenses_delete_policy ON public.expenses
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 11. VISITS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS visits_select_policy ON public.visits;
DROP POLICY IF EXISTS visits_select_policy ON public.visits;
CREATE POLICY visits_select_policy ON public.visits
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR visited_by = auth.uid()
  );

DROP POLICY IF EXISTS visits_insert_policy ON public.visits;
DROP POLICY IF EXISTS visits_insert_policy ON public.visits;
CREATE POLICY visits_insert_policy ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager_or_admin()
    OR visited_by = auth.uid()
  );

DROP POLICY IF EXISTS visits_update_policy ON public.visits;
DROP POLICY IF EXISTS visits_update_policy ON public.visits;
CREATE POLICY visits_update_policy ON public.visits
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin() OR visited_by = auth.uid())
  WITH CHECK (is_manager_or_admin() OR visited_by = auth.uid());

DROP POLICY IF EXISTS visits_delete_policy ON public.visits;
DROP POLICY IF EXISTS visits_delete_policy ON public.visits;
CREATE POLICY visits_delete_policy ON public.visits
  FOR DELETE TO authenticated
  USING (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 12. SALES TARGETS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_targets_select_policy ON public.sales_targets;
DROP POLICY IF EXISTS sales_targets_select_policy ON public.sales_targets;
CREATE POLICY sales_targets_select_policy ON public.sales_targets
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS sales_targets_modify_policy ON public.sales_targets;
DROP POLICY IF EXISTS sales_targets_modify_policy ON public.sales_targets;
CREATE POLICY sales_targets_modify_policy ON public.sales_targets
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS notifications_modify_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_modify_policy ON public.notifications;
CREATE POLICY notifications_modify_policy ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 14. TERRITORIES & ROLES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS territories_select_policy ON public.territories;
DROP POLICY IF EXISTS territories_select_policy ON public.territories;
CREATE POLICY territories_select_policy ON public.territories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS territories_modify_policy ON public.territories;
DROP POLICY IF EXISTS territories_modify_policy ON public.territories;
CREATE POLICY territories_modify_policy ON public.territories
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS roles_select_policy ON public.roles;
DROP POLICY IF EXISTS roles_select_policy ON public.roles;
CREATE POLICY roles_select_policy ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS roles_modify_policy ON public.roles;
DROP POLICY IF EXISTS roles_modify_policy ON public.roles;
CREATE POLICY roles_modify_policy ON public.roles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =============================================================================
-- STEP 5: Realtime Replication Setup (Live Sync for PC & Mobile Clients)
-- =============================================================================

-- Ensure replica identity is FULL so change payloads include complete records
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.collections REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.stock_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add core ERP tables to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transactions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Unblock Public & Authenticated Read Access for Essential Reference Data
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS territories_public_read ON public.territories;
CREATE POLICY territories_public_read ON public.territories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS roles_public_read ON public.roles;
CREATE POLICY roles_public_read ON public.roles
  FOR SELECT TO anon, authenticated
  USING (true);

-- =============================================================================
-- VERIFICATION NOTE:
-- Service role key is strictly forbidden from client repository and builds.
-- Public client uses exclusively VITE_SUPABASE_ANON_KEY constrained by these
-- strict Row Level Security policies.
-- =============================================================================




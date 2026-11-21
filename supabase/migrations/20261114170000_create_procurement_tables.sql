-- =============================================================================
-- Migration: 20261114170000_create_procurement_tables.sql
-- Description: Idempotent creation & harmonization of suppliers, purchase_invoices,
--              supplier_payments, route_plan, and handovers with strict UUID keys,
--              RLS harmonization, performance indexes, and Realtime CDC replication.
-- =============================================================================

-- 1. SUPPLIERS TABLE (Strict UUID Primary Key)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  phone text,
  email text,
  address text,
  contact_person text,
  opening_balance numeric(12,2) DEFAULT 0,
  current_payable numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS opening_balance numeric(12,2) DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS current_payable numeric(12,2) DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Seed canonical HAMKO Industries Ltd. supplier with deterministic RFC 4122 UUID
INSERT INTO public.suppliers (
  id, name, company_name, phone, email, address, contact_person, opening_balance, current_payable, notes
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'HAMKO Industries Ltd.',
  'HAMKO Industries Ltd. (Cookware Unit)',
  '01711-555666',
  'procurement@hamko.com.bd',
  'HAMKO Tower, Banglamotor, Dhaka - 1000',
  'Engr. Rafiqul Islam (Senior AGM - Supply)',
  0,
  0,
  'Primary supplier for Aluminum & Non-stick Cookware, Pressure Cookers, and Kitchenware'
) ON CONFLICT (id) DO NOTHING;

-- 2. PURCHASE INVOICES TABLE (Strict UUID Primary & Foreign Keys)
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  chalan_number text,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  invoice_date date DEFAULT CURRENT_DATE,
  warehouse text DEFAULT 'Main Warehouse',
  total_amount numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  due_amount numeric(12,2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid',
  status text DEFAULT 'Received',
  notes text,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS chalan_number text;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS invoice_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS warehouse text DEFAULT 'Main Warehouse';
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS due_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'Received';
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. SUPPLIER PAYMENTS TABLE (Strict UUID Primary & Foreign Keys)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  amount numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_mode text DEFAULT 'Cash',
  reference_no text,
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  invoice_id uuid,
  chalan_id uuid,
  payment_type text DEFAULT 'Payment',
  bank_name text,
  cheque_no text,
  cheque_date text,
  transaction_id text,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'Cash';
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS reference_no text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS payment_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS chalan_id uuid;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'Payment';
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS cheque_no text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS cheque_date text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. SFA ROUTE PLAN TABLE (Strict UUID Primary & Foreign Keys)
CREATE TABLE IF NOT EXISTS public.route_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  day_of_week text NOT NULL DEFAULT 'Saturday',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.route_plan ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE public.route_plan ADD COLUMN IF NOT EXISTS day_of_week text DEFAULT 'Saturday';
ALTER TABLE public.route_plan ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.route_plan ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 5. DAY-END HANDOVERS TABLE (Strict UUID Primary & Foreign Keys)
CREATE TABLE IF NOT EXISTS public.handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_number text UNIQUE NOT NULL,
  officer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  officer_name text,
  session_date date DEFAULT CURRENT_DATE,
  total_amount numeric(12,2) DEFAULT 0,
  cash_amount numeric(12,2) DEFAULT 0,
  bkash_amount numeric(12,2) DEFAULT 0,
  cheque_amount numeric(12,2) DEFAULT 0,
  verification_pin text,
  status text DEFAULT 'Pending',
  collection_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by text
);

ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS officer_id uuid;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS officer_name text;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS session_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS cash_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS bkash_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS cheque_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS verification_pin text;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS collection_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS verified_by text;

-- 6. DROP BROKEN RLS POLICIES & AUTH.USERS FK BLOCKING STANDALONE USER PROVISIONING
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
DROP POLICY IF EXISTS stock_tx_insert_policy ON public.stock_transactions;
DROP POLICY IF EXISTS stock_tx_delete_policy ON public.stock_transactions;
DROP POLICY IF EXISTS expenses_select_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_update_policy ON public.expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON public.expenses;

-- 7. HARMONIZE RLS & GRANT PERMISSIONS ACROSS ALL 19 OPERATIONAL TABLES
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.route_plan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.handovers DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. HIGH-I/O PERFORMANCE INDEXES FOR DATE & FOREIGN KEY LOOKUPS
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sales_rep_id ON public.orders (sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_collections_collection_date ON public.collections (collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON public.collections (customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_order_id ON public.collections (order_id);
CREATE INDEX IF NOT EXISTS idx_customers_territory_id ON public.customers (territory_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON public.stock_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_product_id ON public.stock_transactions (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_reference ON public.stock_transactions (reference);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_date ON public.visits (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON public.visits (customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON public.purchase_invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON public.purchase_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON public.supplier_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_route_plan_customer_id ON public.route_plan (customer_id);
CREATE INDEX IF NOT EXISTS idx_handovers_session_date ON public.handovers (session_date DESC);

-- 9. ENROLL ALL 19 OPERATIONAL TABLES IN SUPABASE REALTIME WITH REPLICA IDENTITY FULL
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'orders', 'order_items', 'collections', 'customers', 'products',
    'inventory', 'stock_transactions', 'expenses', 'categories', 'visits',
    'territories', 'sales_targets', 'notifications', 'users',
    'suppliers', 'purchase_invoices', 'supplier_payments', 'route_plan', 'handovers'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 10. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';


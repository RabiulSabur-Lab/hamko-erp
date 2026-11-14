-- Migration: Create missing procurement tables: suppliers, purchase_invoices, supplier_payments

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  company_name text,
  phone text,
  email text,
  address text,
  contact_person text,
  opening_balance numeric DEFAULT 0,
  current_payable numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. PURCHASE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id text PRIMARY KEY,
  invoice_number text NOT NULL,
  supplier_id text,
  supplier_name text,
  invoice_date date DEFAULT CURRENT_DATE,
  warehouse text DEFAULT 'Main Warehouse',
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  status text DEFAULT 'Received',
  notes text,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. SUPPLIER PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id text PRIMARY KEY,
  payment_number text NOT NULL,
  supplier_id text,
  supplier_name text,
  amount numeric DEFAULT 0,
  payment_mode text DEFAULT 'Cash',
  reference_no text,
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  invoice_id text,
  chalan_id text,
  payment_type text DEFAULT 'Payment',
  bank_name text,
  cheque_no text,
  cheque_date text,
  transaction_id text,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Disable Row Level Security to match primary ERP tables (20261019140000_disable_rls_primary_tables.sql)
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_payments DISABLE ROW LEVEL SECURITY;

-- Grant unrestricted table access to anon and authenticated roles
GRANT ALL ON TABLE public.suppliers TO anon, authenticated;
GRANT ALL ON TABLE public.purchase_invoices TO anon, authenticated;
GRANT ALL ON TABLE public.supplier_payments TO anon, authenticated;

-- Add to Realtime Publication if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_invoices;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_payments;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

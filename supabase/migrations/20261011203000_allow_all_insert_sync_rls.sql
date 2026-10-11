-- ============================================================
-- Migration: 20261011203000_allow_all_insert_sync_rls.sql
-- Description: Allow open sync insert/update permissions for ERP data synchronization
-- ============================================================

-- Enable and update RLS policies for smooth synchronization
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if any, and create open insert/update policies for admin/sync
DROP POLICY IF EXISTS "Allow all insert for admin" ON public.products;
DROP POLICY IF EXISTS "Allow all insert for categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all insert for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all insert for orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all insert for order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all insert for collections" ON public.collections;

CREATE POLICY "Allow all insert for admin" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all insert for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all insert for customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all insert for orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all insert for order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all insert for collections" ON public.collections FOR ALL USING (true) WITH CHECK (true);

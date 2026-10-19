/*
# Migration: Disable Row Level Security (RLS) on primary tables and grant full access
#
# Primary tables: products, categories, orders, customers, order_items, collections, inventory, expenses
# Grants unrestricted access to anon and authenticated roles to eliminate permission-denied bottlenecks.
*/

-- 1. Disable RLS on primary tables
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to maintain clean catalog
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_modify_policy" ON public.categories;
DROP POLICY IF EXISTS "Allow all insert for categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all insert for admin" ON public.products;
DROP POLICY IF EXISTS "Allow all insert for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all insert for orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all insert for order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all insert for collections" ON public.collections;

-- 3. Grant full table permissions to anon and authenticated roles
GRANT ALL ON TABLE public.products TO anon, authenticated;
GRANT ALL ON TABLE public.categories TO anon, authenticated;
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.customers TO anon, authenticated;
GRANT ALL ON TABLE public.order_items TO anon, authenticated;
GRANT ALL ON TABLE public.collections TO anon, authenticated;
GRANT ALL ON TABLE public.inventory TO anon, authenticated;
GRANT ALL ON TABLE public.expenses TO anon, authenticated;

-- 4. Grant usage on sequences if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. Force PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';

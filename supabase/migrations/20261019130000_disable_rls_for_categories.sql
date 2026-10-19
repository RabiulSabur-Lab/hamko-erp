/*
# Migration: Disable RLS for categories and sync schema
#
# Allows frictionless reading, creation, and updating of product categories
# during data sync and product management.
*/

-- 1. Disable Row Level Security on categories
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- 2. Drop any lingering restrictive or conflicting policies on categories
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_modify_policy" ON public.categories;
DROP POLICY IF EXISTS "Allow all insert for categories" ON public.categories;
DROP POLICY IF EXISTS "demo_insert_categories" ON public.categories;
DROP POLICY IF EXISTS "staff_read_categories" ON public.categories;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

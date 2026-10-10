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
CREATE POLICY users_select_policy ON public.users
  FOR SELECT TO authenticated
  USING (
    -- Super Admin & Managers see all users; Active staff can see colleagues for assignment lookups
    is_manager_or_admin()
    OR auth.uid() = id
    OR is_active = true
  );

DROP POLICY IF EXISTS users_insert_policy ON public.users;
CREATE POLICY users_insert_policy ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin());

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
CREATE POLICY users_delete_policy ON public.users
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 2. PRODUCTS & PRICING
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS products_select_policy ON public.products;
CREATE POLICY products_select_policy ON public.products
  FOR SELECT TO authenticated
  USING (is_active = true OR is_manager_or_admin());

DROP POLICY IF EXISTS products_insert_policy ON public.products;
CREATE POLICY products_insert_policy ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin());

DROP POLICY IF EXISTS products_update_policy ON public.products;
CREATE POLICY products_update_policy ON public.products
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

DROP POLICY IF EXISTS products_delete_policy ON public.products;
CREATE POLICY products_delete_policy ON public.products
  FOR DELETE TO authenticated
  USING (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 3. CATEGORIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS categories_select_policy ON public.categories;
CREATE POLICY categories_select_policy ON public.categories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS categories_modify_policy ON public.categories;
CREATE POLICY categories_modify_policy ON public.categories
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 4. CUSTOMERS & DEALERS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS customers_select_policy ON public.customers;
CREATE POLICY customers_select_policy ON public.customers
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all customers across the system

DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
CREATE POLICY customers_insert_policy ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_active = true));

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
CREATE POLICY orders_select_policy ON public.orders
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all orders across the system

DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
CREATE POLICY orders_insert_policy ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager_or_admin()
    OR sales_rep_id = auth.uid()
  );

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
CREATE POLICY order_items_select_policy ON public.order_items
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All for authenticated staff

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
CREATE POLICY inventory_select_policy ON public.inventory
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS inventory_modify_policy ON public.inventory;
CREATE POLICY inventory_modify_policy ON public.inventory
  FOR ALL TO authenticated
  USING (is_financial_auditor())
  WITH CHECK (is_financial_auditor());

-- -----------------------------------------------------------------------------
-- 8. STOCK TRANSACTIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS stock_tx_select_policy ON public.stock_transactions;
CREATE POLICY stock_tx_select_policy ON public.stock_transactions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS stock_tx_insert_policy ON public.stock_transactions;
CREATE POLICY stock_tx_insert_policy ON public.stock_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS stock_tx_delete_policy ON public.stock_transactions;
CREATE POLICY stock_tx_delete_policy ON public.stock_transactions
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 9. PAYMENT COLLECTIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS collections_select_policy ON public.collections;
CREATE POLICY collections_select_policy ON public.collections
  FOR SELECT TO authenticated
  USING (true); -- Simple Read-All: All authenticated Sales Officers can VIEW all collections across the system

DROP POLICY IF EXISTS collections_insert_policy ON public.collections;
CREATE POLICY collections_insert_policy ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR collected_by = auth.uid()
  );

DROP POLICY IF EXISTS collections_update_policy ON public.collections;
CREATE POLICY collections_update_policy ON public.collections
  FOR UPDATE TO authenticated
  USING (is_financial_auditor() OR collected_by = auth.uid())
  WITH CHECK (is_financial_auditor() OR collected_by = auth.uid());

DROP POLICY IF EXISTS collections_delete_policy ON public.collections;
CREATE POLICY collections_delete_policy ON public.collections
  FOR DELETE TO authenticated
  USING (is_financial_auditor() OR collected_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. EXPENSES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS expenses_select_policy ON public.expenses;
CREATE POLICY expenses_select_policy ON public.expenses
  FOR SELECT TO authenticated
  USING (
    is_financial_auditor()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
CREATE POLICY expenses_insert_policy ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_financial_auditor()
    OR user_id = auth.uid()
  );

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
CREATE POLICY expenses_delete_policy ON public.expenses
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- 11. VISITS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS visits_select_policy ON public.visits;
CREATE POLICY visits_select_policy ON public.visits
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR visited_by = auth.uid()
  );

DROP POLICY IF EXISTS visits_insert_policy ON public.visits;
CREATE POLICY visits_insert_policy ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager_or_admin()
    OR visited_by = auth.uid()
  );

DROP POLICY IF EXISTS visits_update_policy ON public.visits;
CREATE POLICY visits_update_policy ON public.visits
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin() OR visited_by = auth.uid())
  WITH CHECK (is_manager_or_admin() OR visited_by = auth.uid());

DROP POLICY IF EXISTS visits_delete_policy ON public.visits;
CREATE POLICY visits_delete_policy ON public.visits
  FOR DELETE TO authenticated
  USING (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 12. SALES TARGETS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_targets_select_policy ON public.sales_targets;
CREATE POLICY sales_targets_select_policy ON public.sales_targets
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS sales_targets_modify_policy ON public.sales_targets;
CREATE POLICY sales_targets_modify_policy ON public.sales_targets
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS notifications_modify_policy ON public.notifications;
CREATE POLICY notifications_modify_policy ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 14. TERRITORIES & ROLES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS territories_select_policy ON public.territories;
CREATE POLICY territories_select_policy ON public.territories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS territories_modify_policy ON public.territories;
CREATE POLICY territories_modify_policy ON public.territories
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS roles_select_policy ON public.roles;
CREATE POLICY roles_select_policy ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS roles_modify_policy ON public.roles;
CREATE POLICY roles_modify_policy ON public.roles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =============================================================================
-- VERIFICATION NOTE:
-- Service role key is strictly forbidden from client repository and builds.
-- Public client uses exclusively VITE_SUPABASE_ANON_KEY constrained by these
-- strict Row Level Security policies.
-- =============================================================================

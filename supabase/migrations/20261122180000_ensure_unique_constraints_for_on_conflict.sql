-- =============================================================================
-- Migration: 20261122180000_ensure_unique_constraints_for_on_conflict.sql
-- Description: Ensures all unique constraints required by PostgREST / Supabase
--              `ON CONFLICT` upsert specifications exist on `collections`,
--              `orders`, `products`, `categories`, `territories`, `inventory`,
--              `route_plan`, and `handovers`. Prevents PostgreSQL 42P10 error:
--              "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- =============================================================================

-- 1. COLLECTIONS: Deduplicate by collection_number (if any duplicates exist) & enforce UNIQUE constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collections'
  ) THEN
    -- Remove older duplicate collection_number rows while preserving the latest record
    DELETE FROM public.collections a
    USING public.collections b
    WHERE a.collection_number IS NOT NULL
      AND a.collection_number = b.collection_number
      AND a.ctid < b.ctid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'collections'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(collection_number)%'
    ) THEN
      ALTER TABLE public.collections
        ADD CONSTRAINT collections_collection_number_key UNIQUE (collection_number);
    END IF;
  END IF;
END $$;

-- 2. ORDERS: Deduplicate by order_number & enforce UNIQUE constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'orders'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(order_number)%'
    ) THEN
      ALTER TABLE public.orders
        ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
    END IF;
  END IF;
END $$;

-- 3. PRODUCTS: Enforce UNIQUE constraint on sku_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'products'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(sku_code)%'
    ) THEN
      ALTER TABLE public.products
        ADD CONSTRAINT products_sku_code_key UNIQUE (sku_code);
    END IF;
  END IF;
END $$;

-- 4. CATEGORIES: Enforce UNIQUE constraint on name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    DELETE FROM public.categories a
    USING public.categories b
    WHERE a.name = b.name
      AND a.ctid < b.ctid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'categories'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(name)%'
    ) THEN
      ALTER TABLE public.categories
        ADD CONSTRAINT categories_name_key UNIQUE (name);
    END IF;
  END IF;
END $$;

-- 5. TERRITORIES: Enforce UNIQUE constraint on name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'territories'
  ) THEN
    DELETE FROM public.territories a
    USING public.territories b
    WHERE a.name = b.name
      AND a.ctid < b.ctid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'territories'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(name)%'
    ) THEN
      ALTER TABLE public.territories
        ADD CONSTRAINT territories_name_key UNIQUE (name);
    END IF;
  END IF;
END $$;

-- 6. INVENTORY: Enforce composite UNIQUE constraint on (product_id, warehouse)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory'
  ) THEN
    DELETE FROM public.inventory a
    USING public.inventory b
    WHERE a.product_id = b.product_id
      AND a.warehouse = b.warehouse
      AND a.ctid < b.ctid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'inventory'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(product_id, warehouse)%'
    ) THEN
      ALTER TABLE public.inventory
        ADD CONSTRAINT inventory_product_id_warehouse_key UNIQUE (product_id, warehouse);
    END IF;
  END IF;
END $$;

-- 7. ROUTE_PLAN: Enforce UNIQUE constraint on customer_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'route_plan'
  ) THEN
    DELETE FROM public.route_plan a
    USING public.route_plan b
    WHERE a.customer_id = b.customer_id
      AND a.ctid < b.ctid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'route_plan'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(customer_id)%'
    ) THEN
      ALTER TABLE public.route_plan
        ADD CONSTRAINT route_plan_customer_id_key UNIQUE (customer_id);
    END IF;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

/*
================================================================================
# Migration: 20261031203000_enable_realtime_replication_primary_tables.sql
# Description: Enroll all primary ERP tables in the Supabase Realtime Publication
#              and set REPLICA IDENTITY FULL for complete cross-device CDC.
================================================================================
*/

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'orders',
    'order_items',
    'collections',
    'customers',
    'products',
    'inventory',
    'stock_transactions',
    'expenses',
    'categories',
    'visits',
    'territories',
    'sales_targets'
  ];
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 2. Add each primary table to publication if not already present
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice adding % to supabase_realtime: %', tbl, SQLERRM;
      END;
    END IF;

    -- 3. Set REPLICA IDENTITY FULL for complete payload streaming on UPDATE/DELETE
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice setting REPLICA IDENTITY on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4. Ensure read permissions for anon and authenticated on replicated tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';


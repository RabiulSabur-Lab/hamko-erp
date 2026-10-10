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

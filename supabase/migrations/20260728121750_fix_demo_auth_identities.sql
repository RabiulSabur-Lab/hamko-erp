/*
# Fix Demo Auth Users — Add Missing auth.identities Rows

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

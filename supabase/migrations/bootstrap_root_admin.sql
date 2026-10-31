-- ==============================================================================
-- PW Materials: One-Time Secure Root Admin Bootstrap
-- File: supabase/migrations/bootstrap_root_admin.sql
--
-- Instructions:
--   1. Replace 'YOUR_INITIAL_ADMIN_EMAIL@example.com' with the email of the account
--      that registered in Supabase.
--   2. Execute this script once in your Supabase SQL Editor.
--   3. This sets role = 'ROOT_ADMIN' and approval_status = 'APPROVED'.
-- ==============================================================================

DO $$
DECLARE
  target_email TEXT := 'YOUR_INITIAL_ADMIN_EMAIL@example.com'; -- <--- REPLACE WITH DESIRED ROOT ADMIN EMAIL
  target_uid UUID;
BEGIN
  -- Look up target user by email in auth.users
  SELECT id INTO target_uid FROM auth.users WHERE email = target_email;

  IF target_uid IS NULL THEN
    RAISE NOTICE 'Target user with email % has not signed up yet. Please sign up first, then run this bootstrap.', target_email;
  ELSE
    -- Ensure profile exists
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      role,
      approval_status,
      registration_method,
      created_at,
      updated_at,
      approved_at
    ) VALUES (
      target_uid,
      'Initial Root Administrator',
      target_email,
      'ROOT_ADMIN',
      'APPROVED',
      'bootstrap',
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'ROOT_ADMIN',
      approval_status = 'APPROVED',
      approved_at = timezone('utc'::text, now());

    -- Audit Log
    INSERT INTO public.audit_logs (actor_id, actor_email, action, target_id, target_type, details)
    VALUES (
      target_uid,
      target_email,
      'ROOT_ADMIN_BOOTSTRAP',
      target_uid::text,
      'user',
      jsonb_build_object('bootstrapped_email', target_email, 'role', 'ROOT_ADMIN')
    );

    RAISE NOTICE 'SUCCESS: User % (UID: %) is now bootstrapped as ROOT_ADMIN with APPROVED status.', target_email, target_uid;
  END IF;
END $$;

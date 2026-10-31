-- ==============================================================================
-- PW Materials: User Profiles, Roles, Approval Workflow & Audit Logs Migration
-- File: supabase/migrations/20261031_auth_user_management.sql
-- Description:
--   1. Create user_role enum ('ROOT_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER')
--   2. Create approval_status enum ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')
--   3. Create public.profiles table linked to auth.users
--   4. Create public.audit_logs table
--   5. Auto-profile trigger on auth.users insert (sets PENDING, VIEWER role, no admin privilege)
--   6. Row-Level Security (RLS) on profiles, audit_logs, and existing data tables
--   7. Helper security definer functions for role checking & admin approvals
-- ==============================================================================

-- 1. ENUMS (create if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ROOT_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
END $$;

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'VIEWER',
  approval_status public.approval_status NOT NULL DEFAULT 'PENDING',
  registration_method TEXT NOT NULL DEFAULT 'email', -- 'email' or 'google'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ
);

-- Index for fast lookup by status and email
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL, -- e.g. 'USER_REGISTERED', 'USER_APPROVED', 'USER_REJECTED', 'ROLE_CHANGED', 'MATERIAL_CREATED', 'MATERIAL_DELETED'
  target_id TEXT,       -- user_id or material_id or invoice_id
  target_type TEXT,     -- 'user', 'material', 'invoice', 'settings'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. PROFILE UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_profile_updated_at();

-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS
-- Whenever a user signs up (via email or Google), create a pending profile.
-- Never assign administrative privileges automatically!
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_provider TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'provider',
    'email'
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    approval_status,
    registration_method,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    'VIEWER',
    'PENDING',
    v_provider,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- Log user registration in audit logs
  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    action,
    target_id,
    target_type,
    details
  ) VALUES (
    NEW.id,
    NEW.email,
    'USER_REGISTERED',
    NEW.id::text,
    'user',
    jsonb_build_object(
      'registration_method', v_provider,
      'email', NEW.email,
      'approval_status', 'PENDING'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- 6. SECURITY DEFINER HELPER FUNCTIONS FOR AUTHORIZATION CHECKS
-- These functions run with elevated rights to safely inspect the caller's role.

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS public.profiles AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND approval_status = 'APPROVED'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND approval_status = 'APPROVED'
    AND role IN ('ROOT_ADMIN', 'ADMIN')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_root_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND approval_status = 'APPROVED'
    AND role = 'ROOT_ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. SECURE ADMIN ACTIONS (SECURITY DEFINER FUNCTIONS)

-- Function: Admin approves a user and assigns a role
CREATE OR REPLACE FUNCTION public.admin_approve_user(
  target_user_id UUID,
  assigned_role public.user_role DEFAULT 'EDITOR'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_email TEXT;
BEGIN
  -- 1. Check if caller is an approved admin
  SELECT role, email INTO v_caller_role, v_caller_email
  FROM public.profiles
  WHERE id = auth.uid() AND approval_status = 'APPROVED';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('ROOT_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied. Only authorized administrators can approve users.';
  END IF;

  -- 2. Only ROOT_ADMIN can assign ROOT_ADMIN or ADMIN role
  IF assigned_role IN ('ROOT_ADMIN', 'ADMIN') AND v_caller_role != 'ROOT_ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Only ROOT_ADMIN can assign administrator roles.';
  END IF;

  -- 3. Update profile
  UPDATE public.profiles
  SET approval_status = 'APPROVED',
      role = assigned_role,
      approved_at = timezone('utc'::text, now()),
      approved_by = auth.uid()
  WHERE id = target_user_id;

  -- 4. Audit Log
  INSERT INTO public.audit_logs (actor_id, actor_email, action, target_id, target_type, details)
  VALUES (
    auth.uid(),
    v_caller_email,
    'USER_APPROVED',
    target_user_id::text,
    'user',
    jsonb_build_object('assigned_role', assigned_role, 'target_user_id', target_user_id)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Admin rejects or suspends a user
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  target_user_id UUID,
  new_status public.approval_status
)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_email TEXT;
  v_target_role public.user_role;
BEGIN
  SELECT role, email INTO v_caller_role, v_caller_email
  FROM public.profiles
  WHERE id = auth.uid() AND approval_status = 'APPROVED';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('ROOT_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied. Only authorized administrators can change user status.';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = target_user_id;

  -- Target cannot be ROOT_ADMIN unless caller is ROOT_ADMIN
  IF v_target_role = 'ROOT_ADMIN' AND v_caller_role != 'ROOT_ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Cannot modify status of a ROOT_ADMIN.';
  END IF;

  UPDATE public.profiles
  SET approval_status = new_status
  WHERE id = target_user_id;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, target_id, target_type, details)
  VALUES (
    auth.uid(),
    v_caller_email,
    'USER_STATUS_CHANGED',
    target_user_id::text,
    'user',
    jsonb_build_object('new_status', new_status, 'target_user_id', target_user_id)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Admin updates a user's role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role public.user_role
)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_email TEXT;
  v_target_role public.user_role;
BEGIN
  SELECT role, email INTO v_caller_role, v_caller_email
  FROM public.profiles
  WHERE id = auth.uid() AND approval_status = 'APPROVED';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('ROOT_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied. Only authorized administrators can change user roles.';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = target_user_id;

  -- Only ROOT_ADMIN can touch ROOT_ADMIN
  IF (v_target_role = 'ROOT_ADMIN' OR new_role = 'ROOT_ADMIN') AND v_caller_role != 'ROOT_ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Only ROOT_ADMIN can grant or revoke ROOT_ADMIN role.';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, target_id, target_type, details)
  VALUES (
    auth.uid(),
    v_caller_email,
    'ROLE_CHANGED',
    target_user_id::text,
    'user',
    jsonb_build_object('new_role', new_role, 'previous_role', v_target_role, 'target_user_id', target_user_id)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on profiles and audit_logs
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS:
-- 1. Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

-- 2. Users cannot directly update role or approval_status via standard UPDATE
DROP POLICY IF EXISTS "Users can update own display profile" ON public.profiles;
CREATE POLICY "Users can update own display profile" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
  -- Prevents client from changing their own role or approval_status
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND approval_status = (SELECT p.approval_status FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3. Admins can update profiles through RLS or helper functions
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE USING (
  public.is_admin()
);

-- AUDIT LOGS RLS:
-- Only approved admins can view audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
FOR SELECT USING (
  public.is_admin()
);

-- Authenticated users can insert their own actions into audit logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.uid() = actor_id OR auth.uid() IS NULL
);

-- 9. PRESERVE AND SECURE EXISTING MATERIAL & INVOICE RECORDS
-- Existing records have owner_id NULL or user id.
-- Approved users (EDITOR, ADMIN, ROOT_ADMIN, VIEWER) can access shared company records.
-- PENDING or REJECTED users cannot access records!
-- Fallback: anon users in local-storage mode can still function if unauthenticated.

DROP POLICY IF EXISTS "Approved users can read materials" ON public.materials;
CREATE POLICY "Approved users can read materials" ON public.materials
FOR SELECT USING (
  public.is_approved_user() OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Approved editors and admins can insert materials" ON public.materials;
CREATE POLICY "Approved editors and admins can insert materials" ON public.materials
FOR INSERT WITH CHECK (
  (public.is_approved_user() AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IN ('EDITOR', 'ADMIN', 'ROOT_ADMIN')) OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Approved editors and admins can update materials" ON public.materials;
CREATE POLICY "Approved editors and admins can update materials" ON public.materials
FOR UPDATE USING (
  (public.is_approved_user() AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IN ('EDITOR', 'ADMIN', 'ROOT_ADMIN')) OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Approved admins can delete materials" ON public.materials;
CREATE POLICY "Approved admins can delete materials" ON public.materials
FOR DELETE USING (
  (public.is_approved_user() AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IN ('ADMIN', 'ROOT_ADMIN')) OR auth.role() = 'anon'
);

-- Purchases table (flat table) policies
DROP POLICY IF EXISTS "Approved users can read purchases" ON public.purchases;
CREATE POLICY "Approved users can read purchases" ON public.purchases
FOR SELECT USING (
  public.is_approved_user() OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Approved users can insert purchases" ON public.purchases;
CREATE POLICY "Approved users can insert purchases" ON public.purchases
FOR INSERT WITH CHECK (
  (public.is_approved_user() AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IN ('EDITOR', 'ADMIN', 'ROOT_ADMIN')) OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Approved admins can delete purchases" ON public.purchases;
CREATE POLICY "Approved admins can delete purchases" ON public.purchases
FOR DELETE USING (
  (public.is_approved_user() AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IN ('ADMIN', 'ROOT_ADMIN')) OR auth.role() = 'anon'
);

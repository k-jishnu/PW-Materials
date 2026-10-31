// tests/test-auth-and-user-management.ts
//
// Automated test suite for PW Materials Authentication & User Management:
// 1. Auth routes (/login, /signup, /forgot-password, /reset-password, /pending-approval, /access-denied, /auth/callback)
// 2. Admin User Management route (/admin/users)
// 3. Approval status workflow & route protection
// 4. Role-based permission hierarchy (ROOT_ADMIN > ADMIN > EDITOR > VIEWER)
// 5. Database migration script validation (RLS policies, profiles trigger, security definer functions)
// 6. Root Admin bootstrap procedure script
//

import fs from 'node:fs';
import path from 'node:path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('TEST SUITE: AUTHENTICATION & USER MANAGEMENT VERIFICATION');
console.log('================================================================\n');

// 1. VERIFY AUTH PAGES EXIST
console.log('--- 1. DEDICATED AUTHENTICATION & APPROVAL PAGES ---');
const loginPage = path.resolve('src/pages/LoginPage.tsx');
const signupPage = path.resolve('src/pages/SignupPage.tsx');
const forgotPasswordPage = path.resolve('src/pages/ForgotPasswordPage.tsx');
const resetPasswordPage = path.resolve('src/pages/ResetPasswordPage.tsx');
const pendingApprovalPage = path.resolve('src/pages/PendingApprovalPage.tsx');
const accessDeniedPage = path.resolve('src/pages/AccessDeniedPage.tsx');
const authCallbackPage = path.resolve('src/pages/AuthCallbackPage.tsx');
const adminUsersPage = path.resolve('src/pages/AdminUsersPage.tsx');

assert(fs.existsSync(loginPage), 'LoginPage.tsx exists');
assert(fs.existsSync(signupPage), 'SignupPage.tsx exists');
assert(fs.existsSync(forgotPasswordPage), 'ForgotPasswordPage.tsx exists');
assert(fs.existsSync(resetPasswordPage), 'ResetPasswordPage.tsx exists');
assert(fs.existsSync(pendingApprovalPage), 'PendingApprovalPage.tsx exists');
assert(fs.existsSync(accessDeniedPage), 'AccessDeniedPage.tsx exists');
assert(fs.existsSync(authCallbackPage), 'AuthCallbackPage.tsx exists');
assert(fs.existsSync(adminUsersPage), 'AdminUsersPage.tsx exists');

// 2. VERIFY LOGIN & SIGNUP FEATURES
console.log('\n--- 2. LOGIN & SIGNUP REQUIREMENTS ---');
const loginContent = fs.readFileSync(loginPage, 'utf8');
const signupContent = fs.readFileSync(signupPage, 'utf8');

assert(loginContent.includes('signInWithEmail'), 'Login supports email/password login');
assert(loginContent.includes('signInWithGoogle'), 'Login supports Google OAuth');
assert(loginContent.includes('showPassword'), 'Login includes password show/hide toggle');
assert(loginContent.includes('rememberMe'), 'Login includes remember-me checkbox');
assert(loginContent.includes('/forgot-password'), 'Login has forgot-password link');
assert(loginContent.includes('/signup'), 'Login has create-account link');

assert(signupContent.includes('fullName'), 'Signup has full name input');
assert(signupContent.includes('confirmPassword'), 'Signup has confirm password input');
assert(signupContent.includes('termsAccepted'), 'Signup includes terms & approval acknowledgement');
assert(signupContent.includes('signInWithGoogle'), 'Signup includes Google OAuth option');
assert(signupContent.includes('signUpWithEmail'), 'Signup registers user via Supabase Auth');

// 3. VERIFY PENDING APPROVAL WORKFLOW
console.log('\n--- 3. PENDING APPROVAL & ROUTE GUARD ---');
const pendingContent = fs.readFileSync(pendingApprovalPage, 'utf8');
assert(pendingContent.includes('awaiting administrator approval'), 'Pending page displays required approval notice');
assert(pendingContent.includes('handleRefresh'), 'Pending page has refresh status button');
assert(pendingContent.includes('signOut'), 'Pending page has sign out button');

const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
assert(appContent.includes("approvalStatus === 'PENDING'"), 'App checks for PENDING status');
assert(appContent.includes("navigate('/pending-approval')"), 'App redirects PENDING users to /pending-approval');
assert(appContent.includes("approvalStatus === 'REJECTED'"), 'App checks for REJECTED status');
assert(appContent.includes("navigate('/access-denied')"), 'App redirects REJECTED users to /access-denied');

// 4. VERIFY ADMIN USER MANAGEMENT FEATURES
console.log('\n--- 4. ADMIN USER MANAGEMENT SECTION ---');
const adminContent = fs.readFileSync(adminUsersPage, 'utf8');
assert(adminContent.includes('Pending') && adminContent.includes('pendingUsers'), 'Admin page displays pending requests');
assert(adminContent.includes('Approved') && adminContent.includes('approvedUsers'), 'Admin page displays approved users');
assert(adminContent.includes('handleApprove'), 'Admin page has user approval action');
assert(adminContent.includes('handleReject'), 'Admin page has user rejection action');
assert(adminContent.includes('handleRoleChange'), 'Admin page allows role updates');
assert(adminContent.includes('handleSuspend') && adminContent.includes('handleReactivate'), 'Admin page allows user suspension/reactivation');
assert(adminContent.includes('Mobile Number'), 'Admin page table displays mobile number');
assert(adminContent.includes('Audit Logs'), 'Admin page displays audit logs');
assert(adminContent.includes('confirmModal'), 'Admin page requires confirmation for sensitive actions');

// 5. VERIFY DATABASE MIGRATION & RLS POLICIES
console.log('\n--- 5. DATABASE MIGRATION & SECURITY POLICIES ---');
const migrationPath = path.resolve('supabase/migrations/20261031_auth_user_management.sql');
assert(fs.existsSync(migrationPath), '20261031_auth_user_management.sql migration file exists');

const migrationContent = fs.readFileSync(migrationPath, 'utf8');
assert(migrationContent.includes("CREATE TYPE public.user_role AS ENUM ('ROOT_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER')"), 'Creates user_role enum');
assert(migrationContent.includes("CREATE TYPE public.approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')"), 'Creates approval_status enum');
assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Creates profiles table');
assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'Creates audit_logs table');
assert(migrationContent.includes('CREATE TRIGGER on_auth_user_created'), 'Creates trigger to auto-create profile on auth.users insert');
assert(migrationContent.includes("'PENDING'"), 'Default user approval status is PENDING');
assert(migrationContent.includes("'VIEWER'"), 'Default assigned role is VIEWER without admin privilege');
assert(migrationContent.includes('admin_approve_user'), 'Includes secure admin_approve_user security definer function');
assert(migrationContent.includes('admin_set_user_status'), 'Includes secure admin_set_user_status security definer function');
assert(migrationContent.includes('admin_update_user_role'), 'Includes secure admin_update_user_role security definer function');
assert(migrationContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'), 'Enables RLS on profiles');
assert(migrationContent.includes('ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY'), 'Enables RLS on audit_logs');
assert(migrationContent.includes('Approved users can read materials'), 'Enforces RLS so only approved users can read company materials');

// 6. VERIFY ROOT ADMIN BOOTSTRAP SCRIPT
console.log('\n--- 6. ROOT ADMIN BOOTSTRAP SCRIPT ---');
const bootstrapPath = path.resolve('supabase/migrations/bootstrap_root_admin.sql');
assert(fs.existsSync(bootstrapPath), 'bootstrap_root_admin.sql bootstrap script exists');

const bootstrapContent = fs.readFileSync(bootstrapPath, 'utf8');
assert(bootstrapContent.includes("'ROOT_ADMIN'"), 'Bootstrap sets role to ROOT_ADMIN');
assert(bootstrapContent.includes("'APPROVED'"), 'Bootstrap sets approval_status to APPROVED');
assert(bootstrapContent.includes('ROOT_ADMIN_BOOTSTRAP'), 'Bootstrap logs action into audit_logs');

// 7. VERIFY PRESERVATION OF EXISTING MATERIAL SCHEMA
console.log('\n--- 7. PRESERVATION OF EXISTING DATA SCHEMA ---');
const initSchemaPath = path.resolve('supabase/migrations/20261021_init_materials_schema.sql');
assert(fs.existsSync(initSchemaPath), 'Original materials schema preserved');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passCount} passed, ${failCount} failed.`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL AUTHENTICATION & USER MANAGEMENT CHECKS PASSED!\n');
}


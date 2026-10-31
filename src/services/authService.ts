// src/services/authService.ts
//
// Supabase Authentication & Profile Management Service
// - Handles Email/Password & Google OAuth signup and sign-in
// - Automatic user profile retrieval and session change tracking
// - Password reset requests and updates
// - Admin approval operations (approve, reject, update role, fetch pending/approved)
// - Audit log recording
//

import { supabaseService } from './supabaseClient';
import { UserProfile, UserRole, ApprovalStatus, AuditLogEntry } from '@/types';

class AuthService {
  /**
   * Get the current active session
   */
  public async getSession() {
    const client = supabaseService.getClient();
    if (!client) return { session: null, error: null };
    const { data, error } = await client.auth.getSession();
    return { session: data.session, error };
  }

  /**
   * Get the current authenticated user
   */
  public async getCurrentUser() {
    const client = supabaseService.getClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
  }

  /**
   * Fetch the user profile from public.profiles
   */
  public async getProfile(userId: string): Promise<UserProfile | null> {
    const client = supabaseService.getClient();
    if (!client) {
      // In offline/mock mode without Supabase connected, return a default mock local profile
      return {
        id: userId,
        email: 'local@pwmaterials.local',
        full_name: 'Local Administrator',
        role: 'ROOT_ADMIN',
        approval_status: 'APPROVED',
        registration_method: 'local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return null;
      }
      return data as UserProfile | null;
    } catch (e) {
      console.error('getProfile exception:', e);
      return null;
    }
  }

  /**
   * Register with Email and Password
   */
  public async signUpWithEmail(email: string, password: string, fullName: string, mobileNumber?: string) {
    const client = supabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client not initialized. Please verify configuration.');
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
          mobile_number: mobileNumber || '',
          phone: mobileNumber || '',
        },
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with Email and Password
   */
  public async signInWithEmail(email: string, password: string) {
    const client = supabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client not initialized. Please verify configuration.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Log login timestamp
    if (data.user) {
      try {
        await client
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch {
        // Non-blocking
      }
    }

    return data;
  }

  /**
   * Sign in with Google OAuth
   */
  public async signInWithGoogle() {
    const client = supabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client not initialized. Please verify configuration.');
    }

    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://pwmaterials.vercel.app/auth/callback';

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Request Password Reset Email
   */
  public async sendPasswordResetEmail(email: string) {
    const client = supabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client not initialized.');
    }

    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'https://pwmaterials.vercel.app/reset-password';

    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Update password (after following password reset link)
   */
  public async updateUserPassword(newPassword: string) {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const { data, error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out
   */
  public async signOut() {
    const client = supabaseService.getClient();
    if (!client) return;
    await client.auth.signOut();
  }

  /**
   * Listen to auth state changes
   */
  public onAuthStateChange(callback: (event: string, session: any) => void) {
    const client = supabaseService.getClient();
    if (!client) return { data: { subscription: { unsubscribe: () => {} } } };
    return client.auth.onAuthStateChange(callback);
  }

  // ==========================================================================
  // ADMIN USER MANAGEMENT METHODS
  // ==========================================================================

  /**
   * Fetch all user profiles (Admin only)
   */
  public async getAllProfiles(): Promise<UserProfile[]> {
    const client = supabaseService.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAllProfiles error:', error.message);
      throw error;
    }
    return (data || []) as UserProfile[];
  }

  /**
   * Approve a pending user and assign a role
   */
  public async approveUser(targetUserId: string, role: UserRole = 'EDITOR') {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase not connected');

    // Use RPC security definer function
    const { data, error } = await client.rpc('admin_approve_user', {
      target_user_id: targetUserId,
      assigned_role: role,
    });

    if (error) {
      // Fallback: direct update if RPC is not yet created
      const { error: directErr } = await client
        .from('profiles')
        .update({
          approval_status: 'APPROVED',
          role: role,
          approved_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (directErr) throw directErr;
      return true;
    }
    return data;
  }

  /**
   * Reject a user registration
   */
  public async rejectUser(targetUserId: string) {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase not connected');

    const { data, error } = await client.rpc('admin_set_user_status', {
      target_user_id: targetUserId,
      new_status: 'REJECTED',
    });

    if (error) {
      const { error: directErr } = await client
        .from('profiles')
        .update({ approval_status: 'REJECTED' })
        .eq('id', targetUserId);
      if (directErr) throw directErr;
      return true;
    }
    return data;
  }

  /**
   * Update a user's role (ROOT_ADMIN / ADMIN)
   */
  public async updateUserRole(targetUserId: string, newRole: UserRole) {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase not connected');

    const { data, error } = await client.rpc('admin_update_user_role', {
      target_user_id: targetUserId,
      new_role: newRole,
    });

    if (error) {
      const { error: directErr } = await client
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);
      if (directErr) throw directErr;
      return true;
    }
    return data;
  }

  /**
   * Suspend or reactivate an approved user
   */
  public async setUserStatus(targetUserId: string, status: ApprovalStatus) {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase not connected');

    const { data, error } = await client.rpc('admin_set_user_status', {
      target_user_id: targetUserId,
      new_status: status,
    });

    if (error) {
      const { error: directErr } = await client
        .from('profiles')
        .update({ approval_status: status })
        .eq('id', targetUserId);
      if (directErr) throw directErr;
      return true;
    }
    return data;
  }

  /**
   * Fetch audit logs (Admin only)
   */
  public async getAuditLogs(): Promise<AuditLogEntry[]> {
    const client = supabaseService.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('getAuditLogs warning:', error.message);
      return [];
    }
    return (data || []) as AuditLogEntry[];
  }
}

export const authService = new AuthService();


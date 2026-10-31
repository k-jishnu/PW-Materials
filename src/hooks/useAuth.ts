// src/hooks/useAuth.ts
//
// Application Authentication Context and Hook
// Provides global auth state, user profile, role permissions, and sign-in/out methods.
//

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { authService } from '@/services/authService';
import { UserProfile, UserRole, ApprovalStatus } from '@/types';

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isRootAdmin: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  role: 'VIEWER',
  approvalStatus: 'PENDING',
  isLoading: true,
  isAuthenticated: false,
  isApproved: false,
  isRootAdmin: false,
  isAdmin: false,
  isEditor: false,
  isViewer: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function useAuthProvider(): AuthState {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      const p = await authService.getProfile(userId);
      setProfile(p);
    } catch (e) {
      console.error('Error fetching user profile:', e);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfileForUser(user.id);
    }
  }, [user, fetchProfileForUser]);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { session } = await authService.getSession();
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfileForUser(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const { data: { subscription } } = authService.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser(session.user);
          await fetchProfileForUser(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  }, []);

  const role: UserRole = profile?.role || 'VIEWER';
  const approvalStatus: ApprovalStatus = profile?.approval_status || 'PENDING';
  const isAuthenticated = Boolean(user);
  const isApproved = isAuthenticated && approvalStatus === 'APPROVED';
  const isRootAdmin = isApproved && role === 'ROOT_ADMIN';
  const isAdmin = isApproved && (role === 'ROOT_ADMIN' || role === 'ADMIN');
  const isEditor = isApproved && (role === 'ROOT_ADMIN' || role === 'ADMIN' || role === 'EDITOR');
  const isViewer = isApproved;

  return {
    user,
    profile,
    role,
    approvalStatus,
    isLoading,
    isAuthenticated,
    isApproved,
    isRootAdmin,
    isAdmin,
    isEditor,
    isViewer,
    refreshProfile,
    signOut,
  };
}


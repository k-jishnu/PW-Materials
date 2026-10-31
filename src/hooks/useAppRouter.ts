// src/hooks/useAppRouter.ts
//
// Lightweight, zero-dependency browser history router for PW Materials:
// - Supports application routes: /capture, /materials, /export, /settings, /admin/users
// - Supports authentication routes: /login, /signup, /forgot-password, /reset-password, /pending-approval, /access-denied, /auth/callback
// - Preserves browser back / forward buttons
// - Synchronizes with window.location.pathname
// - Supported by Vercel SPA rewrite in vercel.json
//

import { useState, useEffect, useCallback } from 'react';

export type AppRoute =
  | '/capture'
  | '/materials'
  | '/export'
  | '/settings'
  | '/admin/users'
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/reset-password'
  | '/pending-approval'
  | '/access-denied'
  | '/auth/callback';

export type ActiveRoute = AppRoute;

const VALID_ROUTES: AppRoute[] = [
  '/capture',
  '/materials',
  '/export',
  '/settings',
  '/admin/users',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pending-approval',
  '/access-denied',
  '/auth/callback',
];

export function normalizePath(pathname: string): AppRoute {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (VALID_ROUTES.includes(clean as AppRoute)) {
    return clean as AppRoute;
  }
  return '/capture';
}

export function useAppRouter() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/capture';
  });

  const navigate = useCallback((route: AppRoute) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== route) {
        window.history.pushState({}, '', route);
      }
      setCurrentRoute(route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return { currentRoute, navigate };
}

// src/hooks/useAppRouter.ts
//
// Lightweight, zero-dependency browser history router for PW Materials:
// - Supports exactly 4 dedicated routes: /capture, /materials, /export, /settings
// - Preserves browser back / forward buttons
// - Synchronizes with window.location.pathname
// - Supported by Vercel SPA rewrite in vercel.json
//

import { useState, useEffect, useCallback } from 'react';

export type ActiveRoute = '/capture' | '/materials' | '/export' | '/settings';

const VALID_ROUTES: ActiveRoute[] = ['/capture', '/materials', '/export', '/settings'];

function normalizePath(pathname: string): ActiveRoute {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (VALID_ROUTES.includes(clean as ActiveRoute)) {
    return clean as ActiveRoute;
  }
  // Default route is /capture for root / or unknown paths
  return '/capture';
}

export function useAppRouter() {
  const [currentRoute, setCurrentRoute] = useState<ActiveRoute>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/capture';
  });

  const navigate = useCallback((route: ActiveRoute) => {
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

    // If initial pathname was / or something not explicitly /capture, update URL without adding history stack
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/capture');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return { currentRoute, navigate };
}

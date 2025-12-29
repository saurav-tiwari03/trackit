'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const LAST_VISITED_PAGE_KEY = 'trackit-last-visited-page';

// Pages that should not be saved as last visited (auth pages, landing pages, etc.)
const EXCLUDED_PATHS = [
  '/login',
  '/register',
  '/',
  '/privacy',
  '/terms',
  '/features',
  '/pricing',
  '/about',
];

/**
 * Hook to track the last visited page for session restoration
 * Should only be used in authenticated layouts
 */
export function useLastVisitedPageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    
    // Don't save excluded paths
    if (EXCLUDED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      return;
    }

    // Save the current path
    try {
      localStorage.setItem(LAST_VISITED_PAGE_KEY, pathname);
    } catch {
      // localStorage not available (SSR or private browsing)
    }
  }, [pathname]);
}

/**
 * Get the last visited page from localStorage
 * @returns The last visited page path or null if none exists
 */
export function getLastVisitedPage(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const lastPage = localStorage.getItem(LAST_VISITED_PAGE_KEY);
    // Validate it's a valid path (starts with /)
    if (lastPage && lastPage.startsWith('/')) {
      return lastPage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the last visited page from localStorage
 * Useful after redirecting to prevent redirect loops
 */
export function clearLastVisitedPage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LAST_VISITED_PAGE_KEY);
  } catch {
    // localStorage not available
  }
}

/**
 * Hook to get the redirect destination after login
 * Returns the last visited page or default dashboard
 */
export function useLoginRedirect() {
  const getRedirectPath = useCallback(() => {
    const lastPage = getLastVisitedPage();
    // Return last visited page if available, otherwise default to dashboard
    return lastPage || '/dashboard';
  }, []);

  return { getRedirectPath };
}


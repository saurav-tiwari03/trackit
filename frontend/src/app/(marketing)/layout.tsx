'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingNavbar } from '@/components/layout/marketing-navbar';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { SplashScreen } from '@/components/ui/splash-screen';
import { getLastVisitedPage } from '@/hooks/use-last-visited-page';

const SESSION_REDIRECT_KEY = 'trackit-session-redirected';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    
    // Only redirect on initial app load (fresh session), not on intentional navigation
    const hasRedirectedThisSession = sessionStorage.getItem(SESSION_REDIRECT_KEY);
    
    if (token && !hasRedirectedThisSession) {
      // Mark that we've done the initial redirect check for this session
      sessionStorage.setItem(SESSION_REDIRECT_KEY, 'true');
      // User is logged in and this is initial load, redirect to last visited page or dashboard
      const lastPage = getLastVisitedPage();
      router.replace(lastPage || '/dashboard');
    } else {
      // Either not logged in, or user intentionally navigated here
      setIsChecking(false);
    }
  }, [router]);

  // Show splash screen while checking auth status
  if (isChecking) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNavbar />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}

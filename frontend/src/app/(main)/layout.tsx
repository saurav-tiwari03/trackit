'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

function SidebarToggle() {
  const { state, toggleSidebar } = useSidebar();
  
  if (state === 'expanded') return null;
  
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarToggle />
      <SidebarInset className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, checkAuth } = useAuthStore();
  const { fetchProjects } = useProjectsStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    const verifyAuth = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    
    verifyAuth();
  }, [isHydrated, checkAuth]);

  useEffect(() => {
    if (!isHydrated || isChecking) return;
    
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchProjects();
    }
  }, [isAuthenticated, isHydrated, isChecking, router, fetchProjects]);

  if (!isHydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <MainContent>{children}</MainContent>
    </SidebarProvider>
  );
}

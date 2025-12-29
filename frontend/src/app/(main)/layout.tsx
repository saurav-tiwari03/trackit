'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PanelLeft, Menu, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CreateTaskModal } from '@/components/task/create-task-modal';
import { useLastVisitedPageTracker } from '@/hooks/use-last-visited-page';
import { SplashScreen } from '@/components/ui/splash-screen';

function SidebarToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar();

  // On mobile, always show the hamburger menu
  // On desktop, hide this floating button (we'll show one inside the sidebar instead)
  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
    >
      {isMobile ? <Menu className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
    </Button>
  );
}

function FloatingAddButton() {
  const { isMobile } = useSidebar();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pathname = usePathname();

  // Only show on mobile/tablet
  if (!isMobile) return null;
  // Hide on Slack page (we have a dedicated button in the header there)
  if (pathname?.startsWith('/slack')) return null;

  return (
    <>
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-foreground text-background shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        showProjectSelector={true}
      />
    </>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  // Track page visits for session restoration
  useLastVisitedPageTracker();

  return (
    <>
      <SidebarToggle />
      <FloatingAddButton />
      <SidebarInset className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Add top padding on mobile/tablet so content starts below the hamburger menu */}
          <div className="flex-1 overflow-auto pt-14 lg:pt-0">
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
    return <SplashScreen />;
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

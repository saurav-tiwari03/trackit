'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Settings,
  Plus,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  Inbox,
  Bell,
  MessageCircle,
  Trophy,
  StickyNote,
  Flame,
  Zap,
  Crown,
  Sparkles,
  Dumbbell,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import { useNotificationsStore } from '@/store/notifications';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: 'text-blue-500' },
  { icon: Inbox, label: 'Inbox', href: '/inbox', color: 'text-violet-500' },
  { icon: Flame, label: 'Streaks', href: '/streaks', color: 'text-orange-500' },
  { icon: Dumbbell, label: 'FitLog', href: '/fitlog', color: 'text-emerald-500' },
  { icon: CheckSquare, label: 'All Tasks', href: '/tasks', color: 'text-green-500' },
  { icon: Calendar, label: 'Calendar', href: '/calendar', color: 'text-amber-500' },
  { icon: StickyNote, label: 'Notes', href: '/notes', color: 'text-yellow-500' },
  { icon: Trophy, label: 'Achievements', href: '/achievements', color: 'text-teal-500' },
  { icon: MessageCircle, label: 'Slack', href: '/slack', color: 'text-pink-500' },
  { icon: Bell, label: 'Notifications', href: '/notifications', color: 'text-red-500' },
  { icon: Settings, label: 'Settings', href: '/settings', color: 'text-gray-500' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { projects } = useProjectsStore();
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();
  const { toggleSidebar, setOpen, setOpenMobile, isMobile } = useSidebar();
  const [projectsOpen, setProjectsOpen] = useState(true);

  // Auto-collapse on Slack page and expand on hover
  const isSlackPage = pathname === '/slack';

  // Disabled: Lightweight polling for unread count
  // TODO: Re-enable when realtime notifications are implemented
  // useEffect(() => {
  //   void fetchUnreadCount();
  //   const t = window.setInterval(() => void fetchUnreadCount(), 15000);
  //   return () => window.clearInterval(t);
  // }, [fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r overflow-hidden"
      {...(isSlackPage ? {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false)
      } : {})}
    >
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between h-8 group-data-[collapsible=icon]:hidden">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
          >
            <img
              src="/logo.png"
              alt="TrackIt"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-semibold text-lg">TrackIt</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="hidden group-data-[collapsible=icon]:flex h-8 w-8 mx-auto"
        >
          <PanelLeftClose className="h-4 w-4 rotate-180" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.icon className={cn('h-4 w-4', item.color)} />
                      <span>{item.label}</span>
                      {item.href === '/notifications' && unreadCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 px-1.5 group-data-[collapsible=icon]:hidden">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <SidebarGroupLabel asChild>
              <div className="flex w-full items-center justify-between group-data-[collapsible=icon]:justify-center">
                <Link
                  href="/projects"
                  className={cn(
                    "flex items-center gap-2 hover:text-foreground transition-colors",
                    pathname === '/projects' && 'text-foreground'
                  )}
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Projects</span>
                </Link>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="group-data-[collapsible=icon]:hidden"
                    aria-label={projectsOpen ? 'Collapse projects' : 'Expand projects'}
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        projectsOpen && 'rotate-90'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </SidebarGroupLabel>
            <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuSub>
                    {projects
                      .filter((project) => project.name !== 'Inbox')
                      .map((project) => (
                        <SidebarMenuSubItem key={project._id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === `/projects/${project._id}`}
                          >
                            <Link
                              href={`/projects/${project._id}`}
                              onClick={() => {
                                if (isMobile) setOpenMobile(false);
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="truncate">{project.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link
                          href="/projects/new"
                          className="text-muted-foreground"
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Project</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        {/* Upgrade Banner for Free Users */}
        {(!user?.subscriptionPlan || user.subscriptionPlan === 'free') && (
          <div className="mb-2 group-data-[collapsible=icon]:hidden">
            <Link
              href="/upgrade"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all group/upgrade"
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Upgrade to Plus</p>
                <p className="text-xs text-muted-foreground">Unlock all features</p>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-500 group-hover/upgrade:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full cursor-pointer py-4">
                  <Avatar className="h-6 w-6">
                    {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                    <AvatarFallback className="text-xs">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      {/* Subscription Badge */}
                      {user?.subscriptionPlan === 'plus' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                          <Zap className="h-2.5 w-2.5" />
                          PLUS
                        </span>
                      )}
                      {user?.subscriptionPlan === 'pro' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          <Crown className="h-2.5 w-2.5" />
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {/* Subscription Status in Dropdown */}
                <div className="px-2 py-1.5 mb-1">
                  <div className="flex items-center gap-2">
                    {user?.subscriptionPlan === 'plus' ? (
                      <>
                        <Zap className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Plus Member</span>
                      </>
                    ) : user?.subscriptionPlan === 'pro' ? (
                      <>
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Pro Member</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Free Plan</span>
                      </>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/pricing"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {user?.subscriptionPlan === 'free' || !user?.subscriptionPlan ? 'Upgrade Plan' : 'Manage Plan'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (isMobile) setOpenMobile(false);
                  handleLogout();
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

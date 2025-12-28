'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Dot, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useNotificationsStore } from '@/store/notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { projectsAPI } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useProjectsStore } from '@/store/projects';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function NotificationsPage() {
  const { items, unreadCount, isLoading, fetchNotifications, markRead, markAllRead, clearAll } =
    useNotificationsStore();
  const { fetchProjects } = useProjectsStore();
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean;
    projectId?: string;
    action?: 'accept' | 'reject';
  }>({ open: false });
  const [isActing, setIsActing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    void fetchNotifications({ limit: 50 });
  }, [fetchNotifications]);

  const inviteProjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(n => {
      const pid = typeof n.project === 'string' ? n.project : n.project?._id;
      const pname =
        typeof n.project === 'string'
          ? undefined
          : n.project?.name;
      if (pid && pname) map.set(pid, pname);
    });
    return map;
  }, [items]);

  const performInviteAction = async () => {
    if (!inviteDialog.projectId || !inviteDialog.action) return;
    setIsActing(true);
    try {
      if (inviteDialog.action === 'accept') {
        await projectsAPI.acceptInvite(inviteDialog.projectId);
        toast.success('Invite accepted');
        await fetchProjects();
      } else {
        await projectsAPI.rejectInvite(inviteDialog.projectId);
        toast.success('Invite rejected');
      }
      setInviteDialog({ open: false });
      await fetchNotifications({ limit: 50 });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Action failed';
      toast.error(message);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h1 className="text-xl sm:text-2xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">({unreadCount} unread)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={items.length === 0}
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-12">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const isUnread = !n.readAt;
              const projectId = typeof n.project === 'string' ? n.project : n.project?._id;
              const href =
                n.type === 'mention' && projectId ? `/projects/${projectId}` : '/projects';

              const isInvite = n.type === 'project_invite' && !!projectId;

              const CardInner = (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isUnread ? (
                      <Dot className="h-6 w-6 text-primary" />
                    ) : (
                      <Dot className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isUnread && 'text-foreground'
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                    )}

                    {isInvite && (
                      <div className="mt-3">
                        {n.inviteStatus === 'accepted' ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              You accepted {n.actor?.name ? `${n.actor.name}'s` : 'the'} invite to{' '}
                              {typeof n.project === 'object' ? n.project.name : 'this project'}
                            </span>
                          </div>
                        ) : n.inviteStatus === 'rejected' ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              You declined {n.actor?.name ? `${n.actor.name}'s` : 'the'} invite to{' '}
                              {typeof n.project === 'object' ? n.project.name : 'this project'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInviteDialog({ open: true, projectId, action: 'accept' });
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInviteDialog({ open: true, projectId, action: 'reject' });
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );

              if (isInvite) {
                return (
                  <div
                    key={n._id}
                    className={cn(
                      'rounded-2xl border border-border/50 bg-card/40 p-4',
                      isUnread && 'ring-1 ring-primary/30'
                    )}
                  >
                    {CardInner}
                  </div>
                );
              }

              return (
                <Link
                  key={n._id}
                  href={href}
                  onClick={() => {
                    if (isUnread) void markRead(n._id);
                  }}
                  className={cn(
                    'block rounded-2xl border border-border/50 bg-card/40 p-4 hover:bg-muted/20 transition-colors',
                    isUnread && 'ring-1 ring-primary/30'
                  )}
                >
                  {CardInner}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={inviteDialog.open}
        onOpenChange={(open) => setInviteDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {inviteDialog.action === 'accept' ? 'Accept invite?' : 'Reject invite?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inviteDialog.projectId
                ? `Project: ${inviteProjectNameById.get(inviteDialog.projectId) || 'Project'}`
                : 'Project invite'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performInviteAction}
              disabled={isActing}
              className={cn(inviteDialog.action === 'reject' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {isActing
                ? 'Please wait…'
                : inviteDialog.action === 'accept'
                  ? 'Accept'
                  : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notifications</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await clearAll();
                  toast.success('Notifications deleted');
                  setClearDialogOpen(false);
                } catch (error: any) {
                  const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Failed to delete notifications';
                  toast.error(message);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Palette, Shield, LogOut, Calendar, Check, Loader2, ExternalLink, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { calendarAPI } from '@/lib/api';
import { toast } from 'sonner';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Google Calendar state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [isLoadingCalendarStatus, setIsLoadingCalendarStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check for OAuth callback result
  useEffect(() => {
    const googleCalendarParam = searchParams.get('google_calendar');
    const errorParam = searchParams.get('error');

    if (googleCalendarParam === 'connected') {
      toast.success('Google Calendar connected successfully!');
      // Remove query params from URL
      router.replace('/settings', { scroll: false });
      // Refresh status
      fetchGoogleCalendarStatus();
    } else if (errorParam) {
      toast.error('Failed to connect Google Calendar. Please try again.');
      router.replace('/settings', { scroll: false });
    }
  }, [searchParams, router]);

  // Fetch Google Calendar connection status
  const fetchGoogleCalendarStatus = async () => {
    try {
      setIsLoadingCalendarStatus(true);
      const response = await calendarAPI.getGoogleStatus();
      setGoogleCalendarStatus(response.data.data);
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    } finally {
      setIsLoadingCalendarStatus(false);
    }
  };

  useEffect(() => {
    fetchGoogleCalendarStatus();
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnecting(true);
      const response = await calendarAPI.getGoogleAuthUrl();
      const { authUrl } = response.data.data;
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      toast.error('Failed to initiate Google Calendar connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      setIsDisconnecting(true);
      await calendarAPI.disconnectGoogle();
      setGoogleCalendarStatus({ connected: false, email: null });
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const settingsSections = [
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your personal information',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure notification preferences',
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel',
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Manage your account security',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid gap-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Google Calendar Integration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Calendar Integrations
                </CardTitle>
                <CardDescription>
                  Connect your calendar to sync events and stay organized
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-4">
                    {/* Google Calendar Logo */}
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm border">
                      <svg viewBox="0 0 24 24" className="w-8 h-8">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">Google Calendar</h3>
                      {isLoadingCalendarStatus ? (
                        <p className="text-sm text-muted-foreground">
                          Checking connection status...
                        </p>
                      ) : googleCalendarStatus?.connected ? (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            Connected as {googleCalendarStatus.email}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Sync your Google Calendar events
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoadingCalendarStatus ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : googleCalendarStatus?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectGoogleCalendar}
                        disabled={isDisconnecting}
                        className="gap-2"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConnectGoogleCalendar}
                        disabled={isConnecting}
                        size="sm"
                        className="gap-2"
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Other Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {settingsSections.slice(1).map((section, index) => (
              <Card key={section.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Actions here are irreversible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}


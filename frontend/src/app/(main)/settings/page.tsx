'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Palette, Shield, LogOut, Calendar, Check, Loader2, ExternalLink, Unlink, Camera, Trash2, Zap, Crown, Sparkles, CreditCard, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { calendarAPI, usersAPI, paymentsAPI } from '@/lib/api';
import { Transaction } from '@/types';
import Link from 'next/link';
import { toast } from 'sonner';
import { PushNotificationSettings } from '@/components/settings/push-notification-settings';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, refreshUser, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile update state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  // Google Calendar state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [isLoadingCalendarStatus, setIsLoadingCalendarStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Subscription state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

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
    // Refresh user data to get latest subscription status
    refreshUser();
    fetchGoogleCalendarStatus();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      const response = await paymentsAPI.getTransactions({ limit: 5 });
      setTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toFixed(0)}`;
  };

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

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const response = await usersAPI.updateProfile({ name });
      // Update user state directly
      updateUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const response = await usersAPI.uploadAvatar(file);
      const newAvatar = response.data.data.avatar;
      setAvatar(newAvatar);
      // Update user state directly
      updateUser({ avatar: newAvatar });
      toast.success('Profile picture updated');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsRemovingAvatar(true);
      await usersAPI.removeAvatar();
      setAvatar('');
      // Update user state directly
      updateUser({ avatar: '' });
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                      {avatar ? (
                        <AvatarImage src={avatar} alt={name} />
                      ) : null}
                      <AvatarFallback
                        className="text-2xl"
                        style={{
                          backgroundColor: name ? `hsl(${(name.charCodeAt(0) * 37) % 360}, 70%, 50%)` : undefined,
                          color: 'white',
                        }}
                      >
                        {name ? getInitials(name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Upload overlay */}
                    <button
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">
                      Click on the avatar to upload a new picture
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 mr-2" />
                        )}
                        Upload
                      </Button>
                      {avatar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isRemovingAvatar}
                          className="text-destructive hover:text-destructive"
                        >
                          {isRemovingAvatar ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name & Email Section */}
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
                      disabled
                      className="bg-muted"
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
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

          {/* Subscription Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription plan and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-muted/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm ${
                      user?.subscriptionPlan === 'pro' 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                        : user?.subscriptionPlan === 'plus' 
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {user?.subscriptionPlan === 'pro' ? (
                        <Crown className="w-6 h-6 text-white" />
                      ) : user?.subscriptionPlan === 'plus' ? (
                        <Zap className="w-6 h-6 text-white" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user?.subscriptionPlan === 'pro' ? 'Pro Plan' : user?.subscriptionPlan === 'plus' ? 'Plus Plan' : 'Free Plan'}
                      </h3>
                      {user?.subscriptionExpiresAt && user?.subscriptionPlan !== 'free' ? (
                        <p className="text-sm text-muted-foreground">
                          Renews on {formatDate(user.subscriptionExpiresAt)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {user?.subscriptionPlan === 'free' || !user?.subscriptionPlan ? 'Upgrade to unlock all features' : 'Active subscription'}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button asChild variant={user?.subscriptionPlan === 'free' || !user?.subscriptionPlan ? 'default' : 'outline'}>
                    <Link href="/pricing">
                      {user?.subscriptionPlan === 'free' || !user?.subscriptionPlan ? (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade
                        </>
                      ) : (
                        'Manage Plan'
                      )}
                    </Link>
                  </Button>
                </div>

                {/* Payment History */}
                {transactions.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Receipt className="w-4 h-4" />
                      Recent Transactions
                    </h4>
                    <div className="space-y-2">
                      {isLoadingTransactions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        transactions.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-500' :
                                transaction.status === 'pending' ? 'bg-yellow-500' :
                                transaction.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">
                                  {transaction.plan.charAt(0).toUpperCase() + transaction.plan.slice(1)} Plan
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {formatAmount(transaction.amount)}
                              </p>
                              <p className={`text-xs capitalize ${
                                transaction.status === 'completed' ? 'text-green-600' :
                                transaction.status === 'pending' ? 'text-yellow-600' :
                                transaction.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {transaction.status}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Push Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PushNotificationSettings />
          </motion.div>

          {/* Other Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {settingsSections.slice(2).map((section) => (
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
            transition={{ delay: 0.3 }}
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


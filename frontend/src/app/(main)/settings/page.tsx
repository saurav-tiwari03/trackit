'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Palette, Shield, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

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

          {/* Other Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
            transition={{ delay: 0.2 }}
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


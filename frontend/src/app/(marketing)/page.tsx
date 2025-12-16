'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell,
  Calendar,
  CheckSquare,
  FolderKanban,
  Inbox,
  Paperclip,
  Tag,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import DotBackgroundDemo from '@/components/ui/dot-background-demo';

export default function Home() {
  const { isHydrated, checkAuth } = useAuthStore();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    void checkAuth();
  }, [checkAuth, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    // If token exists, show “View Dashboard” CTAs.
    // We intentionally avoid auto-redirect from landing.
    setHasToken(!!localStorage.getItem('token'));
  }, [isHydrated]);

  const primaryCta = hasToken ? (
    <Button asChild size="lg">
      <Link href="/dashboard">View dashboard</Link>
    </Button>
  ) : (
    <Button asChild size="lg">
      <Link href="/register">Create your account</Link>
    </Button>
  );

  const secondaryCta = hasToken ? null : (
    <Button asChild size="lg" variant="secondary">
      <Link href="/login">Sign in</Link>
    </Button>
  );

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-foreground rounded-full mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: 'TrackIt',
                  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                  logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logo.png`,
                },
                {
                  '@type': 'WebSite',
                  name: 'TrackIt',
                  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                },
              ],
            },
            null,
            0
          ),
        }}
      />

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 px-6 py-12 sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="h-full w-full translate-y-40 opacity-70">
              <DotBackgroundDemo />
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Minimal task manager with team features
            </div>

            <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              A clean workspace for tasks that actually gets used.
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              TrackIt combines a focused inbox, projects, calendar scheduling, attachments, mentions,
              and notifications—without the noise.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {primaryCta}
              {secondaryCta}
            </div>
          </motion.div>
        </div>

        {/* Product preview */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card/40 p-3 overflow-hidden">
            <div className="px-2 pt-2 pb-3">
              <div className="text-sm font-medium">Dashboard</div>
              <div className="text-xs text-muted-foreground mt-1">
                Your tasks, projects, and calendar in one place.
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border/50 bg-background">
              <Image
                src="/dashboard.png"
                alt="TrackIt dashboard preview"
                width={1400}
                height={900}
                priority
                className="w-full h-auto"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-3 overflow-hidden">
            <div className="px-2 pt-2 pb-3">
              <div className="text-sm font-medium">Mobile view</div>
              <div className="text-xs text-muted-foreground mt-1">
                Fast capture and edits on the go.
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border/50 bg-background">
              <Image
                src="/mobile-view.png"
                alt="TrackIt mobile preview"
                width={900}
                height={1400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">Features</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Everything you need today. Nothing you don’t.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Feature
              icon={Inbox}
              title="Inbox"
              desc="Capture tasks fast. Sort later."
            />
            <Feature
              icon={FolderKanban}
              title="Projects + sections"
              desc="Organize work with simple sections."
            />
            <Feature
              icon={CheckSquare}
              title="Task details"
              desc="Subtasks, labels, due date & time."
            />
            <Feature
              icon={Calendar}
              title="Calendar scheduling"
              desc="Plan your day visually."
            />
            <Feature
              icon={Paperclip}
              title="Attachments"
              desc="Upload PDFs/images with preview."
            />
            <Feature
              icon={Users}
              title="Team collaboration"
              desc="Invite members and mention them in comments."
            />
            <Feature
              icon={Bell}
              title="Notifications"
              desc="Invites and @mentions in one place."
            />
            <Feature
              icon={Tag}
              title="Personal labels"
              desc="Your own label library, per user."
            />
          </div>
        </div>

        {/* Upcoming */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-semibold">Upcoming</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A few improvements already planned.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Upcoming title="Realtime notifications" desc="No polling—instant updates." />
            <Upcoming title="Recurring tasks" desc="Daily/weekly/monthly routines." />
            <Upcoming title="Advanced search & filters" desc="Find anything in seconds." />
            <Upcoming title="Calendar integrations" desc="Sync with external calendars." />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function Upcoming({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

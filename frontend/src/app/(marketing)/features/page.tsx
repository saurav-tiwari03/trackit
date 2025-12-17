import type { Metadata } from 'next';
import Link from 'next/link';
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

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Explore TrackIt features: inbox, projects, calendar scheduling, attachments, mentions, and notifications.',
  alternates: {
    canonical: '/features',
  },
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Features</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              TrackIt keeps the workflow simple: capture in Inbox, organize into projects,
              schedule work, and collaborate with your team.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">Features</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            icon={Inbox}
            title="Inbox"
            desc="Quickly capture tasks that don’t belong to a project yet. Keep momentum, clean later."
          />
          <FeatureCard
            icon={FolderKanban}
            title="Projects + sections"
            desc="Organize tasks by project and move them across sections for a clear workflow."
          />
          <FeatureCard
            icon={CheckSquare}
            title="Task details"
            desc="Subtasks, labels, comments, and a responsive task modal built for speed."
          />
          <FeatureCard
            icon={Calendar}
            title="Calendar scheduling"
            desc="Assign due date & time and view tasks on a calendar to plan your day."
          />
          <FeatureCard
            icon={Paperclip}
            title="Attachments"
            desc="Upload PDFs/images and preview inside the task without leaving the app."
          />
          <FeatureCard
            icon={Users}
            title="Invites"
            desc="Invite users to projects. Invites require accept/reject before access is granted."
          />
          <FeatureCard
            icon={Bell}
            title="Notifications"
            desc="Get notified for invites and @mentions. Keep collaboration lightweight and clear."
          />
          <FeatureCard
            icon={Tag}
            title="Personal labels"
            desc="Each user has their own label library—no messy shared label spam."
          />
        </div>

        <div className="mt-10 rounded-2xl border border-border/50 bg-card/40 p-6">
          <h2 className="text-lg font-semibold">Want a fast workflow?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Read our guide on using TrackIt efficiently.
          </p>
          <Link
            href="/task-management"
            className="inline-flex mt-4 text-sm font-medium hover:underline"
          >
            Open Task Management guide →
          </Link>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
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

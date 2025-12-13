import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Task Management Guide',
  description:
    'Learn how to use TrackIt efficiently: Inbox capture, projects, sections, labels, due dates, calendar, and collaboration.',
};

export default function TaskManagementPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Task Management Guide
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A simple workflow to stay consistent and get things done.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Task Management</span>
          </div>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">1) Capture in Inbox</h2>
            <p className="mt-2 text-muted-foreground">
              Whenever something pops up, add it to Inbox. Don’t decide where it
              belongs yet—just capture.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Keep tasks short and actionable.</li>
              <li>Use labels only if it helps your search later.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">2) Organize into Projects</h2>
            <p className="mt-2 text-muted-foreground">
              Create projects for areas of work (e.g., Portfolio, Modora). Use
              sections like To Do / In Progress / Completed.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Keep the number of projects small.</li>
              <li>Use sections to reflect your workflow.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">3) Break down tasks with Subtasks</h2>
            <p className="mt-2 text-muted-foreground">
              If a task is vague or big, add subtasks so you always know the next
              action.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Prefer 3–7 subtasks max for clarity.</li>
              <li>Check off as you go to build momentum.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">4) Use Due Date & Time deliberately</h2>
            <p className="mt-2 text-muted-foreground">
              Only assign due dates when there’s a real deadline. Use time when
              the task is scheduled.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Deadlines → due date.</li>
              <li>Scheduled work → due date + time.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">5) Plan in Calendar</h2>
            <p className="mt-2 text-muted-foreground">
              Use Calendar to see what’s due and to distribute work across the
              week.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Keep your day view realistic.</li>
              <li>Reschedule instead of overloading.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">6) Collaborate</h2>
            <p className="mt-2 text-muted-foreground">
              Invite teammates to a project. Use @mentions in comments to bring
              attention to updates.
            </p>
            <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Invites require accept/reject.</li>
              <li>@mentions trigger notifications.</li>
              <li>Keep comments short and specific.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h2 className="text-base font-semibold">7) Weekly reset</h2>
            <p className="mt-2 text-muted-foreground">
              Once a week, review Inbox, update statuses, and clean up overdue
              tasks.
            </p>
          </section>

          <div className="text-sm text-muted-foreground">
            Also see: <Link href="/features" className="hover:underline">Features</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

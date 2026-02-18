import { Metadata } from 'next';
import { Calendar, Sparkles, Bug, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Release Notes | trackIt - Latest Updates & Features',
  description:
    'Stay updated with the latest trackIt features, improvements, and bug fixes. See what\'s new in your personal progress tracker.',
  keywords: [
    'trackit updates',
    'trackit release notes',
    'trackit changelog',
    'new features',
    'app updates',
  ],
  openGraph: {
    title: 'Release Notes - trackIt Updates',
    description: 'Discover the latest features and improvements in trackIt.',
    url: 'https://trackit.app/release-notes',
  },
  alternates: {
    canonical: '/release-notes',
  },
};

// Release notes data - add new releases at the top
const releases = [
  {
    version: '2.11.0',
    date: 'February 6, 2026',
    title: 'trackIt Rebrand & Lists UX',
    type: 'major',
    changes: [
      {
        type: 'improvement',
        title: 'Lists: Add item at top and after last item',
        description: 'In the Lists kanban view, "Add item" now appears at the top of each column and again after the last list item for a clearer, more convenient flow.',
      },
    ],
  },
  {
    version: '2.10.0',
    date: 'February 3, 2026',
    title: 'AI Movie Recommendations (Gemini)',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'AI Recommendation button on Movies',
        description: 'Get a personalized movie or series suggestion based on your watched history. Choose Movie, Series, or Surprise Me.',
      },
      {
        type: 'feature',
        title: 'Bring your own Gemini API key',
        description: 'Add your Gemini API key in Settings and select a preferred model. Keys are stored per user and used for all recommendation calls.',
      },
      {
        type: 'feature',
        title: 'Save recommendations to Wishlist',
        description: 'Like the recommendation but not ready to watch? Save it to your Watchlist with one click.',
      },
      {
        type: 'improvement',
        title: 'No-repeat recommendations',
        description: 'Trying again won’t re-suggest previously shown picks. We track shown recommendations and automatically exclude them from future results.',
      },
      {
        type: 'improvement',
        title: 'Enhanced recommendation animations',
        description: 'Upgraded loading and result animations for a smoother, more delightful recommendation experience.',
      },
    ],
  },
  {
    version: '2.9.0',
    date: 'February 1, 2026',
    title: 'Movie Timeline - Track Your Cinematic Journey',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Movie Timeline',
        description: 'Track movies you\'ve watched, are currently watching, and plan to watch. Your personal movie diary with beautiful timeline views.',
      },
      {
        type: 'feature',
        title: 'TMDB Integration',
        description: 'Search and add movies from The Movie Database. Auto-fetch posters, ratings, runtime, genres, and more.',
      },
      {
        type: 'feature',
        title: 'Manual Movie Entry',
        description: 'Can\'t find a movie in TMDB? Add it manually with custom poster URL, genres, runtime, and reviews.',
      },
      {
        type: 'feature',
        title: 'Multiple View Modes',
        description: 'View your movies in Grid, List, or Timeline views. Timeline groups watched movies by month for easy browsing.',
      },
      {
        type: 'feature',
        title: 'Smart Filters',
        description: 'Filter by status (Watched, Watching, Watchlist) or view only your Favorites. Each filter shows count badges.',
      },
      {
        type: 'feature',
        title: 'Personal Ratings & Reviews',
        description: 'Rate movies on a 1-10 scale and write personal reviews. Track your opinions alongside TMDB ratings.',
      },
      {
        type: 'feature',
        title: 'Platform Tracking',
        description: 'Remember where you watched each movie - Netflix, Prime, Disney+, HBO, Apple TV+, Theater, or Blu-ray.',
      },
      {
        type: 'feature',
        title: 'Favorites Collection',
        description: 'Mark movies as favorites with a heart icon. Quick toast notifications confirm your selections.',
      },
      {
        type: 'improvement',
        title: 'Watch Time Statistics',
        description: 'Dashboard shows total watch time in hours and minutes format (e.g., "1h 44m" instead of just hours).',
      },
      {
        type: 'improvement',
        title: 'Calendar Date Picker',
        description: 'Pick watch dates with a calendar dropdown featuring Today and Yesterday quick-select buttons.',
      },
    ],
  },
  {
    version: '2.8.0',
    date: 'January 14, 2026',
    title: 'Enhanced Inbox & Whiteboard with SSR',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Server-Side Rendering (SSR)',
        description: 'Improved page load performance with server-side rendering. Faster initial page loads and better SEO optimization.',
      },
      {
        type: 'feature',
        title: 'Redesigned Inbox with Multiple Views',
        description: 'New inbox experience with Grid, Board, Schedule, and Charts views. Switch between views with smooth animations.',
      },
      {
        type: 'feature',
        title: 'Kanban Board View',
        description: 'Visualize tasks in a Kanban-style board with drag-and-drop. Group by bucket, priority, progress, or due date.',
      },
      {
        type: 'feature',
        title: 'Custom Whiteboard Canvas',
        description: 'Draw shapes, arrows, freehand sketches, and add text with a hand-drawn style. Built with Rough.js for that authentic sketchy look.',
      },
      {
        type: 'feature',
        title: 'Attachment Preview Modal',
        description: 'Preview images, videos, and PDFs directly in the app without switching tabs. Full PDF viewer with page navigation.',
      },
      {
        type: 'feature',
        title: 'Whiteboard Icon Library',
        description: 'Insert icons from popular libraries directly onto your whiteboard. Search and browse thousands of icons.',
      },
      {
        type: 'improvement',
        title: 'Draggable Toolbar',
        description: 'Position the whiteboard toolbar on any edge - top, bottom, left, or right. Collapsible design saves screen space.',
      },
      {
        type: 'improvement',
        title: 'Custom Drawing Cursors',
        description: 'Tool-specific cursors for pen, eraser, shapes, and more. Visual feedback that matches your current tool.',
      },
      {
        type: 'improvement',
        title: 'Smooth View Transitions',
        description: 'AnimatePresence-powered transitions when switching between inbox views. No more jarring layout shifts.',
      },
      {
        type: 'bugfix',
        title: 'Attachment URL Loading',
        description: 'Fixed issue where attachment thumbnails would show broken images before signed URLs loaded.',
      },
    ],
  },
  {
    version: '2.7.0',
    date: 'January 3, 2026',
    title: 'FitLog - Complete Fitness Tracking',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'FitLog Dashboard',
        description: 'Track your fitness journey with calories, protein, weight, and workouts all in one place.',
      },
      {
        type: 'feature',
        title: 'Meal-Based Nutrition Logging',
        description: 'Log individual meals (breakfast, lunch, dinner, snacks) with automatic macro totals calculation.',
      },
      {
        type: 'feature',
        title: 'Multiple Workouts Per Day',
        description: 'Log multiple workout sessions per day - morning cardio, evening weights, and more.',
      },
      {
        type: 'feature',
        title: 'Personalized Goals Calculator',
        description: 'Set your fitness goal (lose weight, maintain, gain muscle) and get personalized calorie and macro targets.',
      },
      {
        type: 'feature',
        title: 'Weight History Tracking',
        description: 'Track weight over time with visual charts, trend indicators, and progress summary.',
      },
      {
        type: 'feature',
        title: 'Exercise Logging',
        description: 'Log exercises with sets, reps, and weights. Track your progress on each exercise.',
      },
      {
        type: 'improvement',
        title: 'Smart Macro Calculation',
        description: 'Uses Mifflin-St Jeor equation with activity multipliers for accurate TDEE and macro recommendations.',
      },
    ],
  },
  {
    version: '2.6.0',
    date: 'January 2, 2026',
    title: 'Folder Management & Note Downloads',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Folder Management for Notes',
        description: 'Organize your notes into folders with full CRUD support. Create, rename, and delete folders easily.',
      },
      {
        type: 'feature',
        title: 'Nested Folders',
        description: 'Create folders inside folders for better organization. Expand and collapse folder trees with a single click.',
      },
      {
        type: 'feature',
        title: 'Move Notes to Folders',
        description: 'Easily move notes between folders using the new "Move to folder" option in the note menu.',
      },
      {
        type: 'feature',
        title: 'Download Notes as .txt',
        description: 'Export any note as a plain text file with a single click. Perfect for backups and sharing.',
      },
      {
        type: 'improvement',
        title: 'Mobile Folder Sidebar',
        description: 'Access your folder structure on mobile with the new "Folders" drawer. Manage folders on the go.',
      },
      {
        type: 'improvement',
        title: 'Better Note Card Layout',
        description: 'Improved note card footer with folder name and timestamp displayed clearly without overlap.',
      },
    ],
  },
  {
    version: '2.5.0',
    date: 'December 31, 2025',
    title: 'Razorpay Payments & Habit Tracker Improvements',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Razorpay Payment Integration',
        description: 'Subscribe to Plus or Pro plans with secure UPI, card, and netbanking payments via Razorpay.',
      },
      {
        type: 'feature',
        title: 'Enhanced Habit Tracker Page',
        description: 'New SEO-optimized habit tracker landing page with streak previews and feature highlights.',
      },
      {
        type: 'feature',
        title: 'Subscription Management',
        description: 'View and manage your subscription status, billing history, and plan details in settings.',
      },
      {
        type: 'improvement',
        title: 'Updated Navigation',
        description: 'Refreshed marketing navigation with quick access to Features, Habit Tracker, Pricing, and more.',
      },
      {
        type: 'improvement',
        title: 'New Logo Design',
        description: 'Updated logo with cleaner design across all marketing pages.',
      },
    ],
  },
  {
    version: '2.4.0',
    date: 'December 15, 2025',
    title: 'Google Calendar Sync & Notifications',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Google Calendar Integration',
        description: 'Sync your tasks and events with Google Calendar. Two-way sync keeps everything up to date.',
      },
      {
        type: 'feature',
        title: 'Push Notifications',
        description: 'Get reminded about tasks, habits, and deadlines with browser push notifications.',
      },
      {
        type: 'feature',
        title: 'Habit Reminders',
        description: 'Set daily reminders for your habits. Never miss a streak again!',
      },
      {
        type: 'bugfix',
        title: 'Calendar View Fixes',
        description: 'Fixed issues with tasks not showing on correct dates in calendar view.',
      },
    ],
  },
  {
    version: '2.3.0',
    date: 'November 28, 2025',
    title: 'Streaks & Achievement System',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Streak Tracking',
        description: 'Track consecutive days of habit completion with visual streak counters.',
      },
      {
        type: 'feature',
        title: 'Achievement Badges',
        description: 'Earn badges for milestones like 7-day streaks, 30-day streaks, and more.',
      },
      {
        type: 'improvement',
        title: 'Habit Analytics',
        description: 'View completion rates and patterns with new habit analytics dashboard.',
      },
    ],
  },
  {
    version: '2.2.0',
    date: 'November 10, 2025',
    title: 'Notes & Rich Text Editor',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'Notes Feature',
        description: 'Create and organize notes with a powerful rich text editor supporting formatting, lists, and more.',
      },
      {
        type: 'feature',
        title: 'Note Organization',
        description: 'Organize notes with folders, tags, and quick search functionality.',
      },
      {
        type: 'improvement',
        title: 'Dark Mode Improvements',
        description: 'Enhanced dark mode with better contrast and readability.',
      },
    ],
  },
  {
    version: '2.1.0',
    date: 'October 25, 2025',
    title: 'Project Management Updates',
    type: 'minor',
    changes: [
      {
        type: 'feature',
        title: 'Project Templates',
        description: 'Create projects from templates to get started quickly.',
      },
      {
        type: 'improvement',
        title: 'Drag & Drop Tasks',
        description: 'Reorder tasks and move between projects with drag and drop.',
      },
      {
        type: 'bugfix',
        title: 'Due Date Timezone Fix',
        description: 'Fixed issue where due dates could shift by one day in certain timezones.',
      },
    ],
  },
  {
    version: '2.0.0',
    date: 'October 1, 2025',
    title: 'TrackIt 2.0 - Complete Redesign',
    type: 'major',
    changes: [
      {
        type: 'feature',
        title: 'New Dashboard',
        description: 'Completely redesigned dashboard with quick overview of tasks, habits, and upcoming deadlines.',
      },
      {
        type: 'feature',
        title: 'Habit Tracking',
        description: 'New habit tracking feature to build and maintain daily routines.',
      },
      {
        type: 'feature',
        title: 'Inbox Capture',
        description: 'Quick capture tasks to inbox for later organization.',
      },
      {
        type: 'improvement',
        title: 'Performance Improvements',
        description: '50% faster load times and smoother animations throughout the app.',
      },
    ],
  },
];

function getChangeIcon(type: string) {
  switch (type) {
    case 'feature':
      return <Sparkles className="w-4 h-4 text-green-500" />;
    case 'improvement':
      return <Zap className="w-4 h-4 text-blue-500" />;
    case 'bugfix':
      return <Bug className="w-4 h-4 text-orange-500" />;
    default:
      return <Sparkles className="w-4 h-4 text-gray-500" />;
  }
}

function getChangeLabel(type: string) {
  switch (type) {
    case 'feature':
      return 'New Feature';
    case 'improvement':
      return 'Improvement';
    case 'bugfix':
      return 'Bug Fix';
    default:
      return 'Update';
  }
}

function getChangeBadgeColor(type: string) {
  switch (type) {
    case 'feature':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'improvement':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'bugfix':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

export default function ReleaseNotesPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-500 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Changelog
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Release Notes</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and bug fixes
            in trackIt. We&apos;re constantly working to make your experience better.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />

          {/* Releases */}
          <div className="space-y-12">
            {releases.map((release, index) => (
              <article key={release.version} className="relative">
                {/* Timeline dot */}
                <div className="absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 border-4 border-background hidden md:block" />

                <div className="md:ml-16">
                  {/* Version header */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-sm font-semibold">
                      v{release.version}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {release.date}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        Latest
                      </span>
                    )}
                  </div>

                  {/* Release title */}
                  <h2 className="text-2xl font-bold mb-6">{release.title}</h2>

                  {/* Changes */}
                  <div className="space-y-4">
                    {release.changes.map((change, changeIndex) => (
                      <div
                        key={changeIndex}
                        className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getChangeIcon(change.type)}</div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold">{change.title}</h3>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${getChangeBadgeColor(
                                  change.type
                                )}`}
                              >
                                {getChangeLabel(change.type)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-muted/50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold mb-2">Want to try these features?</h3>
          <p className="text-muted-foreground mb-6">
            Sign up for free and start tracking your tasks and habits today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}


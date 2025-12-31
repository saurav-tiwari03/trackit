import { Metadata } from 'next';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  Calendar,
  Bell,
  Trophy,
  Flame,
  CheckCircle2,
  BarChart3,
  Smartphone,
  Zap,
  Clock,
  RefreshCw,
} from 'lucide-react';

// SEO Metadata - optimized for habit tracker keywords
export const metadata: Metadata = {
  title: 'Free Habit Tracker App | Build Better Habits Daily - TrackIt',
  description:
    'Track your daily habits and build lasting routines with TrackIt. Free habit tracker with streaks, reminders, analytics & progress tracking. Start building better habits today!',
  keywords: [
    'habit tracker',
    'habit tracker app',
    'free habit tracker',
    'daily habit tracker',
    'habit tracking app',
    'habit builder',
    'routine tracker',
    'streak tracker',
    'habit journal',
    'habit tracker online',
    'best habit tracker',
    'habit tracker free',
    'daily routine tracker',
    'habit forming app',
    'habit goal tracker',
    'morning routine tracker',
    'habit streak app',
    'productivity habits',
    'habit tracker india',
  ],
  openGraph: {
    title: 'Free Habit Tracker App - Build Better Habits | TrackIt',
    description:
      'Track daily habits, maintain streaks, and build lasting routines. Free habit tracker with reminders, analytics, and achievement badges.',
    url: 'https://trackit.app/habit-tracker',
    siteName: 'TrackIt',
    images: [
      {
        url: '/og-habit-tracker.png',
        width: 1200,
        height: 630,
        alt: 'TrackIt Habit Tracker - Build Better Habits',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Habit Tracker App - Build Better Habits',
    description:
      'Track daily habits, maintain streaks, and achieve your goals with TrackIt.',
    images: ['/og-habit-tracker.png'],
  },
  alternates: {
    canonical: '/habit-tracker',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Features data
const features = [
  {
    icon: Flame,
    title: 'Streak Tracking',
    description:
      'Build momentum with visual streak counters. See how many days in a row you have maintained each habit.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description:
      'Never miss a habit with customizable daily reminders. Set the perfect time for each habit.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    description:
      'Visualize your progress with detailed charts and statistics. Track completion rates over time.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Trophy,
    title: 'Achievement Badges',
    description:
      'Earn badges and unlock achievements as you build consistent habits. Gamify your progress!',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Calendar,
    title: 'Calendar View',
    description:
      'See your habit history in a beautiful calendar view. Identify patterns and stay motivated.',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description:
      'Set daily, weekly, or custom frequency goals for each habit. Track progress toward your targets.',
    color: 'from-pink-500 to-rose-500',
  },
];

// Benefits data
const benefits = [
  {
    icon: TrendingUp,
    title: 'Build Lasting Habits',
    description: 'Research shows it takes 21-66 days to form a habit. Our streak system keeps you motivated throughout.',
  },
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Quick daily check-ins take less than a minute. Spend less time tracking, more time doing.',
  },
  {
    icon: Smartphone,
    title: 'Access Anywhere',
    description: 'Track habits on any device. Your progress syncs automatically across web and mobile.',
  },
  {
    icon: RefreshCw,
    title: 'Never Lose Progress',
    description: 'Cloud backup ensures your habit data is always safe. Continue where you left off.',
  },
];

// Example habits
const exampleHabits = [
  { name: 'Morning Meditation', streak: 45, emoji: '🧘' },
  { name: 'Exercise', streak: 30, emoji: '💪' },
  { name: 'Read 30 mins', streak: 21, emoji: '📚' },
  { name: 'Drink 8 glasses water', streak: 60, emoji: '💧' },
  { name: 'No social media before 10am', streak: 14, emoji: '📵' },
  { name: 'Journal before bed', streak: 28, emoji: '✍️' },
];

// FAQ data
const faqs = [
  {
    question: 'What is a habit tracker?',
    answer:
      'A habit tracker is a tool that helps you monitor and maintain daily routines. It works by letting you check off habits as you complete them, tracking streaks, and showing your progress over time. This visual feedback helps reinforce positive behaviors and build lasting habits.',
  },
  {
    question: 'Is TrackIt habit tracker free?',
    answer:
      'Yes! TrackIt offers a free plan that includes unlimited habit tracking, streak counting, and basic analytics. Premium plans unlock additional features like advanced insights, custom reminders, and team habits.',
  },
  {
    question: 'How do I start tracking habits?',
    answer:
      'Simply sign up for free, add your first habit (like "Exercise" or "Read"), and check it off each day you complete it. The app will automatically track your streaks and show your progress.',
  },
  {
    question: 'Can I track multiple habits?',
    answer:
      'Absolutely! You can track as many habits as you want. We recommend starting with 3-5 key habits and adding more as you build consistency.',
  },
  {
    question: 'Does it work on mobile?',
    answer:
      'Yes, TrackIt is fully responsive and works beautifully on smartphones, tablets, and desktop computers. Your data syncs across all devices.',
  },
  {
    question: 'How long does it take to form a habit?',
    answer:
      'Research suggests it takes between 21 to 66 days to form a new habit, depending on the complexity. TrackIt helps you stay consistent through this period with streaks, reminders, and achievement rewards.',
  },
];

// JSON-LD structured data for the page
function generateStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TrackIt Habit Tracker',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, iOS, Android',
    description:
      'Free habit tracker app to build better daily habits with streak tracking, reminders, and progress analytics.',
    url: 'https://trackit.app/habit-tracker',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free habit tracking with optional premium upgrades',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Streak tracking',
      'Daily reminders',
      'Progress analytics',
      'Achievement badges',
      'Calendar view',
      'Goal setting',
      'Cloud sync',
      'Multi-device support',
    ],
  };
}

// FAQ structured data
function generateFAQStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Breadcrumb structured data
function generateBreadcrumbData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://trackit.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Habit Tracker',
        item: 'https://trackit.app/habit-tracker',
      },
    ],
  };
}

export default function HabitTrackerPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateFAQStructuredData()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbData()),
        }}
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-background to-red-500/10" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-500/15 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-6">
                  <Flame className="w-4 h-4" />
                  Free Habit Tracker
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                  Build Better{' '}
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    Habits
                  </span>{' '}
                  That Last
                </h1>

                <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg">
                  Track your daily habits, maintain streaks, and transform your
                  routines with our free habit tracker. Join thousands building
                  better lives, one habit at a time.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/25"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Start Tracking Free
                  </Link>
                  <Link
                    href="/features"
                    className="inline-flex items-center px-6 py-3 rounded-lg border border-border font-semibold hover:bg-muted transition-colors"
                  >
                    See All Features
                  </Link>
                </div>

                {/* Social proof */}
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                </div>
              </div>

              {/* Habit preview card */}
              <div className="relative">
                <div className="bg-card border rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">Today&apos;s Habits</h3>
                    <span className="text-sm text-muted-foreground">6/6 Complete</span>
                  </div>
                  <div className="space-y-3">
                    {exampleHabits.map((habit, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{habit.emoji}</span>
                          <span className="font-medium">{habit.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold text-orange-500">
                            {habit.streak}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-yellow-400 to-amber-500 text-white p-3 rounded-xl shadow-lg">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-semibold">92% completion</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/30" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything You Need to Build{' '}
                <span className="text-orange-500">Better Habits</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our habit tracker comes packed with features to help you stay
                consistent and motivated on your journey to self-improvement.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={i}
                    className="bg-card border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1"
                  >
                    <div
                      className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Start Tracking Habits in{' '}
                <span className="text-orange-500">3 Simple Steps</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Create Your Habits',
                  description:
                    'Add the habits you want to build. Start with just 3-5 key habits for best results.',
                  icon: Target,
                },
                {
                  step: '2',
                  title: 'Check-in Daily',
                  description:
                    'Mark habits complete each day. Takes less than 30 seconds!',
                  icon: CheckCircle2,
                },
                {
                  step: '3',
                  title: 'Watch Your Progress',
                  description:
                    'See your streaks grow, earn achievements, and build lasting habits.',
                  icon: TrendingUp,
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-orange-500 flex items-center justify-center font-bold text-orange-500">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-orange-500/5 to-red-500/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why Choose TrackIt for{' '}
                <span className="text-orange-500">Habit Tracking</span>?
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-4 p-6 rounded-xl bg-card border hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-orange-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '50K+', label: 'Habits Tracked' },
                { value: '10K+', label: 'Active Users' },
                { value: '1M+', label: 'Streaks Maintained' },
                { value: '4.8★', label: 'User Rating' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl sm:text-4xl font-bold text-orange-500 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-muted/30" id="faq">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about habit tracking with TrackIt.
              </p>
            </div>

            <dl className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-card border rounded-xl p-6">
                  <dt className="font-semibold text-lg mb-2">{faq.question}</dt>
                  <dd className="text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-orange-500 to-red-500">
          <div className="max-w-3xl mx-auto text-center text-white">
            <Flame className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Build Better Habits?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join thousands of people who are transforming their lives one habit
              at a time. Start your journey today — it&apos;s free!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-orange-600 font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Tracking Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center px-8 py-4 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* SEO Content Section - Enhanced */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-6xl mx-auto">
            {/* Main heading with visual flair */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-4">
                <Target className="w-4 h-4" />
                Learn More About Habit Tracking
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                The Ultimate{' '}
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  Habit Tracker
                </span>{' '}
                for Personal Growth
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Building good habits is the foundation of personal success. Whether
                you want to exercise more, read daily, meditate, or develop any
                positive routine, TrackIt&apos;s habit tracker makes it simple and
                enjoyable.
              </p>
            </div>

            {/* Two column content */}
            <div className="grid lg:grid-cols-2 gap-12 mb-16">
              {/* Left: What makes a great habit tracker */}
              <div className="bg-card border rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">What Makes a Great Habit Tracker?</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  An effective habit tracking app should be easy to use, motivating,
                  and insightful. TrackIt combines all three with:
                </p>
                <ul className="space-y-3">
                  {[
                    'Intuitive one-tap check-ins',
                    'Streak-based motivation system',
                    'Detailed progress analytics',
                    'Customizable reminders',
                    'Beautiful visual progress charts',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Science behind habit formation */}
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">The Science Behind Habit Formation</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Research by Dr. Phillippa Lally at University College London shows
                  that forming a new habit takes an average of <strong className="text-foreground">66 days</strong>.
                </p>
                <div className="bg-card/50 backdrop-blur rounded-xl p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Habit Formation Timeline</span>
                    <span className="text-xs text-muted-foreground">Average: 66 days</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Day 1-21: Building awareness</span>
                        <span className="text-orange-500">31%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-[31%] bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Day 22-45: Creating routine</span>
                        <span className="text-orange-500">68%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-[68%] bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Day 46-66: Automatic behavior</span>
                        <span className="text-green-500">100%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Our habit tracker helps you stay consistent through this crucial period with
                  visual streaks, daily reminders, and achievement rewards.
                </p>
              </div>
            </div>

            {/* Popular habits to track */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-center mb-8">
                Popular Habits to Track 🎯
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { emoji: '🧘', habit: 'Morning Meditation', category: 'Mindfulness' },
                  { emoji: '💪', habit: 'Daily Exercise', category: 'Fitness' },
                  { emoji: '📚', habit: 'Read 30 Minutes', category: 'Learning' },
                  { emoji: '💧', habit: 'Drink 8 Glasses', category: 'Health' },
                  { emoji: '✍️', habit: 'Journal Daily', category: 'Reflection' },
                  { emoji: '🎸', habit: 'Practice a Skill', category: 'Growth' },
                  { emoji: '📵', habit: 'Limit Screen Time', category: 'Wellness' },
                  { emoji: '😴', habit: 'Sleep by 11 PM', category: 'Rest' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-card border rounded-xl p-4 hover:shadow-md hover:border-orange-500/50 transition-all group cursor-default"
                  >
                    <span className="text-3xl mb-2 block">{item.emoji}</span>
                    <h4 className="font-semibold group-hover:text-orange-500 transition-colors">
                      {item.habit}
                    </h4>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA text */}
            <div className="text-center bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 rounded-2xl p-8 border border-orange-500/20">
              <p className="text-lg mb-4">
                Start your <strong className="text-orange-500">habit tracking journey</strong> today with TrackIt — 
                the free habit tracker that helps you build the life you want, one habit at a time.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/25"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Building Better Habits
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}


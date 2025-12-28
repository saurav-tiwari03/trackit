import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'http://localhost:3000').replace(/\/$/, '')
  ),
  title: {
    default: 'TrackIt',
    template: '%s · TrackIt',
  },
  description:
    'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
  applicationName: 'TrackIt',
  keywords: [
    'TrackIt',
    'todo',
    'tasks',
    'project management',
    'kanban',
    'calendar',
    'productivity',
  ],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'TrackIt',
    title: 'TrackIt',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'TrackIt',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrackIt',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

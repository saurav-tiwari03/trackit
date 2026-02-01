import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { OfflineProvider } from '@/components/providers/offline-provider';

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
    default: 'TrackIt - Clean Task & Project Manager | Free Productivity App',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'TrackIt',
    title: 'TrackIt - Clean Task & Project Manager | Free Productivity App',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TrackIt - Clean Task & Project Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrackIt - Clean Task & Project Manager | Free Productivity App',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: ['/og-image.jpg'],
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
        <OfflineProvider>
          {children}
        </OfflineProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

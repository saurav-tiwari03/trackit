import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
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
  openGraph: {
    type: 'website',
    title: 'TrackIt',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'TrackIt',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'TrackIt',
    description:
      'A clean, minimalist task and project manager with inbox, calendar scheduling, attachments, mentions, and notifications.',
    images: ['/logo.png'],
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
      </body>
    </html>
  );
}

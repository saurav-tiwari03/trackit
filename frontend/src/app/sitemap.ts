import type { MetadataRoute } from 'next';

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';
  const withProtocol =
    raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // Define routes with individual priorities for sitelinks optimization
  const routes: Array<{
    path: string;
    priority: number;
    changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  }> = [
    // High priority - main pages (candidates for sitelinks)
    { path: '/', priority: 1.0, changeFreq: 'daily' },
    { path: '/features', priority: 0.9, changeFreq: 'weekly' },
    { path: '/task-management', priority: 0.9, changeFreq: 'weekly' },
    { path: '/login', priority: 0.8, changeFreq: 'monthly' },
    { path: '/register', priority: 0.8, changeFreq: 'monthly' },
    { path: '/dashboard', priority: 0.8, changeFreq: 'daily' },
    
    // Medium priority - app pages
    { path: '/projects', priority: 0.7, changeFreq: 'daily' },
    { path: '/tasks', priority: 0.7, changeFreq: 'daily' },
    { path: '/inbox', priority: 0.7, changeFreq: 'daily' },
    { path: '/calendar', priority: 0.7, changeFreq: 'daily' },
    { path: '/notes', priority: 0.7, changeFreq: 'daily' },
    { path: '/streaks', priority: 0.7, changeFreq: 'daily' },
    { path: '/achievements', priority: 0.6, changeFreq: 'weekly' },
    
    // Lower priority - legal/info pages
    { path: '/contact-us', priority: 0.5, changeFreq: 'monthly' },
    { path: '/privacy', priority: 0.4, changeFreq: 'yearly' },
    { path: '/terms', priority: 0.4, changeFreq: 'yearly' },
    { path: '/terms-and-conditions', priority: 0.4, changeFreq: 'yearly' },
    { path: '/cancellation-refunds', priority: 0.4, changeFreq: 'yearly' },
    { path: '/shipping', priority: 0.4, changeFreq: 'yearly' },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }));
}

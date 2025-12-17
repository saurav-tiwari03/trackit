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

  const routes = [
    '/',
    '/features',
    '/task-management',
    '/privacy',
    '/terms',
    '/terms-and-conditions',
    '/cancellation-refunds',
    '/shipping',
    '/contact-us',
  ];

  return routes.map((url) => ({
    url: `${baseUrl}${url}`,
    lastModified: now,
    changeFrequency: url === '/' ? 'daily' : 'monthly',
    priority: url === '/' ? 1 : 0.6,
  }));
}

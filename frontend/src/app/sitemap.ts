import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrlRaw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const baseUrl = baseUrlRaw.replace(/\/$/, '');
  const now = new Date();

  const routes = ['/', '/features', '/task-management', '/privacy', '/terms'];

  return routes.map((url) => ({
    url: `${baseUrl}${url}`,
    lastModified: now,
    changeFrequency: url === '/' ? 'daily' : 'monthly',
    priority: url === '/' ? 1 : 0.6,
  }));
}

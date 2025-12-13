import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrlRaw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const baseUrl = baseUrlRaw.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

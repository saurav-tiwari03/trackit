'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const productLinks = [
  { href: '/features', label: 'Features' },
  { href: '/task-management', label: 'Task management' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms-and-conditions', label: 'Terms & conditions' },
  { href: '/cancellation-refunds', label: 'Cancellation & refunds' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/contact-us', label: 'Contact us' },
];

export function MarketingFooter() {
  // Use state to avoid hydration mismatch - check token only after mount
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem('token'));
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="font-semibold">TrackIt</div>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Tasks. Projects. Calm. A clean workspace that stays out of your way.
            </p>
          </div>

          <div>
            <div className="text-sm font-medium">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium">Account</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {hasToken ? (
                <>
                  <li>
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/settings" className="hover:text-foreground transition-colors">
                      Settings
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="hover:text-foreground transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-foreground transition-colors">
                      Create account
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TrackIt. Built for speed and clarity.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

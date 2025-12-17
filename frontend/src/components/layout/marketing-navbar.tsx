'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/task-management', label: 'Task Management' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms' },
  { href: '/contact-us', label: 'Contact' },
];

export function MarketingNavbar() {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center font-bold">
            T
          </div>
          <div className="leading-tight">
            <div className="font-semibold">TrackIt</div>
            <div className="text-xs text-muted-foreground">Tasks. Projects. Calm.</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pt-12">
              <SheetHeader>
                <SheetTitle>TrackIt</SheetTitle>
              </SheetHeader>

              <div className="px-4 flex flex-col gap-2">
                {navLinks.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>

              <div className="mt-auto p-4 flex flex-col gap-2">
                {hasToken ? (
                  <Button asChild>
                    <Link href="/dashboard">View Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="secondary">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {hasToken ? (
            <Button asChild>
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


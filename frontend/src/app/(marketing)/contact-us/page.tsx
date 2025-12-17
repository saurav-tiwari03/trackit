import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'How to contact TrackIt support.',
  alternates: {
    canonical: '/contact-us',
  },
};

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section>
            <h2 className="text-base font-semibold">Support</h2>
            <p className="mt-2 text-muted-foreground">
              Email us at <strong>support@trackit.app</strong>. We typically respond within 1–2
              business days.
            </p>
            <p className="mt-2 text-muted-foreground">
              Include your account email, a short description of the issue, and screenshots (if
              possible).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Helpful links</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                  Terms &amp; conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/cancellation-refunds"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Cancellation &amp; refunds
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Note</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              This page is a general template and not legal advice.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}


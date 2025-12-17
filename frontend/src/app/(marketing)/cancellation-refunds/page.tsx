import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cancellation & Refunds',
  description: 'Read TrackIt’s cancellation and refund policy.',
};

export default function CancellationRefundsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Cancellation &amp; Refunds
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section>
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="mt-2 text-muted-foreground">
              This policy explains how cancellations and refunds work for TrackIt subscriptions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Cancellation</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>You can cancel anytime from your account settings (if available).</li>
              <li>
                If self-serve cancellation is not available, email{' '}
                <strong>support@trackit.app</strong>.
              </li>
              <li>
                After cancellation, you will retain access until the end of your current billing
                period (unless required otherwise by law).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Refunds</h2>
            <p className="mt-2 text-muted-foreground">
              Refund eligibility depends on the plan and payment method. Unless required by law, we
              generally do not provide refunds for partial billing periods.
            </p>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                If you believe you were billed incorrectly, contact <strong>support@trackit.app</strong>{' '}
                within 7 days of the charge.
              </li>
              <li>Approved refunds are returned to the original payment method.</li>
              <li>Processing times may vary by payment provider and bank.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Changes</h2>
            <p className="mt-2 text-muted-foreground">
              We may update this policy from time to time. Continued use of the service means you
              accept the updated policy.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This page is a general template and not legal advice.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}


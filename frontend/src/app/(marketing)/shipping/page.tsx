import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Read TrackIt’s shipping policy.',
};

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Shipping</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section>
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="mt-2 text-muted-foreground">
              TrackIt is a digital product delivered online. We do not ship physical goods.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Delivery</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Access is provided via your TrackIt account after sign up and/or purchase.</li>
              <li>
                If you have trouble accessing your account, contact <strong>support@trackit.app</strong>.
              </li>
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


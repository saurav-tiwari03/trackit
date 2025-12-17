import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read TrackIt’s privacy policy: what we collect, how we use data, and your choices.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section>
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="mt-2 text-muted-foreground">
              This policy explains how TrackIt (“we”, “our”, “us”) collects, uses,
              and shares information when you use the TrackIt web app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Information we collect</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                <strong>Account data</strong>: name, email, and profile info you
                provide.
              </li>
              <li>
                <strong>Content you create</strong>: tasks, comments, labels,
                attachments.
              </li>
              <li>
                <strong>Usage data</strong>: basic logs to operate, secure, and
                improve the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">How we use information</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Provide and maintain the service (authentication, storage).</li>
              <li>Collaboration features (invites, mentions, notifications).</li>
              <li>Security, abuse prevention, and debugging.</li>
              <li>Product improvements and performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Sharing</h2>
            <p className="mt-2 text-muted-foreground">
              We share data only as needed to run the service (e.g., cloud storage
              for attachments) or to comply with legal obligations. We do not sell
              your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Data retention</h2>
            <p className="mt-2 text-muted-foreground">
              We retain your information for as long as your account is active or
              as needed to provide the service. You can request deletion of your
              account data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Your choices</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Update your profile information.</li>
              <li>Manage project membership and notifications.</li>
              <li>Request export or deletion of your data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              For privacy questions, contact us at <strong>support@trackit.app</strong>.
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

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Read TrackIt’s terms and conditions for using the TrackIt web application.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-6">
          <section>
            <h2 className="text-base font-semibold">Acceptance of terms</h2>
            <p className="mt-2 text-muted-foreground">
              By accessing or using TrackIt, you agree to these terms. If you do
              not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Accounts</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>You are responsible for activity under your account.</li>
              <li>Keep your credentials secure.</li>
              <li>We may suspend accounts for abuse or misuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">User content</h2>
            <p className="mt-2 text-muted-foreground">
              You retain ownership of your content (tasks, comments, attachments).
              You grant TrackIt a license to host and display your content solely
              to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Prohibited use</h2>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>Illegal, harmful, or abusive content.</li>
              <li>Attempting to access data you don’t have permission to access.</li>
              <li>Interfering with service availability or security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold">Availability</h2>
            <p className="mt-2 text-muted-foreground">
              TrackIt is provided “as is”. We may change, suspend, or discontinue
              features at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Limitation of liability</h2>
            <p className="mt-2 text-muted-foreground">
              To the extent permitted by law, TrackIt will not be liable for any
              indirect or consequential damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Changes</h2>
            <p className="mt-2 text-muted-foreground">
              We may update these terms from time to time. Continued use means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              For questions about these terms, contact <strong>support@trackit.app</strong>.
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

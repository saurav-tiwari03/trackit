import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy',
  description: 'Read the shipping and delivery policy.',
  alternates: {
    canonical: '/shipping',
  },
};

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Shipping &amp; Delivery Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated on Dec 17 2025
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
          <section>
            <p>
              For International buyers, orders are shipped and delivered through registered
              international courier companies and/or International speed post only. For domestic
              buyers, orders are shipped through registered domestic courier companies and /or speed
              post only.
            </p>
            <p className="mt-4">
              Orders are shipped within 0-7 days or as per the delivery date agreed at the time of
              order confirmation and delivering of the shipment subject to Courier Company / post
              office norms.
            </p>
            <p className="mt-4">
              SAURAV TIWARI is not liable for any delay in delivery by the courier company / postal
              authorities and only guarantees to hand over the consignment to the courier company or
              postal authorities within 0-7 days rom the date of the order and payment or as per the
              delivery date agreed at the time of order confirmation.
            </p>
            <p className="mt-4">
              Delivery of all orders will be to the address provided by the buyer. Delivery of our
              services will be confirmed on your mail ID as specified during registration.
            </p>
            <p className="mt-4">
              For any issues in utilizing our services you may contact our helpdesk on{' '}
              <strong>8306201908</strong> or <strong>sauravtiwari5625@gmail.com</strong>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}


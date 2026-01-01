import { Metadata } from 'next';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';
import Link from 'next/link';

// SEO Metadata
export const metadata: Metadata = {
  title: 'Pricing Plans | TrackIt - Affordable Task Management',
  description:
    'Choose the perfect TrackIt plan for your productivity needs. Free, Plus (₹99/mo), and Pro (₹199/mo) plans with powerful task management, habit tracking, and team collaboration features.',
  keywords: [
    'task management pricing',
    'productivity app plans',
    'habit tracker subscription',
    'project management pricing india',
    'affordable task manager',
    'team collaboration plans',
    'trackit pricing',
  ],
  openGraph: {
    title: 'TrackIt Pricing - Plans Starting Free',
    description:
      'Boost your productivity with TrackIt. Choose from Free, Plus, or Pro plans. Start organizing your life today.',
    url: 'https://trackit.app/pricing',
    siteName: 'TrackIt',
    images: [
      {
        url: '/og-pricing.png',
        width: 1200,
        height: 630,
        alt: 'TrackIt Pricing Plans',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrackIt Pricing - Plans Starting Free',
    description:
      'Boost your productivity with TrackIt. Choose from Free, Plus, or Pro plans.',
    images: ['/og-pricing.png'],
  },
  alternates: {
    canonical: '/pricing',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Pricing plans data
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    description: 'Perfect for individuals getting started with task management',
    icon: Sparkles,
    color: 'from-slate-500 to-slate-600',
    borderColor: 'border-slate-200 dark:border-slate-700',
    features: [
      'Up to 3 active projects',
      'Basic task management',
      'Calendar view',
      'Daily habits tracking',
      'Notes with rich text',
      'Mobile access',
    ],
    limitations: ['Limited file uploads', 'Basic analytics'],
    cta: 'Get Started Free',
    ctaLink: '/register',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 99,
    priceLabel: '₹99/month',
    description: 'For power users who want unlimited productivity',
    icon: Zap,
    color: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-300 dark:border-violet-600',
    popular: true,
    features: [
      'Unlimited projects',
      'Priority customer support',
      'Advanced analytics & insights',
      'Custom labels & categories',
      'File attachments (10GB)',
      'Google Calendar sync',
      'Recurring tasks',
      'Dark mode themes',
    ],
    cta: 'Get Plus',
    ctaLink: '/register?plan=plus',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    priceLabel: '₹199/month',
    description: 'For teams and professionals with advanced needs',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-300 dark:border-amber-600',
    features: [
      'Everything in Plus',
      'Team collaboration (up to 10)',
      'API access',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
      'Advanced security',
      'File attachments (50GB)',
      'Priority feature requests',
    ],
    cta: 'Get Pro',
    ctaLink: '/register?plan=pro',
  },
];

// FAQ data for SEO
const faqs = [
  {
    question: 'Can I switch plans anytime?',
    answer:
      'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the end of your billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major payment methods including UPI, Credit/Debit Cards, Net Banking, and popular wallets through our secure Razorpay payment gateway.',
  },
  {
    question: 'Is there a free plan available?',
    answer:
      'Yes! TrackIt offers a generous free plan with core features. You can upgrade to Plus or Pro anytime to unlock advanced features.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Absolutely. You can cancel your subscription anytime from your account settings. You\'ll continue to have access until the end of your billing period.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a 7-day money-back guarantee. If you\'re not satisfied within the first 7 days of your paid subscription, contact us for a full refund.',
  },
];

// JSON-LD structured data for pricing
function generateStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'TrackIt Pricing',
    description: 'Choose the perfect TrackIt plan for your productivity needs',
    url: 'https://trackit.app/pricing',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: plans.map((plan, index) => ({
        '@type': 'Product',
        position: index + 1,
        name: `TrackIt ${plan.name}`,
        description: plan.description,
        offers: {
          '@type': 'Offer',
          price: plan.price,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          priceValidUntil: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString().split('T')[0],
        },
      })),
    },
  };
}

// FAQ structured data
function generateFAQStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export default function PricingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateFAQStructuredData()),
        }}
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Simple, Transparent{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your productivity needs. Start free and
              upgrade as you grow. No hidden fees, cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 px-4" aria-labelledby="pricing-plans">
          <h2 id="pricing-plans" className="sr-only">
            Pricing Plans
          </h2>
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <article
                    key={plan.id}
                    className={`relative rounded-2xl border-2 bg-card p-8 shadow-sm hover:shadow-lg transition-all duration-300 ${plan.borderColor} ${
                      plan.popular
                        ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/10'
                        : ''
                    }`}
                  >
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {/* Plan header */}
                    <header className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color} shadow-lg`}
                        >
                          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                        </div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {plan.description}
                      </p>
                    </header>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        {plan.price > 0 ? (
                          <>
                            <span className="text-4xl font-extrabold">
                              ₹{plan.price}
                            </span>
                            <span className="text-muted-foreground">/month</span>
                          </>
                        ) : (
                          <span className="text-4xl font-extrabold">Free</span>
                        )}
                      </div>
                      {plan.price > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed monthly • Cancel anytime
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8" role="list">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check
                            className={`h-5 w-5 flex-shrink-0 ${
                              plan.id === 'free'
                                ? 'text-slate-500'
                                : plan.id === 'plus'
                                ? 'text-violet-500'
                                : 'text-amber-500'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations?.map((limitation, i) => (
                        <li
                          key={`limit-${i}`}
                          className="flex items-start gap-3 text-muted-foreground"
                        >
                          <span className="h-5 w-5 flex-shrink-0 text-center">–</span>
                          <span className="text-sm">{limitation}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link
                      href={plan.ctaLink}
                      className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25'
                          : plan.id === 'pro'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-16 px-4 bg-muted/30" aria-labelledby="compare-plans">
          <div className="max-w-4xl mx-auto">
            <h2
              id="compare-plans"
              className="text-3xl font-bold text-center mb-12"
            >
              Compare Plans
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold">Free</th>
                    <th className="text-center py-4 px-4 font-semibold text-violet-600">
                      Plus
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-amber-600">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Projects', free: '3', plus: 'Unlimited', pro: 'Unlimited' },
                    { feature: 'Tasks per project', free: '50', plus: 'Unlimited', pro: 'Unlimited' },
                    { feature: 'File storage', free: '100MB', plus: '10GB', pro: '50GB' },
                    { feature: 'Team members', free: '1', plus: '1', pro: 'Up to 10' },
                    { feature: 'Calendar sync', free: '–', plus: '✓', pro: '✓' },
                    { feature: 'Advanced analytics', free: '–', plus: '✓', pro: '✓' },
                    { feature: 'API access', free: '–', plus: '–', pro: '✓' },
                    { feature: 'Priority support', free: '–', plus: '✓', pro: '✓' },
                    { feature: 'Custom integrations', free: '–', plus: '–', pro: '✓' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-4 px-4">{row.feature}</td>
                      <td className="text-center py-4 px-4">{row.free}</td>
                      <td className="text-center py-4 px-4">{row.plus}</td>
                      <td className="text-center py-4 px-4">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto">
            <h2
              id="faq-heading"
              className="text-3xl font-bold text-center mb-12"
            >
              Frequently Asked Questions
            </h2>
            <dl className="space-y-6">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card p-6"
                >
                  <dt className="font-semibold text-lg mb-2">{faq.question}</dt>
                  <dd className="text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to boost your productivity?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Join thousands of users who have transformed their workflow with
              TrackIt. Start for free, no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-3 rounded-lg bg-white text-violet-600 font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center px-8 py-3 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </section>

        {/* Trust badges */}
        <section className="py-12 px-4 bg-muted/30" aria-label="Security and trust">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Secure payments via Razorpay</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span>UPI, Cards, NetBanking accepted</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}


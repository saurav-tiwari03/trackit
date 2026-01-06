'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Sparkles, Loader2, ArrowLeft, Shield, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { paymentsAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Plan details
const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    description: 'Perfect for individuals getting started',
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
  },
  {
    id: 'plus' as const,
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
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 199,
    priceLabel: '₹199/month',
    description: 'For teams and professionals',
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
    ],
  },
];

// Load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PricingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript().then(setIsScriptLoaded);
  }, []);

  const handleSubscribe = useCallback(async (planId: 'plus' | 'pro') => {
    if (!user) {
      toast.error('Please login to subscribe');
      router.push('/login');
      return;
    }

    if (!isScriptLoaded) {
      toast.error('Payment system is loading. Please try again.');
      return;
    }

    setIsLoading(planId);

    try {
      // Create subscription on backend
      const response = await paymentsAPI.createSubscription(planId);
      const { subscriptionId, key, name, description, prefill } = response.data.data;

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key,
        subscription_id: subscriptionId,
        name,
        description,
        image: '/icon-192x192.png',
        prefill: {
          name: prefill.name,
          email: prefill.email,
        },
        theme: {
          color: planId === 'pro' ? '#f59e0b' : '#8b5cf6',
        },
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment on backend
            await paymentsAPI.verifyPayment({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success('Subscription activated successfully! 🎉');
            
            // Refresh user data to get updated subscription status
            await refreshUser();
            
            // Redirect to dashboard
            router.push('/dashboard');
          } catch (error: any) {
            console.error('Payment verification failed:', error);
            toast.error(error.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setIsLoading(null);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Subscription creation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setIsLoading(null);
    }
  }, [user, isScriptLoaded, router, refreshUser]);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setIsLoading('cancel');
    try {
      await paymentsAPI.cancelSubscription();
      toast.success('Subscription cancelled. You will have access until the end of your billing period.');
      await refreshUser();
    } catch (error: any) {
      console.error('Cancel subscription failed:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsLoading(null);
    }
  };

  const currentPlan = user?.subscriptionPlan || 'free';
  const isSubscribed = currentPlan !== 'free' && user?.subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Choose Your Plan</h1>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? `You're currently on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan`
                : 'Upgrade to unlock all features'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Current Plan Badge */}
        {isSubscribed && user?.subscriptionExpiresAt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${currentPlan === 'pro' ? 'from-amber-500 to-orange-600' : 'from-violet-500 to-purple-600'}`}>
                    {currentPlan === 'pro' ? (
                      <Crown className="h-5 w-5 text-white" />
                    ) : (
                      <Zap className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {currentPlan === 'pro' ? 'Pro' : 'Plus'} Plan Active
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Renews on {new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSubscription}
                  disabled={isLoading === 'cancel'}
                >
                  {isLoading === 'cancel' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Cancel Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const canUpgrade = plan.id !== 'free' && (
              currentPlan === 'free' || 
              (currentPlan === 'plus' && plan.id === 'pro')
            );
            const canDowngrade = currentPlan === 'pro' && plan.id === 'plus';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${plan.borderColor} ${
                    plan.popular
                      ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/10'
                      : ''
                  } ${isCurrentPlan ? 'bg-muted/30' : ''}`}
                >
                  {/* Popular badge */}
                  {plan.popular && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color} shadow-lg`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        {plan.price > 0 ? (
                          <>
                            <span className="text-4xl font-extrabold">₹{plan.price}</span>
                            <span className="text-muted-foreground">/month</span>
                          </>
                        ) : (
                          <span className="text-4xl font-extrabold">Free</span>
                        )}
                      </div>
                      {plan.price > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed monthly
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 flex-1 mb-6">
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
                          />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {plan.id === 'free' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isCurrentPlan}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Free Forever'}
                      </Button>
                    ) : isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : canUpgrade ? (
                      <Button
                        onClick={() => handleSubscribe(plan.id as 'plus' | 'pro')}
                        disabled={isLoading !== null}
                        className={`w-full ${
                          plan.id === 'pro'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                            : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                        }`}
                      >
                        {isLoading === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            {currentPlan === 'free' ? `Get ${plan.name}` : `Upgrade to ${plan.name}`}
                          </>
                        )}
                      </Button>
                    ) : canDowngrade ? (
                      <Button
                        variant="outline"
                        onClick={() => handleSubscribe(plan.id as 'plus' | 'pro')}
                        disabled={isLoading !== null}
                        className="w-full"
                      >
                        {isLoading === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Downgrade to Plus'
                        )}
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Secure payments via Razorpay</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
              <CreditCard className="h-5 w-5" />
              <span>UPI, Cards, NetBanking accepted</span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Cancel anytime. No hidden fees. 7-day money-back guarantee.
          </p>
        </motion.div>
      </div>
    </div>
  );
}


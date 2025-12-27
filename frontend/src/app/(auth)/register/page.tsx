'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, CheckCircle2, Layers, Calendar, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  type AxiosErrorLike = { response?: { data?: { message?: string } }; message?: string };
  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const e = err as AxiosErrorLike;
    return e?.response?.data?.message || e?.message || fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    }
  };

  const features = [
    { icon: Layers, title: 'Kanban Boards', desc: 'Organize projects visually' },
    { icon: Calendar, title: 'Calendar View', desc: 'Plan your schedule' },
    { icon: CheckCircle2, title: 'Smart Tasks', desc: 'Subtasks, labels, priorities' },
    { icon: Sparkles, title: 'Clean Design', desc: 'Focus on what matters' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/[0.015] rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-stretch px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-xl shadow-2xl shadow-black/20 md:grid-cols-2"
        >
          {/* Brand panel (left) */}
          <div className="relative hidden md:flex flex-col justify-between p-10 lg:p-12">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.015] rounded-full blur-2xl translate-y-1/4 -translate-x-1/4" />

            {/* Grid lines decoration */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>

            <div className="relative z-10">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center gap-4"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl group-hover:bg-white/15 transition-all duration-500" />
                  <div className="relative h-14 w-14 rounded-2xl border border-white/[0.1] bg-white/[0.05] flex items-center justify-center overflow-hidden backdrop-blur-sm">
                    <Image
                      src="/logo.png"
                      alt="Quick logo"
                      width={56}
                      height={56}
                      className="h-11 w-11 object-contain brightness-200 opacity-90"
                      priority
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold tracking-wide">Quick</div>
                  <div className="text-xs text-white/50 font-medium tracking-wide uppercase">
                    Task Management
                  </div>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-12 lg:mt-16 space-y-4"
              >
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                  One place for
                  <br />
                  <span className="text-white/70">projects & tasks.</span>
                </h2>
                <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                  Join thousands of teams using Quick to stay organized with a clean,
                  distraction-free workspace.
                </p>
              </motion.div>

              {/* Features grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-10 grid grid-cols-2 gap-4"
              >
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                    className="group p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                  >
                    <feature.icon className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors mb-2" />
                    <div className="text-sm font-medium text-white/80">{feature.title}</div>
                    <div className="text-xs text-white/40">{feature.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="relative z-10 flex items-center justify-between"
            >
              <div className="text-xs text-white/30">
                © {new Date().getFullYear()} Quick
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Form panel (right) */}
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-white/[0.02] to-transparent">
            {/* Mobile brand header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="md:hidden mb-8 flex items-center gap-3"
            >
              <div className="h-12 w-12 rounded-2xl border border-white/[0.1] bg-white/[0.05] flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Quick logo"
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain brightness-200 opacity-90"
                  priority
                />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold">Quick</div>
                <div className="text-xs text-white/50">Create your account</div>
              </div>
            </motion.div>

            <div className="max-w-sm w-full mx-auto md:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60 mb-4">
                  <Sparkles className="w-3 h-3" />
                  Get started free
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
                <p className="text-sm text-white/50 mt-2">
                  Join Quick and boost your productivity.
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
                  >
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/50 transition-colors" />
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="h-12 pl-10 bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 rounded-xl"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/50 transition-colors" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="h-12 pl-10 bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 rounded-xl"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/50 transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="h-12 pl-10 pr-11 bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 rounded-xl"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/50 transition-colors" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="h-12 pl-10 pr-11 bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 rounded-xl"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/5 hover:shadow-white/10 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-white/30">or</span>
                  </div>
                </div>

                <p className="text-sm text-white/50 text-center">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-white font-medium hover:underline underline-offset-4 transition-all"
                  >
                    Sign in
                  </Link>
                </p>
              </motion.form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

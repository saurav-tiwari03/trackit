'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Logo Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8"
      >
        {/* Logo Background */}
        <div className="h-24 w-24 rounded-2xl bg-foreground/95 flex items-center justify-center shadow-2xl shadow-black/20 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/logo.png"
              alt="TrackIt"
              width={80}
              height={80}
              className="object-contain brightness-200"
              priority
            />
          </motion.div>
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 -z-10 h-24 w-24 rounded-2xl bg-foreground/20 blur-xl" />
      </motion.div>

      {/* Loading Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-muted-foreground animate-spin" />
        </div>
      </motion.div>
    </div>
  );
}


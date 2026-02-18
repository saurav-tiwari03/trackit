'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GroceryRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/lists');
  }, [router]);
  return null;
}

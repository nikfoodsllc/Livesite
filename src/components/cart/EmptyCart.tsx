'use client';

import { useRouter } from 'next/navigation';
import SamosaEmptyState from './SamosaEmptyState';

/** The cart page with nothing in it: the samosa, one line, one way forward. */
export default function EmptyCart() {
  const router = useRouter();
  return <SamosaEmptyState onOrder={() => router.push('/')} />;
}

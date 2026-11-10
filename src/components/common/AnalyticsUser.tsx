'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setAnalyticsUser } from '@/lib/analytics';

/** Tells Google Analytics which customer is signed in (our internal id only). Renders nothing. */
export default function AnalyticsUser() {
  const { user } = useAuth();
  const id = user?.id ?? null;
  useEffect(() => {
    setAnalyticsUser(id);
  }, [id]);
  return null;
}

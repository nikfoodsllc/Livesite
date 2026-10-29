'use client';

import { useEffect } from 'react';
import { showErrorNotification, useNotifications } from '@/components/common/NotificationSystem';
import { STOCK_LIMIT_EVENT, type StockLimitDetail } from '@/lib/stockRules';

/** Says "Only 2 of X left" whenever the cart stops a quantity at what is left of an item with an order limit. Renders nothing. */
export default function StockLimitNotice() {
  const { showNotification } = useNotifications();
  useEffect(() => {
    const onLimit = (event: Event) => {
      const d = (event as CustomEvent<StockLimitDetail>).detail;
      if (!d) return;
      const message = d.left <= 0 ? `${d.name} is sold out` : `Only ${d.leftText} of ${d.name} left`;
      showErrorNotification(showNotification, message, 'Order limit');
    };
    window.addEventListener(STOCK_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(STOCK_LIMIT_EVENT, onLimit);
  }, [showNotification]);
  return null;
}

'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { useApiClient } from '@/hooks/useApiClient';

interface HistoryRow {
  at: string;
  amount: number;
  type: 'issued' | 'used' | 'restored' | 'adjusted';
  orderId?: string;
  items?: Array<{ name: string; quantity: number; amount: number }>;
}

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;
const LABEL: Record<HistoryRow['type'], string> = {
  issued: 'Credit received',
  used: 'Used on an order',
  restored: 'Returned',
  adjusted: 'Adjustment',
};

const TONE: Record<HistoryRow['type'], { bg: string; fg: string }> = {
  issued: { bg: '#DCFCE7', fg: '#166534' },
  used: { bg: '#E0F2FE', fg: '#075985' },
  restored: { bg: '#FEF3C7', fg: '#92400E' },
  adjusted: { bg: '#F3F4F6', fg: '#374151' },
};

/** The customer's store credit: the balance, and what happened to it. Not shown when they never had any. */
export default function StoreCreditCard() {
  const { authenticatedFetch } = useApiClient();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await authenticatedFetch('/api/account/store-credit');
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data?.success) return;
        setBalance(Math.max(0, Number(data.data?.balance) || 0));
        setHistory(Array.isArray(data.data?.history) ? data.data.history : []);
      } catch {
        // the orders page works without it
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch]);

  if (balance <= 0 && history.length === 0) return null;

  return (
    <Box sx={{ backgroundColor: '#fff', border: '1px solid #EDEDED', borderRadius: '12px', p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>Store credit</Typography>
          <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{money(balance)}</Typography>
        </Box>
        {history.length > 0 && (
          <Button onClick={() => setOpen((v) => !v)} sx={{ textTransform: 'none', fontWeight: 600, color: '#FF9F0D' }}>
            {open ? 'Hide' : 'History'}
          </Button>
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {history.map((row, index) => (
            <Box key={`${row.at}-${index}`} sx={{ border: '1px solid #EDEDED', borderRadius: '10px', p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: '6px', bgcolor: TONE[row.type].bg, color: TONE[row.type].fg, fontSize: '12px', fontWeight: 700 }}>{LABEL[row.type]}</Box>
                  {row.orderId && <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', mt: 0.75, overflowWrap: 'anywhere' }}>Order {row.orderId}</Typography>}
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    {new Date(row.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '17px', fontWeight: 700, color: row.amount >= 0 ? '#166534' : '#374151', whiteSpace: 'nowrap' }}>
                  {row.amount >= 0 ? '+' : '-'}
                  {money(row.amount)}
                </Typography>
              </Box>
              {row.items && row.items.length > 0 && (
                <Box sx={{ mt: 1, bgcolor: '#F9FAFB', borderRadius: '8px', px: 1.25, py: 0.5 }}>
                  {row.items.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderTop: i === 0 ? 'none' : '1px solid #EEF0F3' }}>
                      <Typography sx={{ fontSize: '13px', color: '#111827', minWidth: 0, overflowWrap: 'anywhere' }}>
                        {item.name}
                        {item.quantity > 1 ? <span style={{ color: '#6B7280' }}> × {item.quantity}</span> : null}
                      </Typography>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(item.amount)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

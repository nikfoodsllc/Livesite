'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box, IconButton, useTheme, Collapse } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import {
  shouldShowTimezoneWarning,
  getTimezoneOffsetDescription,
  dismissWarning,
} from '@/lib/timezoneDetection';

/**
 * TimezoneWarningBanner Component
 *
 * A dismissible alert banner that warns users when their local timezone
 * differs significantly from Pacific Time (PST/PDT).
 *
 * Features:
 * - Client-side only rendering (prevents SSR/hydration issues)
 * - Dismissible with localStorage persistence
 * - Uses MUI Alert component with warning color scheme
 * - Non-intrusive and informative
 * - Responsive design
 *
 * Usage:
 * This component should be placed in the main layout below the Header
 * but above the main content area.
 */
export default function TimezoneWarningBanner() {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [offsetDescription, setOffsetDescription] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if warning should be shown
    const shouldShow = shouldShowTimezoneWarning();

    if (shouldShow) {
      // Get the offset description for the message
      const description = getTimezoneOffsetDescription();
      setOffsetDescription(description);
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    dismissWarning();
    setIsVisible(false);
  };

  // Don't render anything if warning shouldn't be shown
  if (!isVisible) {
    return null;
  }

  return (
    <Collapse in={isVisible}>
      <Box
        sx={{
          width: '100%',
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3 },
          py: 1,
        }}
      >
        <Alert
          severity="warning"
          onClose={handleDismiss}
          icon={false}
          sx={{
            borderRadius: '12px',
            backgroundColor: `${theme.palette.warning.main}15`,
            border: `1px solid ${theme.palette.warning.main}40`,
            color: theme.palette.warning.dark,
            alignItems: 'flex-start',
            '& .MuiAlert-icon': {
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiAlert-message': {
              width: '100%',
            },
            '& .MuiAlert-action': {
              alignItems: 'flex-start',
              paddingTop: '4px',
            },
          }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleDismiss}
              sx={{
                color: theme.palette.warning.dark,
                '&:hover': {
                  backgroundColor: `${theme.palette.warning.main}20`,
                },
              }}
            >
              <IconX size={18} />
            </IconButton>
          }
        >
          <AlertTitle
            sx={{
              fontWeight: 600,
              mb: 0.5,
              color: theme.palette.warning.dark,
              fontSize: '0.95rem',
            }}
          >
            Timezone Notice
          </AlertTitle>
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
            All dates and times are displayed in Pacific Time (PST).
            {offsetDescription && (
              <>
                {' '}Your local timezone is <strong>{offsetDescription}</strong>, which may
                affect how you perceive delivery dates and cutoff times.
              </>
            )}
          </Box>
        </Alert>
      </Box>
    </Collapse>
  );
}

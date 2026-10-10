'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconCheck, IconCircle } from '@tabler/icons-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/password';

interface PasswordRequirementsProps {
  password: string;
}

/** One quiet line under a new-password field: ticks green once the rule is met. */
export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <Box sx={{ mt: 0.75, px: 0.5 }}>
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const isMet = requirement.check(password);
        return (
          <Box key={requirement.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {isMet ? (
              <IconCheck size={16} color="#4CAF50" />
            ) : (
              <IconCircle size={16} color="#CCCCCC" fill="#CCCCCC" />
            )}
            <Typography sx={{ fontSize: 13, color: isMet ? '#2E7D32' : '#666', fontWeight: isMet ? 500 : 400 }}>
              {requirement.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

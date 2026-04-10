'use client';

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { IconCheck, IconCircle } from '@tabler/icons-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/password';

interface PasswordRequirementsProps {
  password: string;
}

export default function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  return (
    <Box
      sx={{
        backgroundColor: '#F0F9FF',
        borderRadius: '12px',
        p: 2,
        mt: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1A1106',
          mb: 1,
        }}
      >
        Password must contain:
      </Typography>
      <List dense sx={{ p: 0 }}>
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const isMet = requirement.check(password);
          return (
            <ListItem key={requirement.label} sx={{ py: 0.5, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {isMet ? (
                  <IconCheck size={16} color="#4CAF50" />
                ) : (
                  <IconCircle size={16} color="#CCCCCC" fill="#CCCCCC" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={requirement.label}
                primaryTypographyProps={{
                  fontSize: 13,
                  color: isMet ? '#2E7D32' : '#666',
                  fontWeight: isMet ? 500 : 400,
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

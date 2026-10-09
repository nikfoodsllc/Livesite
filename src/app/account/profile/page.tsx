'use client';

import React from 'react';
import { Box } from '@mui/material';
import AccountPageHeader from '@/components/account/AccountPageHeader';
import PersonalInfoCard from '@/components/account/PersonalInfoCard';
import LoginCredentialsCard from '@/components/account/LoginCredentialsCard';
import SmsPreferenceCard from '@/components/account/SmsPreferenceCard';

export default function ProfilePage() {
  return (
    <Box>
      <AccountPageHeader />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <PersonalInfoCard />
        <SmsPreferenceCard />
        <LoginCredentialsCard />
      </Box>
    </Box>
  );
}

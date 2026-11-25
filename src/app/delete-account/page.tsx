import { Box, Container, Link, Typography } from '@mui/material';
import Footer from '@/components/layout/Footer';

/**
 * How to delete a NikFoods account (the page Google Play asks app makers to link to). Deleting removes the account, saved
 * addresses and the phones registered for notifications; order records are kept for accounting and tax.
 */
export default function DeleteAccountPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
          <Typography variant="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, color: 'primary.main', mb: 3 }}>
            Delete your NikFoods account
          </Typography>

          <Typography variant="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1 }}>In the app</Typography>
          <Typography sx={{ mb: 3 }}>Open the NikFoods app, go to Account and tap Delete account.</Typography>

          <Typography variant="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1 }}>By email</Typography>
          <Typography sx={{ mb: 3 }}>
            Email <Link href="mailto:support@nikfoods.com?subject=Delete%20my%20account">support@nikfoods.com</Link> from the email address on your account. We delete it within 7 days.
          </Typography>

          <Typography variant="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1 }}>What is deleted</Typography>
          <Typography component="ul" sx={{ pl: 3, mb: 3, '& li': { mb: 0.5 } }}>
            <li>Your account, name, email and phone number</li>
            <li>Your saved addresses</li>
            <li>Notification settings for your phones</li>
          </Typography>

          <Typography variant="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1 }}>What is kept</Typography>
          <Typography sx={{ mb: 3 }}>Records of past orders and payments, as required for accounting and tax.</Typography>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

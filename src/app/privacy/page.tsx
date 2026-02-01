'use client';

import { Box, Container, Typography, Paper, Divider } from '@mui/material';
import Footer from '@/components/layout/Footer';
import { IconShield } from '@tabler/icons-react';

export default function PrivacyPolicyPage() {
  // Get current date for "Last Updated" display
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content */}
      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          {/* Page Header */}
          <Box
            sx={{
              textAlign: 'center',
              mb: { xs: 6, md: 8 },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '50%',
                backgroundColor: 'primary.light',
                color: 'white',
                mb: 2,
              }}
            >
              <IconShield size={40} />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: 'primary.main',
                mb: 2,
              }}
            >
              Privacy Policy
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.875rem', md: '1rem' },
              }}
            >
              Last Updated: {currentDate}
            </Typography>
          </Box>

          {/* Main Content Paper */}
          <Paper
            elevation={2}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
            }}
          >
            {/* Introduction Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Introduction
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Welcome to NikFoods. We respect your privacy and are committed to protecting your personal data.
                This privacy policy explains how we collect, use, disclose, and safeguard your information when
                you use our Indian food delivery service. Please read this policy carefully.
                <Box component="br" sx={{ display: { xs: 'block', md: 'none' } }} />
                <Box component="br" sx={{ display: { xs: 'block', md: 'none' } }} />
                <strong>Disclaimer:</strong> This privacy policy template is for informational purposes only and
                should be reviewed by legal counsel to ensure compliance with applicable laws and regulations.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Information We Collect Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Information We Collect
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Personal Information
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                When you create an account, we collect information such as your name, email address, phone number,
                and delivery address. This information allows us to provide you with personalized service and
                process your orders efficiently.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Order Data
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We collect details about your orders, including the items you purchase, customizations, delivery
                preferences, spice levels, and order history. This helps us improve our menu and provide better
                recommendations.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Payment Information
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Payment information is processed securely through our payment processor. We do not store your
                complete credit card details on our servers. All transactions are encrypted and PCI DSS compliant.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* How We Use Your Information Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                How We Use Your Information
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We use the information we collect to process and deliver your orders, communicate with you about
                your orders and deliveries, improve our services and menu offerings, personalize your experience,
                send you promotional communications (with your consent), process payments, and prevent fraud
                and ensure security. We may also use your information to comply with legal obligations.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Data Sharing and Disclosure Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Data Sharing and Disclosure
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Third Parties
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We may share your information with trusted third parties who assist us in operating our service,
                such as payment processors, delivery services, and analytics providers. These third parties are
                contractually obligated to protect your information.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Service Providers
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We engage service providers to perform functions on our behalf, such as hosting, data analysis,
                and customer service. These service providers have access to your information only to perform
                these tasks and are obligated to maintain confidentiality.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Legal Requirements
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We may disclose your information if required to do so by law or in response to valid legal
                requests, to protect our rights and property, or in connection with a business transfer such
                as a merger or acquisition.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Data Security Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Data Security
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We implement industry-standard security measures to protect your information. This includes SSL
                encryption for data transmission, secure payment processing through PCI DSS compliant processors,
                regular security audits, and restricted access to personal data. However, no method of
                transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Your Rights Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Your Rights
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                You have the right to access, correct, or delete your personal information at any time. You can
                update your account information through your account settings or contact us directly. You also
                have the right to data portability, to object to processing of your data, and to restrict certain
                processing activities. You may opt out of promotional communications by following the unsubscribe
                instructions in our emails.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Cookies and Tracking Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Cookies and Tracking
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Essential Cookies
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We use essential cookies to ensure the website functions properly, including maintaining your
                session and remembering your preferences. These cookies are necessary for the operation of our
                service.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Analytics Cookies
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We use analytics tools to understand how visitors interact with our website. This helps us improve
                our service and user experience. You can opt out of analytics through your browser settings.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mt: 3,
                  mb: 1.5,
                  fontSize: { xs: '1rem', md: '1.125rem' },
                }}
              >
                Preferences
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                You can manage your cookie preferences through your browser settings. Please note that disabling
                cookies may affect the functionality of our website.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Children's Privacy Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Children&apos;s Privacy
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Our services are not intended for children under the age of 13. We do not knowingly collect
                personal information from children under 13. If you are a parent or guardian and believe your
                child has provided us with personal information, please contact us, and we will take steps to
                delete such information.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Changes to This Policy Section */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Changes to This Policy
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                We may update this privacy policy from time to time. We will notify you of any changes by posting
                the new policy on this page and updating the &quot;Last Updated&quot; date. We encourage you to
                review this policy periodically to stay informed about how we protect your information.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Contact Us Section */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Contact Us
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                If you have any questions, concerns, or requests regarding this privacy policy or our data
                practices, please contact us:
              </Typography>
              <Box
                sx={{
                  mt: 3,
                  p: 3,
                  backgroundColor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    mb: 1,
                    fontSize: { xs: '0.95rem', md: '1rem' },
                  }}
                >
                  <strong>Email:</strong>{' '}
                  <Box
                    component="a"
                    href="mailto:nikfoodsllc@gmail.com"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    nikfoodsllc@gmail.com
                  </Box>
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontSize: { xs: '0.95rem', md: '1rem' },
                  }}
                >
                  <strong>Website:</strong>{' '}
                  <Box
                    component="a"
                    href="https://nikfoods.com"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    www.nikfoods.com
                  </Box>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}

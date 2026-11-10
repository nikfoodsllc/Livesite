'use client';

import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import Footer from '@/components/layout/Footer';
import { IconHelpCircle } from '@tabler/icons-react';

import { faqSections } from './faqData';

export default function FAQPage() {
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
              <IconHelpCircle size={40} />
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
              Frequently Asked Questions
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto',
                fontSize: { xs: '0.95rem', md: '1rem' },
              }}
            >
              Find answers to common questions about our services, delivery, payment options, and more.
              Can&apos;t find what you&apos;re looking for? Feel free to contact us!
            </Typography>
          </Box>

          {/* FAQ Sections */}
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {faqSections.map((section, sectionIndex) => (
              <Box key={sectionIndex} sx={{ mb: { xs: 4, md: 6 } }}>
                {/* Section Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 3,
                    pb: 1.5,
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      lineHeight: 1,
                    }}
                  >
                    {section.icon}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: { xs: '1.5rem', md: '1.75rem' },
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    {section.title}
                  </Typography>
                </Box>

                {/* FAQ Items in Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {section.items.map((item, itemIndex) => (
                    <Accordion
                      key={itemIndex}
                      sx={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        '&:before': {
                          display: 'none',
                        },
                        borderRadius: '12px !important',
                        overflow: 'hidden',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          <IconChevronDown
                            size={24}
                            style={{ color: 'inherit' }}
                          />
                        }
                        sx={{
                          backgroundColor: 'background.paper',
                          '& .MuiAccordionSummary-content': {
                            margin: { xs: '12px 0', md: '16px 0' },
                          },
                          '& .MuiAccordionSummary-expandIconWrapper': {
                            transform: 'rotate(0deg)',
                            transition: 'transform 0.3s',
                          },
                          '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                            transform: 'rotate(180deg)',
                          },
                          px: { xs: 2, md: 3 },
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '1rem', md: '1.1rem' },
                            color: 'text.primary',
                            pr: 2,
                          }}
                        >
                          {item.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          px: { xs: 2, md: 3 },
                          pt: 0,
                          pb: { xs: 2, md: 3 },
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            color: 'text.secondary',
                            lineHeight: 1.7,
                            fontSize: { xs: '0.95rem', md: '1rem' },
                          }}
                        >
                          {item.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Contact CTA */}
          <Box
            sx={{
              mt: { xs: 8, md: 10 },
              p: { xs: 3, md: 4 },
              backgroundColor: 'primary.light',
              borderRadius: 3,
              textAlign: 'center',
              color: 'white',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
              }}
            >
              Still have questions?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 3,
                fontSize: { xs: '0.95rem', md: '1rem' },
                opacity: 0.95,
              }}
            >
              We&apos;re here to help! Contact our customer service team and we&apos;ll get back to you as soon as possible.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: { xs: '0.875rem', md: '0.95rem' },
              }}
            >
              Email us at:{' '}
              <Box
                component="a"
                href="mailto:support@nikfoods.com"
                sx={{
                  color: 'white',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'none',
                  },
                }}
              >
                support@nikfoods.com
              </Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}

'use client';

import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import Footer from '@/components/layout/Footer';
import { IconHelpCircle } from '@tabler/icons-react';

// FAQ data organized by sections
const faqSections = [
  {
    title: 'We Deliver',
    icon: '🚚',
    items: [
      {
        question: 'What are your delivery days?',
        answer: 'We deliver Monday through Friday. We do not offer weekend deliveries at this time.',
      },
      {
        question: 'Do you offer pickup options?',
        answer: 'No, we are delivery-only and do not offer pickup options at this time.',
      },
      {
        question: 'What are your delivery timing?',
        answer: 'Deliveries are made after 2:00 PM and no later than 8:30 PM on your scheduled delivery day.',
      },
      {
        question: 'How do I track my order?',
        answer: 'Refer to your order confirmation email for delivery schedule. We send order tracking details via email and text on the day of delivery by 11 AM and you can live track your order.',
      },
      {
        question: 'Is there a minimum order value for delivery?',
        answer: 'Yes, minimum order values are based on your delivery address. Minimum is $20 and may change based on your delivery address.',
      },
      {
        question: 'Do you deliver to offices, condos, and apartments?',
        answer: 'Yes, we offer curbside delivery to offices, condos, and apartments! Please provide detailed delivery instructions including building name, unit/apartment number, and any gate codes.',
      },
      {
        question: 'Can I change my delivery address/contact info after placing an order?',
        answer: 'Yes, you can reach out to our support team via chat or email nikfoodsllc@gmail.com, and request changes. We\'ll try our best to accommodate the change.',
      },
    ],
  },
  {
    title: 'Online Payments Accepted',
    icon: '💳',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards including Visa, MasterCard, American Express, and Discover. All payments are processed securely through our online payment platform.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely. We use industry-standard encryption and security measures to protect your payment information. We are PCI DSS compliant and never store your complete credit card information on our servers.',
      },
      {
        question: 'When will I be charged for my order?',
        answer: 'Your payment is processed at the time you place your order. This ensures your order is confirmed and reserved for your delivery date.',
      },
    ],
  },
  {
    title: 'Party Orders',
    icon: '🎉',
    items: [
      {
        question: 'Do you offer catering services for parties and events?',
        answer: 'Yes, we offer catering services for parties, events, and large gatherings! Whether it\'s a birthday party, corporate event, or family celebration, we can provide delicious Indian food for your guests, provide delivery services and also provide food warming kits.',
      },
      {
        question: 'How do I place a party order?',
        answer: 'Please reach us via chat or email nikfoodsllc@gmail.com, and share details like your contact info, event date, number of guests (adults and kids), veg/non-veg preference. Our event expert shall get in touch with you to share party catering menu and help you plan the event.',
      },
      {
        question: 'What are the payment requirements for party orders?',
        answer: 'For party orders and catering, we require a 50% upfront payment at the time of booking. This payment is non-refundable. The remaining 50% is due before your event date.',
      },
    ],
  },
  {
    title: 'Spice Level Customizations',
    icon: '⚙️',
    items: [
      {
        question: 'Can I customize the spice level of my food?',
        answer: 'Yes! Most of our dishes can be customized to your preferred spice level. When adding items to your cart, you\'ll see spice level options ranging from 1 Mild (Kid friendly) to 4 Spicy. Our default spice level is Medium.',
      },
    ],
  },
  {
    title: 'Disclaimers',
    icon: '📋',
    items: [
      {
        question: 'What is your cancellation policy?',
        answer: 'We do not accept cancellations once an order is placed. All orders are final and non-refundable.',
      },
      {
        question: 'What type of containers do you use for packaging?',
        answer: 'We use soup containers for all food items. Containers are filled by volume, not by weight. Sweets and savories are sold by weight.',
      },
      {
        question: 'What should I do if there is an issue with my order?',
        answer: 'If you have any issues with your order (missing items, wrong items, quality concerns, etc.), please contact us on the same day of delivery. We will not be able to address issues reported after the delivery day.',
      },
    ],
  },
];

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
                href="mailto:nikfoodsllc@gmail.com"
                sx={{
                  color: 'white',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'none',
                  },
                }}
              >
                nikfoodsllc@gmail.com
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

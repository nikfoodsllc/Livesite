'use client';

import { Box, Container, Typography, Paper, Divider } from '@mui/material';
import Footer from '@/components/layout/Footer';
import { IconFileText } from '@tabler/icons-react';

export default function TermsPage() {
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
              <IconFileText size={40} />
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
              Terms of Service
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.875rem', md: '1rem' },
              }}
            >
              Effective Date: Jan 1st, 2020
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
            {/* Introduction */}
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                By accessing this website or placing an order with Nikfoods LLC (&quot;Nikfoods,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 1. Services Offered */}
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
                1. Services Offered
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Nikfoods LLC operates as a cloud kitchen offering freshly prepared food items for scheduled delivery to customer-provided addresses. Menu items, pricing, and availability are subject to change without notice.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 2. Ordering & Payments */}
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
                2. Ordering & Payments
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
                All orders must be placed online through our website or approved channels.
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
                Full payment is required at the time of order placement.
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
                Only digital payments are accepted. Cash on Delivery is not supported.
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
                Orders, once placed, are non-refundable and non-cancellable, except at the sole discretion of Nikfoods LLC.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Any approved cancellation may incur deduction of payment processing fees associated with the transaction.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 3. Minimum Order Value & Order Clubbing */}
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
                3. Minimum Order Value & Order Clubbing
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
                Orders for a delivery day must meet the minimum order value displayed on the website.
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
                If an order does not meet the minimum order value for that day, the order shall be automatically clubbed with the next scheduled delivery day of that week.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Order clubbing is an operational necessity and does not qualify for refunds, cancellations, or compensation.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 4. Delivery, Handover & Customer Responsibility */}
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
                4. Delivery, Handover & Customer Responsibility
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
                Delivery is considered complete once the order is delivered to the address or designated drop-off location provided by the customer.
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
                Customers are expected to collect and take possession of food immediately upon delivery.
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
                Nikfoods LLC is not liable for theft, loss, damage, spoilage, or disposal of food after delivery.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Failure to collect food promptly resulting in loss or spoilage is entirely the customer&apos;s responsibility.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 5. Apartments, Condos, Offices & Hotels */}
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
                5. Apartments, Condos, Offices & Hotels
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
                Nikfoods LLC does not deliver to individual apartment units, condo units, hotel rooms, or office suites.
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
                Customers must collect orders from front desk, concierge, leasing office, lobby, or curbside.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Nikfoods LLC is not responsible for failed deliveries due to access restrictions or customer unavailability.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 6. Incorrect Address, Access Issues & Re-Delivery */}
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
                6. Incorrect Address, Access Issues & Re-Delivery
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
                Customers are responsible for providing accurate delivery addresses and ensuring availability at the delivery location.
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
                If a delivery driver is unable to access the premises due to:
              </Typography>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  ml: 3,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                • an incorrect address, or<br />
                • a non-responsive customer (including unanswered calls or messages),
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
                the driver may wait no more than five (5) minutes.
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
                If delivery cannot be completed:
              </Typography>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  ml: 3,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                • The delivery attempt will be considered unsuccessful, and<br />
                • Delivery may be re-attempted on the next delivery day, subject to additional delivery charges.
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
                Additional charges must be paid prior to re-delivery.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                No refunds will be issued in such cases.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 7. Delivery Instructions */}
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
                7. Delivery Instructions
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
                Any special delivery instructions provided by customers are best-effort only.
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
                Nikfoods LLC does not guarantee compliance with such instructions.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Failure to follow delivery instructions shall not be used as grounds for refunds, disputes, or claims.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 8. Food Allergies & Preferences */}
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
                8. Food Allergies & Preferences
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
                Our kitchen handles common allergens including (but not limited to) dairy, nuts, wheat, and soy.
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
                Customers are responsible for reviewing ingredient information with us prior to placing the order and notifying us of allergies prior to ordering.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Taste is subjective; dissatisfaction based on personal taste or preference does not qualify for refunds.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 9. Packaging, Quantity & Measurement */}
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
                9. Packaging, Quantity & Measurement
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
                Prepared food items are sold by volume and packed in standardized containers unless otherwise specified.
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
                Sweets and savories are sold by weight, unless otherwise specified.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Minor variations due to preparation and packaging are within acceptable limits.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 10. Party Orders & Catering */}
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
                10. Party Orders & Catering
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
                Nikfoods LLC caters for special events and occasions.
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
                A 50% advance payment is required to confirm party orders and dates.
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
                Advance payments are strictly non-refundable.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Party orders, once confirmed, cannot be canceled.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 11. Post-Delivery Issues */}
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
                11. Post-Delivery Issues
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
                Any issues with an order must be reported on the same day of delivery.
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
                Issues reported after the delivery day will not be considered.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                All resolutions, if any, are at the sole discretion of Nikfoods LLC.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 12. Communications */}
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
                12. Communications
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
                By placing an order or creating an account, customers consent to receive:
              </Typography>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  ml: 3,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                • Order confirmations and delivery notifications<br />
                • Service-related communications<br />
                • Marketing emails, promotions, and reminders
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  mt: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Customers may opt out of marketing communications at any time.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 13. Data Privacy */}
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
                13. Data Privacy
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
                We collect only the information necessary to process orders and provide services.
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
                Nikfoods LLC does not sell, rent, or trade customer personal data to third parties.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Limited data may be shared with service providers solely for operational purposes.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 14. Authority & Agreements */}
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
                14. Authority & Agreements
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
                Nikfoods LLC staff, delivery personnel, or contractors are not authorized to enter into any verbal or written agreements with customers.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Any approvals, exceptions, or agreements are valid only if formally approved and signed by the CEO/Owner of Nikfoods LLC.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 15. Limitation of Liability */}
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
                15. Limitation of Liability
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
                To the fullest extent permitted by law:
              </Typography>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  ml: 3,
                  mb: 2,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                • Nikfoods LLC shall not be liable for indirect, incidental, or consequential damages.<br />
                • Liability, if any, shall be limited to the amount paid for the order.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 16. Governing Law */}
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
                16. Governing Law
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                These Terms of Service are governed by the laws of the State of Washington, without regard to conflict of law principles.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 17. Changes to Terms */}
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
                17. Changes to Terms
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                Nikfoods LLC reserves the right to modify these Terms at any time. Updates will be posted on this page with a revised effective date.
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
                If you have questions about these Terms of Service, please contact us:
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

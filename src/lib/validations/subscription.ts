import { z } from 'zod';

/**
 * Validation schema for email subscription
 */
export const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  consentGiven: z.boolean().refine(
    (val) => val === true,
    { message: 'You must agree to subscribe to the mailing list' }
  ),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

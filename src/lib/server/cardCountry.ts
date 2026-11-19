import Stripe from 'stripe';

/**
 * The country of the card behind a Stripe ConfirmationToken (made in the browser when the customer presses Pay, before anything is
 * charged). Cards, Apple Pay and Google Pay show their card's country; Link hides the card, so it gives null (the ordinary fee applies).
 * Read with the secret key on the server, so the browser cannot choose the country itself. Never throws: any problem gives null.
 */
export async function cardCountryFromToken(confirmationTokenId: unknown): Promise<string | null> {
  if (typeof confirmationTokenId !== 'string' || !/^ctoken_[A-Za-z0-9]+$/.test(confirmationTokenId)) return null;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_dummy_key_for_build') return null;
  try {
    const stripe = new Stripe(key, { apiVersion: '2025-10-29.clover' });
    const token = await stripe.confirmationTokens.retrieve(confirmationTokenId);
    const preview = token.payment_method_preview as { card?: { country?: string | null } | null } | null | undefined;
    const country = preview?.card?.country;
    return typeof country === 'string' && country ? country.toUpperCase() : null;
  } catch (error) {
    console.warn('[card country] could not read the confirmation token', error instanceof Error ? error.message : error);
    return null;
  }
}

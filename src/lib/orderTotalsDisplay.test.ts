import { describe, expect, it } from 'vitest';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_FOOTNOTE, TAXES_FEES_LABEL } from './orderTotalsDisplay';

describe('taxesAndFeesOf', () => {
  it('adds tax, Platform Fee and delivery fee to the cent', () => {
    expect(taxesAndFeesOf({ taxes: 3.89, platformFee: 1.75, deliveryFee: 0 })).toBe(5.64);
    expect(taxesAndFeesOf({ taxes: 0.1, platformFee: 0.2 })).toBe(0.3); // no 0.30000000000000004
    expect(taxesAndFeesOf({ taxes: 1.005, platformFee: 0 })).toBe(1.01);
  });
  it('treats missing values as zero', () => {
    expect(taxesAndFeesOf({})).toBe(0);
    expect(taxesAndFeesOf({ taxes: null, platformFee: undefined, deliveryFee: null })).toBe(0);
    expect(taxesAndFeesOf({ taxes: 2.5 })).toBe(2.5);
  });
  it('a delivery fee is folded in', () => {
    expect(taxesAndFeesOf({ taxes: 2, platformFee: 1, deliveryFee: 3 })).toBe(6);
  });
  it('matches the order total: subtotal + taxes & fees + tip - discount', () => {
    const o = { subtotal: 36, taxes: 3.89, platformFee: 1.75, deliveryFee: 0, tip: 1.8, discount: 0 };
    expect(Math.round((o.subtotal + taxesAndFeesOf(o) + o.tip - o.discount) * 100) / 100).toBe(43.44);
  });
});

describe('hasAmount', () => {
  it('is false for zero, missing and rounding dust', () => {
    for (const v of [0, 0.004, null, undefined, '', 'x', NaN, -1]) expect(hasAmount(v as never)).toBe(false);
    for (const v of [0.01, 5, '2.50']) expect(hasAmount(v as never)).toBe(true);
  });
});

describe('wording', () => {
  it('asterisk label and footnote', () => {
    expect(TAXES_FEES_LABEL).toBe('Taxes & Fees*');
    expect(TAXES_FEES_FOOTNOTE).toBe('* Taxes are 10.3%. The fee is a digital payment processing fee.');
  });
});

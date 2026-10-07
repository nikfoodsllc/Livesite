import { randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { hashPassword } from '@/lib/password';
import { IUser } from '@/types/auth';
import { OfflineAddressInput } from '@/lib/server/offlineOrder';

/**
 * Customers for orders an admin enters. A customer who has no account gets one (no password: nobody can sign
 * in to it until they choose one with "Forgot password", which sends a code to their email), and the delivery
 * address is saved to it like any address a customer saves themselves.
 */

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
}

export interface CustomerAddressView {
  id: string;
  street_address: string;
  apartment?: string;
  city: string;
  postal_code: string;
  entrance?: string;
  floor?: string;
  isDefault: boolean;
}

export interface CustomerView {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: CustomerAddressView[];
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Digits only; a US number has exactly ten. Returns null when it is not one. */
export function normalizePhone(phone: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? ten : null;
}

type AddressDoc = {
  _id: ObjectId;
  user?: unknown;
  street_address?: string;
  apartment?: string;
  city?: string;
  postal_code?: string;
  entrance?: string;
  floor?: string;
  isDefault?: boolean;
};

function toAddressView(a: AddressDoc): CustomerAddressView {
  return {
    id: a._id.toString(),
    street_address: a.street_address ?? '',
    apartment: a.apartment || undefined,
    city: a.city ?? '',
    postal_code: a.postal_code ?? '',
    entrance: a.entrance || undefined,
    floor: a.floor || undefined,
    isDefault: Boolean(a.isDefault),
  };
}

async function addressesOf(userId: string): Promise<AddressDoc[]> {
  const result = await db.read<AddressDoc>('addresses', { user: userId } as never, { sort: { isDefault: -1, createdAt: -1 } });
  return result.success && result.data ? result.data : [];
}

/** Finds customers by part of an email, name or phone (for the admin's customer picker). */
export async function searchCustomers(query: string): Promise<CustomerView[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const digits = q.replace(/\D/g, '');
  const or: Record<string, unknown>[] = [
    { email: { $regex: escaped, $options: 'i' } },
    { name: { $regex: escaped, $options: 'i' } },
  ];
  if (digits.length >= 4) or.push({ phone: { $regex: digits } });
  const result = await db.read<IUser & { _id: ObjectId }>('users', { role: 'USER', $or: or } as never, { limit: 8 });
  const users = result.success && result.data ? result.data : [];
  const views: CustomerView[] = [];
  for (const u of users) {
    const addresses = await addressesOf(u._id.toString());
    views.push({
      id: u._id.toString(),
      name: u.name ?? '',
      email: u.email,
      phone: u.phone ?? '',
      addresses: addresses.map(toAddressView),
    });
  }
  return views;
}

const sameStreet = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

export interface EnsuredCustomer {
  userId: string;
  accountCreated: boolean;
  /** The saved address for this delivery (an existing one when the street and zip match) */
  addressSaved: boolean;
}

/**
 * Returns the account for this email, creating it (without a usable password) when there is none, and makes
 * sure the delivery address is saved on it.
 */
export async function ensureCustomer(customer: CustomerInput, address: OfflineAddressInput): Promise<EnsuredCustomer | { error: string }> {
  const email = normalizeEmail(customer.email);
  const phone = normalizePhone(customer.phone);
  if (!phone) return { error: 'Phone number must be 10 digits' };

  const existing = await db.readOne<IUser & { _id: ObjectId }>('users', { email } as never);
  if (!existing.success) return { error: 'Could not look up the customer. Please try again.' };

  let userId: string;
  let accountCreated = false;
  if (existing.data) {
    if (existing.data.role !== 'USER') {
      return { error: 'That email belongs to a staff account. Use the customer’s own email address.' };
    }
    userId = existing.data._id.toString();
  } else {
    // a random password nobody knows: the account cannot be signed in to until the customer sets one
    const unusablePassword = await hashPassword(randomBytes(32).toString('hex'));
    const created = await db.create<IUser>('users', {
      name: customer.name.trim(),
      email,
      password: unusablePassword,
      phone,
      role: 'USER',
      isCompleted: true,
      provider: 'credentials',
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    if (!created.success || !created.id) return { error: 'Could not create the customer account' };
    userId = created.id;
    accountCreated = true;
  }

  const saved = await addressesOf(userId);
  const already = saved.find(
    (a) => sameStreet(a.street_address ?? '', address.street_address) && (a.postal_code ?? '').slice(0, 5) === address.postal_code.slice(0, 5)
  );
  if (already) return { userId, accountCreated, addressSaved: false };

  const createdAddress = await db.create('addresses', {
    user: userId,
    name: customer.name.trim(),
    email,
    phone,
    street_address: address.street_address.trim(),
    city: address.city.trim(),
    postal_code: address.postal_code,
    apartment: address.apartment?.trim() || undefined,
    floor: address.floor?.trim() || undefined,
    entrance: address.entrance?.trim() || undefined,
    province: '',
    isDefault: saved.length === 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
  if (createdAddress.success && createdAddress.id) {
    await db.updateOne(
      'users',
      { _id: new ObjectId(userId) } as never,
      { $set: { isCompleted: true, updatedAt: new Date() }, $push: { addresses: new ObjectId(createdAddress.id) } } as never
    );
  }
  return { userId, accountCreated, addressSaved: Boolean(createdAddress.success) };
}

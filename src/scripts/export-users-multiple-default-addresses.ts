import { db } from '../lib/server/db';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

/** Load `Livesite/.env` into process.env if present (no dotenv dependency). */
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

/**
 * Finds users who have more than one address document with `isDefault: true`
 * and writes a CSV report.
 *
 * Requires DATABASE_URL (same as the Next.js app `.env`).
 *
 * Usage (from Livesite/):
 *   npm install   # ensures `tsx` is available
 *   npm run export:multiple-default-addresses
 *
 * Optional:
 *   EXPORT_OUT=./reports/defaults.csv npm run export:multiple-default-addresses
 */

interface AddressDoc {
  _id?: ObjectId;
  user: string | ObjectId;
  street_address?: string;
  city?: string;
  postal_code?: string;
  isDefault?: boolean;
}

interface UserDoc {
  _id?: ObjectId;
  email?: string;
  name?: string;
  phone?: string;
}

function normalizeUserId(user: string | ObjectId | undefined): string {
  if (!user) return '';
  if (user instanceof ObjectId) return user.toString();
  if (typeof user === 'string') {
    try {
      return new ObjectId(user).toString();
    } catch {
      return user.trim();
    }
  }
  return String(user);
}

function escapeCsvCell(v: string): string {
  if (v.includes('"') || v.includes(',') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toCsvRow(cells: string[]): string {
  return cells.map(escapeCsvCell).join(',');
}

async function main() {
  loadEnvFile();
  console.log('Export users with multiple default addresses');
  console.log('');

  const outPath =
    process.env.EXPORT_OUT ||
    path.join(
      process.cwd(),
      `exports/users-multiple-default-addresses-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    );

  try {
    const addressesResult = await db.read<AddressDoc>('addresses', { isDefault: true } as never);

    if (!addressesResult.success || !addressesResult.data) {
      console.error('Failed to read addresses:', addressesResult.error);
      process.exit(1);
    }

    const byUser = new Map<string, AddressDoc[]>();
    for (const addr of addressesResult.data) {
      const uid = normalizeUserId(addr.user as string | ObjectId);
      if (!uid) continue;
      const list = byUser.get(uid) ?? [];
      list.push(addr);
      byUser.set(uid, list);
    }

    const offenders = [...byUser.entries()].filter(([, addrs]) => addrs.length > 1);

    if (offenders.length === 0) {
      console.log('No users with more than one default address.');
      await db.close();
      process.exit(0);
    }

    const userIdsForLookup: ObjectId[] = [];
    for (const [uid] of offenders) {
      try {
        userIdsForLookup.push(new ObjectId(uid));
      } catch {
        /* string user id not valid ObjectId — still export row */
      }
    }

    const usersById = new Map<string, UserDoc>();
    if (userIdsForLookup.length > 0) {
      const usersResult = await db.read<UserDoc>('users', {
        _id: { $in: userIdsForLookup },
      } as never);
      if (usersResult.success && usersResult.data) {
        for (const u of usersResult.data) {
          if (u._id) usersById.set(u._id.toString(), u);
        }
      }
    }

    const header = toCsvRow([
      'userId',
      'email',
      'name',
      'phone',
      'defaultAddressCount',
      'defaultAddressIds',
      'defaultAddressSummaries',
    ]);

    const lines: string[] = [header];

    for (const [userId, addrs] of offenders.sort((a, b) => b[1].length - a[1].length)) {
      const user = usersById.get(userId);
      const ids = addrs.map((a) => (a._id instanceof ObjectId ? a._id.toString() : String(a._id)));
      const summaries = addrs.map((a) => {
        const parts = [a.street_address, a.city, a.postal_code].filter(Boolean);
        return parts.join(' ').replace(/\s+/g, ' ').trim();
      });

      lines.push(
        toCsvRow([
          userId,
          user?.email ?? '',
          user?.name ?? '',
          user?.phone ?? '',
          String(addrs.length),
          ids.join('; '),
          summaries.join(' | '),
        ])
      );
    }

    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

    console.log(`Found ${offenders.length} user(s) with multiple default addresses.`);
    console.log(`Wrote: ${outPath}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();

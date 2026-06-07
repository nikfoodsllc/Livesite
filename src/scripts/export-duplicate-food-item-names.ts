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
 * Finds food items whose `name` duplicates another when compared case-insensitively
 * (e.g. "Paneer Tikka" vs "paneer tikka") and writes a CSV report.
 *
 * Requires DATABASE_URL (same as the Next.js app `.env`).
 *
 * Usage (from Livesite/):
 *   npm run export:duplicate-food-item-names
 *
 * Optional:
 *   EXPORT_OUT=./exports/duplicate-food-names.csv npm run export:duplicate-food-item-names
 */

interface FoodItemDoc {
  _id?: ObjectId;
  name?: string;
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function formatId(id: ObjectId | string | undefined): string {
  if (!id) return '';
  if (id instanceof ObjectId) return id.toString();
  return String(id);
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
  console.log('Export duplicate food item names (case-insensitive)');
  console.log('');

  const outPath =
    process.env.EXPORT_OUT ||
    path.join(
      process.cwd(),
      `exports/duplicate-food-item-names-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    );

  try {
    const itemsResult = await db.read<FoodItemDoc>('fooditems', {} as never);

    if (!itemsResult.success || !itemsResult.data) {
      console.error('Failed to read food items:', itemsResult.error);
      process.exit(1);
    }

    const byKey = new Map<string, { id: string; name: string }[]>();

    for (const item of itemsResult.data) {
      const rawName = item.name?.trim();
      if (!rawName) continue;

      const key = normalizeNameKey(rawName);
      const entry = { id: formatId(item._id), name: rawName };
      const list = byKey.get(key) ?? [];
      list.push(entry);
      byKey.set(key, list);
    }

    const duplicateGroups = [...byKey.entries()]
      .filter(([, items]) => items.length > 1)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

    if (duplicateGroups.length === 0) {
      console.log('No case-insensitive duplicate food item names found.');
      await db.close();
      process.exit(0);
    }

    const totalDuplicateItems = duplicateGroups.reduce((sum, [, items]) => sum + items.length, 0);

    const header = toCsvRow([
      'name',
      'duplicateCount',
      'duplicateNames',
      'duplicateIds',
    ]);

    const lines: string[] = [header];

    for (const [key, items] of duplicateGroups) {
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
      const displayName = sorted[0]?.name ?? key;
      const names = sorted.map((i) => i.name);
      const ids = sorted.map((i) => i.id);

      lines.push(
        toCsvRow([
          displayName,
          String(items.length),
          names.join('; '),
          ids.join('; '),
        ])
      );
    }

    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

    console.log(
      `Found ${duplicateGroups.length} duplicate name group(s) (${totalDuplicateItems} food items).`
    );
    console.log(`Wrote: ${outPath}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();

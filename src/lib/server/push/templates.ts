import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';

/** The texts an admin can pick from when sending a notification (Admin > Notifications). Editable; these start the list. */
export const TITLE_MAX = 40;
export const BODY_MAX = 150;

export interface PushTemplate {
  _id: string;
  name: string;
  title: string;
  body: string;
}

const DEFAULTS: Array<Omit<PushTemplate, '_id'>> = [
  { name: 'New menu is up', title: 'New menu is up', body: 'Fresh dishes for the week are live. Order now.' },
  { name: 'Ordering closes soon', title: 'Last call for tomorrow', body: 'Ordering for tomorrow closes soon. Order now.' },
  { name: 'Weekend special', title: 'Something special this weekend', body: 'Our weekend menu is live. Order now.' },
];

export function checkText(title: unknown, body: unknown): { ok: true; title: string; body: string } | { ok: false; error: string } {
  const t = String(title ?? '').trim();
  const b = String(body ?? '').trim();
  if (!t) return { ok: false, error: 'Write a title' };
  if (!b) return { ok: false, error: 'Write the message' };
  if (t.length > TITLE_MAX) return { ok: false, error: `The title can be at most ${TITLE_MAX} characters` };
  if (b.length > BODY_MAX) return { ok: false, error: `The message can be at most ${BODY_MAX} characters` };
  return { ok: true, title: t, body: b };
}

async function col() {
  return db.getCollectionForOperations<Record<string, unknown>>('pushTemplates');
}
const out = (d: Record<string, unknown>): PushTemplate => ({ _id: String(d._id), name: String(d.name ?? ''), title: String(d.title ?? ''), body: String(d.body ?? '') });

/** All saved texts (the three starting ones are created the first time the list is opened). */
export async function listTemplates(): Promise<PushTemplate[]> {
  const c = await col();
  if ((await c.countDocuments({} as never)) === 0) {
    const now = new Date();
    await c.insertMany(DEFAULTS.map((d, i) => ({ ...d, order: i, createdAt: now, updatedAt: now })) as never);
  }
  const rows = await c.find({} as never).sort({ order: 1, createdAt: 1 }).toArray();
  return rows.map(out);
}

export async function createTemplate(name: unknown, title: unknown, body: unknown, adminId: string): Promise<{ ok: true; template: PushTemplate } | { ok: false; error: string }> {
  const n = String(name ?? '').trim().slice(0, 60);
  if (!n) return { ok: false, error: 'Give this text a name' };
  const text = checkText(title, body);
  if (!text.ok) return text;
  const c = await col();
  const now = new Date();
  const count = await c.countDocuments({} as never);
  const r = await c.insertOne({ name: n, title: text.title, body: text.body, order: count, createdBy: adminId, createdAt: now, updatedAt: now } as never);
  return { ok: true, template: { _id: String(r.insertedId), name: n, title: text.title, body: text.body } };
}

export async function updateTemplate(id: string, name: unknown, title: unknown, body: unknown): Promise<{ ok: true; template: PushTemplate } | { ok: false; error: string; status: number }> {
  if (!ObjectId.isValid(id)) return { ok: false, error: 'Unknown text', status: 404 };
  const n = String(name ?? '').trim().slice(0, 60);
  if (!n) return { ok: false, error: 'Give this text a name', status: 400 };
  const text = checkText(title, body);
  if (!text.ok) return { ...text, status: 400 };
  const c = await col();
  const r = await c.findOneAndUpdate({ _id: new ObjectId(id) } as never, { $set: { name: n, title: text.title, body: text.body, updatedAt: new Date() } } as never, { returnDocument: 'after' });
  if (!r) return { ok: false, error: 'Unknown text', status: 404 };
  return { ok: true, template: out(r) };
}

export async function deleteTemplate(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await col();
  const r = await c.deleteOne({ _id: new ObjectId(id) } as never);
  return (r.deletedCount ?? 0) > 0;
}

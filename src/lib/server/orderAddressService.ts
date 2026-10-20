import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { ADDRESS_EDITABLE_STATUSES, addressChanged, addressDiff, checkAddressInput, type AddressInput } from '@/lib/orderAddress';
import { updateOrderStopsAddress } from '@/lib/server/optimoRoute/sync';

export type AddressChangeResult =
  | { ok: true; orderId: string; changed: boolean; address: Order['address']; optimo: { mode: string; updated: number; recreated: number; failed: number } }
  | { ok: false; status: number; error: string };

async function adminName(adminId: string): Promise<string | undefined> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(adminId)) return undefined;
    const found = await db.readOne<{ name?: string; email?: string }>('users', { _id: new ObjectId(adminId) } as never);
    return found.success ? found.data?.name || found.data?.email : undefined;
  } catch {
    return undefined;
  }
}

/**
 * An admin changes the delivery address of an order. The order is saved first (with a history entry); the route planner is updated
 * right after, and never blocks the change: if OptimoRoute cannot be reached the 30-minute check finishes the job.
 */
export async function changeOrderAddress(orderId: string, input: AddressInput, adminId: string, options: { now?: Date } = {}): Promise<AddressChangeResult> {
  const now = options.now ?? new Date();
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order) return { ok: false, status: 404, error: 'Order not found.' };
  if (!(ADDRESS_EDITABLE_STATUSES as readonly string[]).includes(order.status)) {
    return { ok: false, status: 409, error: order.status === 'cancelled' ? 'This order is cancelled.' : 'This order has already been delivered.' };
  }
  const checked = checkAddressInput(input, order.address);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  const optimo = { mode: 'off', updated: 0, recreated: 0, failed: 0 };
  if (!addressChanged(order.address, checked.address)) return { ok: true, orderId, changed: false, address: order.address, optimo };

  const record = { at: now, by: { id: adminId, name: await adminName(adminId) }, changes: addressDiff(order.address, checked.address) };
  // only saves when the order still has the address that was read (nobody changed it meanwhile)
  const saved = await db.updateOne(
    'orders',
    { orderId, status: { $in: [...ADDRESS_EDITABLE_STATUSES] }, address: order.address } as never,
    { $set: { address: checked.address, updatedAt: now }, $push: { addressChanges: record } } as never
  );
  if (!saved.success) return { ok: false, status: 500, error: 'Could not save the new address.' };
  if (!saved.modifiedCount) return { ok: false, status: 409, error: 'The order was changed in the meantime. Reload it and try again.' };

  try {
    const result = await Promise.race([updateOrderStopsAddress(orderId, { now }), new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000))]);
    if (!result) return { ok: true, orderId, changed: true, address: checked.address, optimo: { ...optimo, mode: 'timeout' } };
    return {
      ok: true,
      orderId,
      changed: true,
      address: checked.address,
      optimo: {
        mode: result.mode,
        updated: result.outcomes.filter((o) => o.result === 'updated' || o.result === 'would_update').length,
        recreated: result.outcomes.filter((o) => o.result === 'sent' || o.result === 'adopted').length,
        failed: result.outcomes.filter((o) => o.result === 'failed' || o.result === 'remove_failed').length,
      },
    };
  } catch (error) {
    console.error('[address-change] Route planner update failed', { orderId, error: error instanceof Error ? error.message : String(error) });
    return { ok: true, orderId, changed: true, address: checked.address, optimo: { ...optimo, mode: 'error', failed: 1 } };
  }
}

import { Cart } from '@/types/cart';

/**
 * Older clients stored apt + delivery instructions in one `addressLine2` string:
 * "Apt 5, Floor <delivery instructions>". Snapshots mapped that whole string to
 * `apartment`, so exports showed instructions in the Apartment column.
 *
 * Split that legacy shape so `floor` holds instructions and `addressLine2` is apt-only.
 * Explicit `floor` on the cart always wins over the part after ", Floor ".
 */
export function normalizeCartSelectedAddress(
  address: NonNullable<Cart['selectedAddress']>
): NonNullable<Cart['selectedAddress']> {
  const line2 = address.addressLine2?.trim();
  if (!line2) {
    return { ...address };
  }

  const legacy = line2.match(/^(.*?),\s*Floor\s+(.+)$/i);
  if (!legacy) {
    return { ...address };
  }

  const apartmentPart = legacy[1].trim();
  const floorFromLine2 = legacy[2].trim();
  const floor =
    (address.floor && address.floor.trim()) || floorFromLine2 || undefined;

  return {
    ...address,
    addressLine2: apartmentPart || undefined,
    floor,
  };
}

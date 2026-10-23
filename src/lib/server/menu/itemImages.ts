/**
 * Extra photos of a food item for the public menu.
 *
 * An item keeps `url` / `public_id` for its main photo (everything that only needs one photo keeps working) and, when an
 * admin added more, an `images` list of { url, public_id } with the main photo first. The public menu gets only the URLs,
 * and only when there is more than one photo, so single-photo items are exactly as before.
 */
export function publicImageFields(item: { url?: unknown; imageUrl?: unknown; images?: unknown }): { images?: string[] } {
  const raw = Array.isArray(item.images) ? item.images : [];
  const urls: string[] = [];
  for (const entry of raw) {
    const url = typeof entry === 'string' ? entry : (entry as { url?: unknown } | null)?.url;
    if (typeof url === 'string' && url.trim() && !urls.includes(url.trim())) urls.push(url.trim());
  }
  return urls.length > 1 ? { images: urls.slice(0, 10) } : {};
}

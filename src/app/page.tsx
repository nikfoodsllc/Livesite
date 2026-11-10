import HomeClient from './HomeClient';
import { buildHomeMenu, type HomeMenuPayload } from '@/lib/server/menu/buildHomeMenu';
import { getCachedHomeMenu, setCachedHomeMenu } from '@/lib/server/menu/homeMenuCache';
import { getDeliveryZipcodes } from '@/lib/server/deliveryZips';
import { jsonLdString, menuJsonLd, organizationJsonLd } from '@/lib/seo';

// the menu depends on the time (cutoffs, open days), so the page is built per request; the menu itself is cached for up to 5 minutes
export const dynamic = 'force-dynamic';

async function loadMenu(): Promise<HomeMenuPayload | null> {
  try {
    const cached = getCachedHomeMenu();
    if (cached) return cached;
    const data = await buildHomeMenu();
    setCachedHomeMenu(data);
    return data;
  } catch (error) {
    // the page still works: the browser loads the menu by itself, as before
    console.error('[home] could not read the menu on the server', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * The home page. The menu is read here, on the server, and handed to the page, so the first HTML (what Google reads) already has the
 * dishes, categories and prices, and customers see the menu without waiting for a second request. The browser still refreshes it.
 */
export default async function Page() {
  const [menu, zips] = await Promise.all([loadMenu(), getDeliveryZipcodes()]);
  // the same plain data the /api/home-menu answer has (dates and ids as text)
  const initialMenu = menu ? JSON.parse(JSON.stringify(menu)) : null;
  const menuLd = menu ? menuJsonLd(menu.categoryItems as never) : null;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd(zips)) }} />
      {menuLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(menuLd) }} />}
      <HomeClient initialMenu={initialMenu} />
    </>
  );
}

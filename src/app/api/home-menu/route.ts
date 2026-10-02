import { buildHomeMenu } from '@/lib/server/menu/buildHomeMenu';
import {
  getCachedHomeMenu,
  setCachedHomeMenu,
  readHomeMenuVersion,
  HOME_MENU_CACHE_CONTROL,
} from '@/lib/server/menu/homeMenuCache';

/**
 * GET /api/home-menu
 *
 * Single batched endpoint for the home page: categories, all category food items,
 * and available delivery dates. The built menu is cached in memory and rebuilt as soon as the
 * admin panel bumps the menu version (checked at most every 5 s per instance), or after 5 minutes
 * at the latest.
 */
export async function GET() {
  try {
    const cached = await getCachedHomeMenu();
    if (cached) {
      return Response.json(
        { data: cached, message: 'success', cached: true },
        {
          status: 200,
          headers: { 'Cache-Control': HOME_MENU_CACHE_CONTROL },
        }
      );
    }

    // Read the version first: a change made while the menu is being built is then caught next time
    const versionBeforeBuild = await readHomeMenuVersion();
    const data = await buildHomeMenu();
    setCachedHomeMenu(data, versionBeforeBuild);

    return Response.json(
      { data, message: 'success', cached: false },
      {
        status: 200,
        headers: { 'Cache-Control': HOME_MENU_CACHE_CONTROL },
      }
    );
  } catch (error) {
    console.error('[home-menu] Error building home menu:', error);
    return Response.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

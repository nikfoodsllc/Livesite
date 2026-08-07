import { buildHomeMenu } from '@/lib/server/menu/buildHomeMenu';
import {
  getCachedHomeMenu,
  setCachedHomeMenu,
  HOME_MENU_CACHE_CONTROL,
} from '@/lib/server/menu/homeMenuCache';

/**
 * GET /api/home-menu
 *
 * Single batched endpoint for the home page: categories, all category food items,
 * and available delivery dates. Response is cached in-memory for 5 minutes.
 */
export async function GET() {
  try {
    const cached = getCachedHomeMenu();
    if (cached) {
      return Response.json(
        { data: cached, message: 'success', cached: true },
        {
          status: 200,
          headers: { 'Cache-Control': HOME_MENU_CACHE_CONTROL },
        }
      );
    }

    const data = await buildHomeMenu();
    setCachedHomeMenu(data);

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

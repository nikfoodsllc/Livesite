import { invalidateHomeMenuCache } from '@/lib/server/menu/homeMenuCache';

function isAuthorized(request: Request): boolean {
  const secret = process.env.HOME_MENU_CACHE_SECRET || process.env.PRIVATE_KEY;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get('x-home-menu-cache-secret') === secret;
}

/**
 * POST /api/internal/invalidate-home-menu
 *
 * Clears the in-memory home menu cache. Called by admin after menu changes.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  invalidateHomeMenuCache();

  return Response.json({ message: 'Home menu cache invalidated' }, { status: 200 });
}

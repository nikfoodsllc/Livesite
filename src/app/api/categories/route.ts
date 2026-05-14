import { db } from '@/lib/server/db';

/**
 * GET /api/categories
 * Fetch all published, enabled categories sorted by sequence
 * Public endpoint - no authentication required
 *
 * This endpoint is called on home page load to render category cards.
 *
 * Filtering:
 * - Excludes draft categories (isDraft: true)
 * - Excludes sub-categories (documents with parentCategoryId set); only top-level categories appear in the home list
 *
 * Sorting:
 * - Categories are sorted by sequence field ascending
 *
 * Response Structure:
 * {
 *   data: {
 *     items: [
 *       {
 *         _id: string,
 *         name: string,
 *         description: string,
 *         imageUrl: string,
 *         listingType: 'flat' | 'day-wise',
 *         sequence: number,
 *         children?: Array<{ same fields, no nested children }>
 *       }
 *     ]
 *   },
 *   message: 'success'
 * }
 */
export async function GET() {
  try {
    // Fetch top-level categories only (parentCategoryId null or absent = not a sub-category)
    const result = await db.read(
      'foodcategories',
      {
        isDraft: { $ne: true },
        parentCategoryId: null,
      },
      {
        sort: { sequence: 1 },
      }
    );

    if (!result.success || !result.data) {
      return Response.json(
        {
          message: 'Failed to fetch categories',
          error: result.error,
        },
        { status: 500 }
      );
    }

    const subsResult = await db.read(
      'foodcategories',
      {
        isDraft: { $ne: true },
        parentCategoryId: { $exists: true, $ne: null },
      },
      {
        sort: { sequence: 1 },
      }
    );

    const childrenByParentId = new Map<
      string,
      Array<{
        _id: string;
        name: string;
        description: string;
        imageUrl: string;
        listingType: 'flat' | 'day-wise';
        sequence: number;
      }>
    >();

    if (subsResult.success && subsResult.data) {
      for (const sub of subsResult.data) {
        const rawParent = (sub as { parentCategoryId?: { toString?: () => string } }).parentCategoryId;
        const parentId =
          rawParent && typeof rawParent === 'object' && typeof rawParent.toString === 'function'
            ? rawParent.toString()
            : rawParent != null
              ? String(rawParent)
              : '';
        if (!parentId) continue;

        const row = {
          _id: sub._id.toString(),
          name: sub.name,
          description: sub.description || '',
          imageUrl: sub.url || sub.imageUrl || '',
          listingType: (sub.listingType || 'flat') as 'flat' | 'day-wise',
          sequence: sub.sequence || sub.order || 0,
        };
        const list = childrenByParentId.get(parentId);
        if (list) {
          list.push(row);
        } else {
          childrenByParentId.set(parentId, [row]);
        }
      }
    }

    // Transform database response to match API format
    const categories = result.data.map((category) => {
      const id = category._id.toString();
      const children = childrenByParentId.get(id) ?? [];
      return {
        _id: id,
        name: category.name,
        description: category.description || '',
        imageUrl: category.url || category.imageUrl || '',
        listingType: (category.listingType || 'flat') as 'flat' | 'day-wise',
        sequence: category.sequence || category.order || 0,
        ...(children.length > 0 ? { children } : {}),
      };
    });

    return Response.json(
      {
        data: {
          items: categories,
        },
        message: 'success',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return Response.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

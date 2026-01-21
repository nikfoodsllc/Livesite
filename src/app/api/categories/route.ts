import { NextRequest } from 'next/server';
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
 *         sequence: number
 *       }
 *     ]
 *   },
 *   message: 'success'
 * }
 */
export async function GET() {
  try {
    // Fetch categories from database with filters
    const result = await db.read(
      'foodcategories',
      {
        isDraft: { $ne: true }
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

    // Transform database response to match API format
    const categories = result.data.map((category) => ({
      _id: category._id.toString(),
      name: category.name,
      description: category.description || '',
      imageUrl: category.url || category.imageUrl || '',
      listingType: category.listingType || 'flat',
      sequence: category.sequence || category.order || 0,
    }));

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

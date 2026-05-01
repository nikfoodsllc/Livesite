import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Zipcode, DEFAULT_MIN_CART_VALUE, DEFAULT_DELIVERY_FEE } from '@/types/zipcode';

/**
 * GET /api/zipcode-config?zipcode={zipcode}
 * Public endpoint - no authentication required
 * Returns min cart value and delivery fee for a specific zipcode
 * Returns 404 error if zipcode is not in the database (not serviceable)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zipcode = searchParams.get('zipcode');

    if (!zipcode) {
      return Response.json({ error: 'Zipcode parameter is required' }, { status: 400 });
    }

    // Validate zipcode format (5 digits or 5+4 digits)
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    if (!zipcodeRegex.test(zipcode)) {
      return Response.json({ error: 'Invalid zipcode format. Expected format: 12345 or 12345-6789' }, { status: 400 });
    }

    // Lookup zipcode in database (collection name is "zincodes" as per admin)
    const result = await db.readOne<Zipcode>('zincodes', { zipcode });

    if (!result.success) {
      console.error('Database error:', result.error);
      return Response.json({ error: 'Failed to fetch zipcode configuration' }, { status: 500 });
    }

    // If zipcode found, return configured values
    if (result.data) {
      return NextResponse.json({
        success: true,
        data: {
          zipcode: result.data.zipcode,
          minCartValue: result.data.minCartValue,
          deliveryFee: result.data.deliveryFee || DEFAULT_DELIVERY_FEE, // Use default if not set
          configured: true, // Indicates this zipcode has custom config
        },
      });
    }

    // If zipcode not found, return error - this area is not serviceable
    return Response.json({
      error: 'This zip code is not serviceable. We currently don\'t deliver to this area.',
    }, { status: 404 });
  } catch (error) {
    console.error('Zipcode config API error:', error);
    return Response.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
  }
}

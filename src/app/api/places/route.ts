import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get search input from query params
    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input');

    if (!input || input.trim().length < 3) {
      return NextResponse.json(
        { error: 'Search input must be at least 3 characters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }

    // Call Google Maps Autocomplete API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&components=country:us`;

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch address suggestions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          data: {
            predictions: data.predictions || [],
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

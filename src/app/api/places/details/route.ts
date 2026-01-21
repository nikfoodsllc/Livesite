import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get place_id from query params
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');

    if (!placeId) {
      return NextResponse.json(
        { error: 'place_id parameter is required' },
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

    // Call Google Maps Place Details API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&key=${apiKey}`;

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch place details' },
        { status: 500 }
      );
    }

    const result = data.result;
    const addressComponents: Array<{ types: string[]; long_name?: string }> = result.address_components || [];

    // Extract address components
    const getComponent = (type: string) => {
      const component = addressComponents.find((c: { types: string[]; long_name?: string }) => c.types.includes(type));
      return component?.long_name || '';
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const street = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber;

    const formattedDetails = {
      street: street,
      town: getComponent('sublocality') || getComponent('sublocality_level_1'),
      city: getComponent('locality'),
      state: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      pincode: getComponent('postal_code'),
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
      full_address: result.formatted_address || '',
    };

    return NextResponse.json(
      {
        data: formattedDetails,
        message: 'Place details fetched successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

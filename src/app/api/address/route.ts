import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { IAddress, IUser } from '@/types/auth';
import { ObjectId as MongoObjectId, UpdateFilter, Filter } from 'mongodb';
import { z } from 'zod';
import { validateZipcodeServiceabilityServer } from '@/utils/zipcodeValidation';
import { validateUSPhone } from '@/utils/validation';

// Validation schema for address
const addressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone.trim().length === 0) return true; // Allow empty (optional)
    const validation = validateUSPhone(phone);
    return validation.valid;
  }, {
    message: 'Phone number must be 10 digits',
  }),
  street_address: z.string().min(5, 'Street address is too short'),
  city: z.string().min(2, 'City is required'),
  postal_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format. Expected format: 12345 or 12345-6789'),
  apartment: z.string().optional(),
  floor: z.string().optional(),
  entrance: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// Helper function to verify auth
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized - No token provided', status: 401 };
  }

  const token = authHeader.substring(7); // Use substring to extract token after "Bearer "

  const decoded = jwtHandler.verifyToken(token);

  if (!decoded.success || !decoded.payload) {
    return { error: decoded.error || 'Unauthorized - Invalid token', status: 401 };
  }

  return { userId: decoded.payload.userId };
}

// GET /api/address - Get user's addresses
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    console.log('[GET /api/address] userId from JWT:', userId);
    console.log('[GET /api/address] Query filter:', { user: userId });

    // Get all addresses for user
    // Note: user field is stored as string in the addresses collection
    const addressesResult = await db.read<IAddress>('addresses', {
      user: userId,
    } as unknown as Filter<IAddress>);

    // Check if the operation was successful
    if (!addressesResult.success) {
      return Response.json(
        { error: 'Failed to fetch addresses', details: addressesResult.error },
        { status: 500 }
      );
    }

    const addresses = (addressesResult.data || []).sort((a, b) => {
      // Sort by: isDefault (desc), then createdAt (desc)
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Both have same isDefault status, sort by createdAt
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    console.log('[GET /api/address] Found addresses:', addresses.length);
    if (addresses.length > 0) {
      console.log('[GET /api/address] First address user field:', addresses[0].user);
    }

    return Response.json(
      {
        success: true,
        data: {
          items: addresses.map((addr) => ({
            ...addr,
            _id: addr._id?.toString(),
            user: addr.user?.toString(),
          })),
          page: 1,
          pageSize: addresses.length,
          total: addresses.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get addresses error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/address - Create new address
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    // Validate userId format before ObjectId conversion
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return Response.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Test ObjectId conversion to catch invalid hex strings
    let userObjectId: MongoObjectId;
    try {
      userObjectId = new MongoObjectId(userId);
    } catch (error) {
      return Response.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = addressSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const addressData = validation.data;

    // Validate zip code serviceability
    const zipcodeValidation = await validateZipcodeServiceabilityServer(addressData.postal_code, db);
    if (!zipcodeValidation.isServiceable) {
      return Response.json(
        { error: zipcodeValidation.message || 'This area is not serviceable. We currently don\'t deliver to this zip code.' },
        { status: 400 }
      );
    }

    console.log('[POST /api/address] Creating address with userId:', userId);
    console.log('[POST /api/address] User ObjectId:', userObjectId);

    // If isDefault is true, atomically unset isDefault on all other addresses for this user
    if (addressData.isDefault === true) {
      await db.update<IAddress>(
        'addresses',
        { user: userObjectId, isDefault: true } as unknown as Filter<IAddress>,
        { $set: { isDefault: false, updatedAt: new Date() } }
      );
    }

    // Create new address
    const newAddress: Omit<IAddress, '_id'> = {
      user: userObjectId.toString(),
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      street_address: addressData.street_address,
      city: addressData.city,
      postal_code: addressData.postal_code,
      apartment: addressData.apartment,
      floor: addressData.floor,
      entrance: addressData.entrance,
      province: '', // Not used in form currently
      isDefault: addressData.isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.create<IAddress>('addresses', newAddress);

    if (!result || !result.success || !result.id) {
      return Response.json(
        { error: 'Failed to create address' },
        { status: 500 }
      );
    }

    const addressId = new MongoObjectId(result.id);

    // Update user: set isCompleted to true and add address to addresses array
    await db.updateOne(
      'users',
      { _id: userObjectId } as unknown as Filter<IUser>,
      {
        $set: {
          isCompleted: true,
          updatedAt: new Date(),
        },
        $push: {
          addresses: addressId,
        },
      } as UpdateFilter<IUser>
    );

    // Get created address
    const createdAddress = await db.readOne<IAddress>('addresses', {
      _id: addressId,
    } as unknown as Filter<IAddress>);

    return Response.json(
      {
        success: true,
        message: 'Address created successfully',
        data: {
          ...createdAddress.data,
          _id: createdAddress.data?._id?.toString(),
          user: createdAddress.data?.user?.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create address error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/address - Update address
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const { _id, ...addressData } = body;

    if (!_id) {
      return Response.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const validation = addressSchema.safeParse(addressData);

    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Validate zip code serviceability
    const zipcodeValidation = await validateZipcodeServiceabilityServer(validatedData.postal_code, db);
    if (!zipcodeValidation.isServiceable) {
      return Response.json(
        { error: zipcodeValidation.message || 'This area is not serviceable. We currently don\'t deliver to this zip code.' },
        { status: 400 }
      );
    }

    // Verify address belongs to user
    const existingAddress = await db.readOne<IAddress>('addresses', {
      _id: new MongoObjectId(_id),
      user: userId,
    } as unknown as Filter<IAddress>);

    if (!existingAddress.success || !existingAddress.data) {
      return Response.json(
        { error: 'Address not found or unauthorized' },
        { status: 404 }
      );
    }

    // If isDefault is true, atomically unset isDefault on all other addresses for this user
    if (validatedData.isDefault === true) {
      await db.update<IAddress>(
        'addresses',
        {
          user: userId,
          isDefault: true,
          _id: { $ne: new MongoObjectId(_id) } // Exclude current address
        } as unknown as Filter<IAddress>,
        { $set: { isDefault: false, updatedAt: new Date() } }
      );
    }

    // Update address
    const updateData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      street_address: validatedData.street_address,
      city: validatedData.city,
      postal_code: validatedData.postal_code,
      apartment: validatedData.apartment,
      floor: validatedData.floor,
      entrance: validatedData.entrance,
      isDefault: validatedData.isDefault,
      updatedAt: new Date(),
    };

    const updateResult = await db.updateOne(
      'addresses',
      { _id: new MongoObjectId(_id) } as unknown as Filter<IAddress>,
      { $set: updateData }
    );

    if (!updateResult.success) {
      return Response.json(
        { error: 'Failed to update address' },
        { status: 500 }
      );
    }

    // Get updated address
    const updatedAddress = await db.readOne<IAddress>('addresses', {
      _id: new MongoObjectId(_id),
    } as unknown as Filter<IAddress>);

    return Response.json(
      {
        success: true,
        message: 'Address updated successfully',
        data: {
          ...updatedAddress.data,
          _id: updatedAddress.data?._id?.toString(),
          user: updatedAddress.data?.user?.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update address error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/address - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    // Get address ID from query params
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return Response.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Verify address belongs to user
    const existingAddress = await db.readOne<IAddress>('addresses', {
      _id: new MongoObjectId(addressId),
      user: userId,
    } as unknown as Filter<IAddress>);

    if (!existingAddress.success || !existingAddress.data) {
      return Response.json(
        { error: 'Address not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete address
    const deleteResult = await db.delete('addresses', {
      _id: new MongoObjectId(addressId),
    } as unknown as Filter<IAddress>);

    if (!deleteResult.success) {
      return Response.json(
        { error: 'Failed to delete address' },
        { status: 500 }
      );
    }

    // Remove address from user's addresses array
    await db.updateOne(
      'users',
      { _id: new MongoObjectId(userId) } as unknown as Filter<IUser>,
      {
        $pull: {
          addresses: addressId,
        },
      } as UpdateFilter<IUser>
    );

    return Response.json(
      {
        success: true,
        message: 'Address deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete address error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

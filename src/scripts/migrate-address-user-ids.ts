import { db } from '@/lib/server/db';
import { ObjectId } from 'mongodb';

interface Address {
  _id: ObjectId;
  user: string | ObjectId;
  [key: string]: any;
}

/**
 * Migration Script: Convert String User IDs to ObjectId in Addresses
 *
 * This script migrates existing address documents where the 'user' field
 * is stored as a string instead of an ObjectId.
 *
 * Usage:
 *   npm run build
 *   node dist/scripts/migrate-address-user-ids.js
 *
 * Or with ts-node:
 *   ts-node src/scripts/migrate-address-user-ids.ts
 */
async function migrateAddressUserIds() {
  console.log('🚀 Starting migration: Converting string user IDs to ObjectId in addresses...');
  console.log('');

  try {
    // Get all addresses
    const addressesResult = await db.read<Address>('addresses');

    if (!addressesResult.success || !addressesResult.data) {
      console.log('⚠️  No addresses found or error occurred');
      return;
    }

    const addresses = addressesResult.data;
    console.log(`📊 Found ${addresses.length} addresses to check`);
    console.log('');

    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ addressId: string; userId: string; error: string }> = [];

    for (const address of addresses) {
      // Check if user field is string (not ObjectId)
      if (typeof address.user === 'string') {
        try {
          // Validate and convert string to ObjectId
          const objectId = new ObjectId(address.user);

          // Update address with ObjectId
          const updateResult = await db.updateOne(
            'addresses',
            { _id: address._id },
            { $set: { user: objectId } }
          );

          if (updateResult.success && updateResult.modifiedCount === 1) {
            migratedCount++;
            console.log(`✅ Migrated address ${address._id}`);
            console.log(`   User: ${address.user} -> ObjectId`);
          } else if (updateResult.success && updateResult.modifiedCount === 0) {
            skippedCount++;
            console.log(`⏭️  Skipped address ${address._id} (no changes needed)`);
          } else {
            errorCount++;
            console.error(`❌ Failed to update address ${address._id}`);
            if (updateResult.error) {
              errors.push({
                addressId: address._id.toString(),
                userId: address.user,
                error: updateResult.error
              });
            }
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to migrate address ${address._id}: ${errorMessage}`);
          errors.push({
            addressId: address._id.toString(),
            userId: address.user,
            error: errorMessage
          });
        }
      } else {
        skippedCount++;
        console.log(`⏭️  Address ${address._id} already has ObjectId user field`);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Migration Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${addresses.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (errors.length > 0) {
      console.log('');
      console.log('❌ Error Details:');
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. Address ID: ${err.addressId}`);
        console.log(`     User ID: ${err.userId}`);
        console.log(`     Error: ${err.error}`);
      });
    }

    console.log('');
    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('');
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Alternative: Bulk Migration Using MongoDB Bulk Operations
 *
 * This is more efficient for large datasets but requires direct collection access.
 * Uncomment and use this function if you have thousands of addresses to migrate.
 */
/*
async function migrateAddressUserIdsBulk() {
  console.log('🚀 Starting bulk migration...');

  try {
    const collection = await db.getCollectionForOperations<any>('addresses');

    // Find all addresses with string user IDs
    const addresses = await collection
      .find({ user: { $type: 'string' } })
      .toArray();

    console.log(`📊 Found ${addresses.length} addresses with string user IDs`);

    if (addresses.length === 0) {
      console.log('⏭️  No migrations needed');
      return;
    }

    // Prepare bulk operations
    const bulkOperations = addresses.map((address) => ({
      updateOne: {
        filter: { _id: address._id },
        update: { $set: { user: new ObjectId(address.user) } }
      }
    }));

    // Execute bulk write
    const result = await collection.bulkWrite(bulkOperations);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Bulk Migration Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully modified: ${result.modifiedCount}`);
    console.log(`❌ Errors: ${result.hasWriteErrors ? result.writeErrors.length : 0}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (result.hasWriteErrors) {
      console.log('');
      console.log('❌ Write Errors:');
      result.writeErrors.forEach((err, index) => {
        console.log(`  ${index + 1}. Index: ${err.index}, Error: ${err.errmsg}`);
      });
    }
  } catch (error) {
    console.error('💥 Bulk migration failed:', error);
    throw error;
  } finally {
    await db.close();
    console.log('🔌 Database connection closed');
  }
}
*/

// Execute the migration
migrateAddressUserIds()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

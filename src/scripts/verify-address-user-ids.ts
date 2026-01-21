import { db } from '@/lib/server/db';
import { ObjectId } from 'mongodb';

interface Address {
  _id: ObjectId;
  user: string | ObjectId;
  [key: string]: any;
}

/**
 * Verification Script: Check Address User ID Formats
 *
 * This script checks the current state of address documents to see
 * if they have string or ObjectId user IDs.
 *
 * Usage:
 *   npm run verify:address-user-ids
 *   or
 *   npx ts-node src/scripts/verify-address-user-ids.ts
 */
async function verifyAddressUserIds() {
  console.log('🔍 Verifying address user ID formats...');
  console.log('');

  try {
    // Get all addresses
    const addressesResult = await db.read<Address>('addresses');

    if (!addressesResult.success || !addressesResult.data) {
      console.log('⚠️  No addresses found or error occurred');
      return;
    }

    const addresses = addressesResult.data;
    const totalAddresses = addresses.length;

    let stringUserIds = 0;
    let objectIds = 0;
    let invalidIds = 0;

    const sampleStringIds: string[] = [];
    const sampleObjectIds: string[] = [];
    const sampleInvalidIds: string[] = [];

    for (const address of addresses) {
      if (typeof address.user === 'string') {
        stringUserIds++;
        if (sampleStringIds.length < 5) {
          sampleStringIds.push(`${address._id}: user="${address.user}"`);
        }

        // Check if it's a valid ObjectId format
        try {
          new ObjectId(address.user);
        } catch {
          invalidIds++;
          if (sampleInvalidIds.length < 5) {
            sampleInvalidIds.push(`${address._id}: user="${address.user}"`);
          }
        }
      } else if (address.user instanceof ObjectId) {
        objectIds++;
        if (sampleObjectIds.length < 5) {
          sampleObjectIds.push(`${address._id}: user=ObjectId(${address.user})`);
        }
      } else {
        invalidIds++;
        if (sampleInvalidIds.length < 5) {
          sampleInvalidIds.push(`${address._id}: user=${JSON.stringify(address.user)}`);
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Verification Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Total addresses: ${totalAddresses}`);
    console.log(`🔤 String user IDs: ${stringUserIds} (${((stringUserIds / totalAddresses) * 100).toFixed(1)}%)`);
    console.log(`🆔 ObjectId user IDs: ${objectIds} (${((objectIds / totalAddresses) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Invalid user IDs: ${invalidIds} (${((invalidIds / totalAddresses) * 100).toFixed(1)}%)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (stringUserIds > 0) {
      console.log('');
      console.log('📝 Sample addresses with STRING user IDs:');
      sampleStringIds.forEach((sample, index) => {
        console.log(`  ${index + 1}. ${sample}`);
      });
    }

    if (objectIds > 0) {
      console.log('');
      console.log('📝 Sample addresses with OBJECTID user IDs:');
      sampleObjectIds.forEach((sample, index) => {
        console.log(`  ${index + 1}. ${sample}`);
      });
    }

    if (invalidIds > 0) {
      console.log('');
      console.log('⚠️  Sample addresses with INVALID user IDs:');
      sampleInvalidIds.forEach((sample, index) => {
        console.log(`  ${index + 1}. ${sample}`);
      });
    }

    console.log('');

    // Provide recommendations
    if (stringUserIds > 0) {
      console.log('🔧 Recommendation: Run migration to convert string IDs to ObjectId');
      console.log('   Command: npm run migrate:address-user-ids');
    } else if (invalidIds === 0) {
      console.log('✅ All addresses have properly formatted ObjectId user IDs!');
      console.log('   No migration needed.');
    }

    if (invalidIds > 0) {
      console.log('');
      console.log('⚠️  Warning: Found invalid user IDs that need manual attention!');
    }

  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('');
    console.log('🔌 Database connection closed');
  }
}

// Execute verification
verifyAddressUserIds()
  .then(() => {
    console.log('✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

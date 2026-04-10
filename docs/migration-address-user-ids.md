# Address User ID Migration Documentation

## Overview

This document describes the migration process for converting address documents with string user IDs to ObjectId format.

## Migration Date

**Date Performed:** [Fill in after execution]
**Performed By:** [Fill in after execution]
**Environment:** [Development/Staging/Production]

## Problem

The `addresses` collection in MongoDB contained documents where the `user` field was stored as a string instead of an ObjectId. This inconsistency could cause issues with:
- Query performance
- Data integrity
- Referential constraints
- Index optimization

## Solution

Created a migration script that:
1. Reads all addresses from the database
2. Identifies addresses where `user` field is a string
3. Converts the string to a valid ObjectId
4. Updates the document with the ObjectId format
5. Provides detailed logging and error reporting

## File Location

`src/scripts/migrate-address-user-ids.ts`

## Execution Instructions

### Prerequisites

1. Ensure MongoDB connection is configured in environment variables
2. Backup the database before running migration
3. Ensure Node.js dependencies are installed

### Execution Methods

#### Method 1: Using TypeScript Directly (Development)

```bash
# Install ts-node if not already installed
npm install -D ts-node

# Run the script
ts-node src/scripts/migrate-address-user-ids.ts
```

#### Method 2: Build and Run (Production/Staging)

```bash
# Build the project
npm run build

# Run the compiled script
node dist/scripts/migrate-address-user-ids.js
```

#### Method 3: Using NPM Script (Add to package.json)

Add to `package.json`:

```json
{
  "scripts": {
    "migrate:address-user-ids": "ts-node src/scripts/migrate-address-user-ids.ts"
  }
}
```

Then run:

```bash
npm run migrate:address-user-ids
```

## Migration Output

The script provides the following output:

- **Total addresses checked:** Number of addresses in the collection
- **Successfully migrated:** Number of addresses updated to ObjectId
- **Skipped:** Number of addresses that already had ObjectId format
- **Errors:** Number of addresses that failed to migrate
- **Error details:** Specific error messages for any failures

### Example Output

```
🚀 Starting migration: Converting string user IDs to ObjectId in addresses...

📊 Found 150 addresses to check

✅ Migrated address 6758a3f2e4b0d8f9c1d2e3f4
   User: 6758a3d8e4b0d8f9c1d2e3f5 -> ObjectId
✅ Migrated address 6758a3f5e4b0d8f9c1d2e3f6
   User: 6758a3d9e4b0d8f9c1d2e3f7 -> ObjectId
⏭️  Address 6758a3f8e4b0d8f9c1d2e3f8 already has ObjectId user field

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Migration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Successfully migrated: 85
⏭️  Skipped: 63
❌ Errors: 2
📊 Total processed: 150
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Migration completed!
🔌 Database connection closed
```

## Verification

After running the migration, verify the results:

### 1. Check Migration Summary

Review the console output for:
- Number of successful migrations
- Any errors that occurred
- Total addresses processed

### 2. Manual Database Verification

Connect to MongoDB and run:

```javascript
// Check if any string user IDs remain
db.addresses.find({ user: { $type: 'string' } }).count()

// Sample check of ObjectId format
db.addresses.find({}).limit(5).pretty()

// Verify user field is ObjectId
db.addresses.find({}).limit(5).forEach(doc => {
  print(typeof doc.user); // Should print "object"
})
```

### 3. Application Verification

- Test address creation in the application
- Test address retrieval by user ID
- Verify no errors in application logs related to addresses

## Rollback Plan

If issues occur, you can rollback using:

```javascript
// Rollback script (if needed)
db.addresses.find({ user: { $type: 'objectId' } }).forEach(function(doc) {
  db.addresses.updateOne(
    { _id: doc._id },
    { $set: { user: doc.user.toString() } }
  );
});
```

## Alternative Bulk Migration

For large datasets (thousands of addresses), an alternative bulk migration function is included in the script (commented out). This uses MongoDB's bulkWrite operation for better performance.

To use the bulk migration:

1. Open `src/scripts/migrate-address-user-ids.ts`
2. Comment out the main migration call
3. Uncomment the `migrateAddressUserIdsBulk()` function
4. Call `migrateAddressUserIdsBulk()` instead of `migrateAddressUserIds()`

## Post-Migration Tasks

- [ ] Run migration in development environment
- [ ] Verify all addresses migrated successfully
- [ ] Test application functionality
- [ ] Run migration in staging environment
- [ ] Perform thorough testing
- [ ] Schedule and execute production migration
- [ ] Monitor production logs for any address-related errors
- [ ] Update this document with execution date and results

## Troubleshooting

### Issue: "DATABASE_URL not available during build time"

**Solution:** The script is trying to run during build time. Run it after build using Node.js directly.

### Issue: "Invalid ObjectId"

**Solution:** The string user ID is not a valid MongoDB ObjectId format. Check if user IDs are corrupt or if there's a data integrity issue.

### Issue: "Connection timeout"

**Solution:** Ensure MongoDB is accessible and DATABASE_URL environment variable is correctly set.

## Related Files

- Migration Script: `src/scripts/migrate-address-user-ids.ts`
- Database Handler: `src/lib/server/db.ts`
- Address Model: (Check for address-related models or types)

## Contact

For questions or issues related to this migration, contact:
- Development Team
- Database Administrator

---

**Last Updated:** 2026-01-12

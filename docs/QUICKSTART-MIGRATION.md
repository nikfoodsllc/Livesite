# Quick Start: Address User ID Migration

## ⚡ Quick Commands

### 1. Install Required Dependency
```bash
npm install -D ts-node
```

### 2. Check Current State
```bash
npm run verify:address-user-ids
```

### 3. Run Migration
```bash
npm run migrate:address-user-ids
```

### 4. Verify Results
```bash
npm run verify:address-user-ids
```

## 📋 Pre-Migration Checklist

- [ ] Database backup created
- [ ] DATABASE_URL environment variable set
- [ ] Tested in development/staging environment
- [ ] Application ready for potential downtime (if in production)

## 🎯 What This Migration Does

Converts address documents where the `user` field is stored as a **string** to **ObjectId** format.

**Before:**
```javascript
{
  _id: ObjectId("..."),
  user: "507f1f77bcf86cd799439011",  // String
  street: "123 Main St",
  ...
}
```

**After:**
```javascript
{
  _id: ObjectId("..."),
  user: ObjectId("507f1f77bcf86cd799439011"),  // ObjectId
  street: "123 Main St",
  ...
}
```

## 📊 Expected Output

### Verification Output
```
🔍 Verifying address user ID formats...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Verification Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Total addresses: 150
🔤 String user IDs: 85 (56.7%)
🆔 ObjectId user IDs: 63 (42.0%)
⚠️  Invalid user IDs: 2 (1.3%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Recommendation: Run migration to convert string IDs to ObjectId
   Command: npm run migrate:address-user-ids
```

### Migration Output
```
🚀 Starting migration: Converting string user IDs to ObjectId...

📊 Found 150 addresses to check

✅ Migrated address 6758a3f2e4b0d8f9c1d2e3f4
   User: 6758a3d8e4b0d8f9c1d2e3f5 -> ObjectId
✅ Migrated address 6758a3f5e4b0d8f9c1d2e3f6
   User: 6758a3d9e4b0d8f9c1d2e3f7 -> ObjectId
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Migration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Successfully migrated: 85
⏭️  Skipped: 63
❌ Errors: 0
📊 Total processed: 150
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Migration completed!
```

## 🚨 Troubleshooting

### "ts-node command not found"
```bash
npm install -D ts-node
```

### "DATABASE_URL not available"
Check your `.env` file or environment variables:
```bash
echo $DATABASE_URL
```

### Connection timeout
- Verify MongoDB is running
- Check DATABASE_URL is correct
- Ensure network/firewall allows connection

## 📚 Full Documentation

- **Detailed Guide:** `docs/migration-address-user-ids.md`
- **Implementation Summary:** `docs/migration-summary.md`
- **Scripts README:** `src/scripts/README.md`

## ⚙️ Advanced Options

### Alternative: Build and Run
```bash
npm run build
node dist/scripts/migrate-address-user-ids.js
```

### Alternative: Direct ts-node
```bash
npx ts-node src/scripts/migrate-address-user-ids.ts
```

### Bulk Migration (for large datasets)
Edit `src/scripts/migrate-address-user-ids.ts` and uncomment the `migrateAddressUserIdsBulk()` function.

## 🔒 Rollback

If needed, rollback using MongoDB shell:
```javascript
db.addresses.find({ user: { $type: 'objectId' } }).forEach(function(doc) {
  db.addresses.updateOne(
    { _id: doc._id },
    { $set: { user: doc.user.toString() } }
  );
});
```

## ✅ Success Indicators

After migration, verification should show:
- ✅ String user IDs: 0 (0.0%)
- ✅ ObjectId user IDs: 100% (or close to it)
- ✅ No errors reported
- ✅ Application working normally

---

**Last Updated:** 2026-01-12

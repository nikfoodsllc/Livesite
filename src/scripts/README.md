# Database Migration Scripts

This directory contains database migration scripts for maintaining and updating the database schema and data.

## Available Migrations

### 1. Address User IDs Migration
**File:** `migrate-address-user-ids.ts`

**Purpose:** Converts address documents with string user IDs to ObjectId format.

**When to Run:**
- When you need to fix address documents with string user IDs
- After database schema changes
- During maintenance operations

## How to Run Migrations

### Option 1: Using npm script (Recommended)

1. First, ensure dependencies are installed:
```bash
npm install
```

2. Install ts-node if not already installed:
```bash
npm install -D ts-node
```

3. Run the migration:
```bash
npm run migrate:address-user-ids
```

### Option 2: Using ts-node directly

```bash
npx ts-node src/scripts/migrate-address-user-ids.ts
```

### Option 3: Build and run with Node.js

1. Build the project:
```bash
npm run build
```

2. Run the compiled script:
```bash
node dist/scripts/migrate-address-user-ids.js
```

## Pre-Migration Checklist

Before running any migration:

- [ ] **Backup Database**: Always create a database backup before running migrations
- [ ] **Test Environment**: Run the migration in development/staging first
- [ ] **Review Code**: Read and understand the migration script
- [ ] **Check Dependencies**: Ensure all required environment variables are set
- [ ] **Schedule Downtime**: For production migrations, schedule appropriate downtime if needed

## Post-Migration Checklist

After running a migration:

- [ ] **Verify Results**: Check the migration summary output
- [ ] **Test Application**: Ensure the application works correctly
- [ ] **Check Logs**: Review application logs for any errors
- [ ] **Monitor Performance**: Watch for any performance issues
- [ ] **Update Documentation**: Document the migration results

## Environment Variables Required

Make sure these environment variables are set before running migrations:

- `DATABASE_URL`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)

## Troubleshooting

### Common Issues

1. **"Cannot find module '@/lib/server/db'"**
   - Solution: Make sure you're running from the project root directory
   - The @ alias is configured in tsconfig.json

2. **"DATABASE_URL not available"**
   - Solution: Ensure DATABASE_URL environment variable is set
   - Check your .env file or environment configuration

3. **TypeScript compilation errors**
   - Solution: Ensure all dependencies are installed
   - Run `npm install` to install missing packages

4. **MongoDB connection errors**
   - Solution: Verify DATABASE_URL is correct
   - Check if MongoDB server is running and accessible

## Creating New Migrations

When creating a new migration script:

1. Create a new `.ts` file in this directory
2. Follow the naming convention: `migrate-{description}.ts`
3. Use the existing scripts as a template
4. Include comprehensive error handling
5. Add detailed logging
6. Update this README with the new migration details
7. Create documentation in `/docs` folder
8. Add npm script to `package.json` if needed

### Migration Script Template

```typescript
import { db } from '@/lib/server/db';

async function migrateSomething() {
  console.log('🚀 Starting migration...');

  try {
    // Your migration logic here
    const result = await db.read('collection', {});

    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

migrateSomething()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
```

## Safety Tips

- **Always test first**: Run migrations in non-production environments first
- **Use transactions**: For complex migrations, use MongoDB transactions if available
- **Backup data**: Never run migrations without a recent backup
- **Monitor progress**: Watch the console output during migration
- **Plan rollback**: Have a rollback plan ready before starting
- **Document everything**: Keep records of all migrations performed

## Additional Resources

- [Migration Documentation](../docs/migration-address-user-ids.md)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/backup-restore/)
- [Database Handler Code](../lib/server/db.ts)

---

**Last Updated:** 2026-01-12

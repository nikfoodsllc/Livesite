# Day-to-Date System Migration Guide

**Version**: 1.0
**Last Updated**: January 5, 2025
**Status**: 🟡 Active Migration

---

## Quick Navigation

This guide provides comprehensive documentation for migrating from the day-of-week system to the date-based delivery system.

### 📚 Documentation Index

1. **[Overview](./overview.md)** ← **Start Here**
   - Why the migration was done
   - Key differences between systems
   - Migration timeline
   - Impact on codebase

2. **[Deprecated Functions Reference](./deprecated-functions.md)**
   - Complete list of deprecated functions
   - New function replacements
   - Migration examples for each function
   - TypeScript type changes

3. **[API Endpoint Migration](./api-migration.md)**
   - Deprecated vs. new API endpoints
   - Request/response format changes
   - Migration examples
   - Testing checklist

4. **[Cart Data Migration](./cart-data-migration.md)**
   - Understanding cart data structure
   - Handling old cart data
   - LocalStorage and server-side migration
   - Data validation

5. **[New Usage Patterns](./new-usage-patterns.md)**
   - Practical code examples
   - Common use cases
   - Before/after comparisons
   - Best practices

6. **[Removal Timeline](./removal-timeline.md)**
   - Deprecation schedule
   - Migration checklist
   - Breaking changes
   - Rollback strategy

---

## Executive Summary

### What Changed?

The delivery system has been upgraded from a **day-of-week** pattern (Monday, Tuesday, etc.) to a **date-based** system (2025-01-20, 2025-01-21, etc.).

**⚠️ IMPORTANT - Day Name Format Change:**
- **Old format**: Day names in lowercase (e.g., "monday", "tuesday", "wednesday")
- **New format**: Day names in Title Case (e.g., "Monday", "Tuesday", "Wednesday")
- This change ensures consistency with JavaScript's `toLocaleDateString()` formatting
- The `day` field in cart items and types now uses Title Case format

### Why?

- ✅ Enable specific date management (holidays, events)
- ✅ Better admin control over individual dates
- ✅ Improved future planning capabilities
- ✅ More flexible scheduling options

### Impact

- **Database**: New `availableDates` collection replaces `availableDays`
- **API**: New `/api/available-dates` endpoint replaces old endpoints
- **Types**: New `date` field alongside legacy `day` field
- **Functions**: New date-based utilities replace old day-based functions

### Timeline

| Milestone | Date |
|-----------|------|
| Deprecation Announced | January 2025 |
| Soft Migration Complete | June 2025 |
| **Code Removal** | **July 2025** |
| Data Migration Complete | December 2025 |
| **Complete Cleanup** | **January 2026** |

---

## Quick Start Guide

### For Developers

#### 1. Update Your Imports

**❌ Old (Deprecated)**:
```typescript
import { generateAvailableDaysFromAPI } from '@/lib/dayAvailabilityClient';
import { getNextAvailableDay } from '@/lib/server/dayAvailability';
```

**✅ New (Recommended)**:
```typescript
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';
import { getNextAvailableDate } from '@/lib/server/availableDates';
```

#### 2. Update Function Calls

**❌ Old (Deprecated)**:
```typescript
const days = await generateAvailableDaysFromAPI(false);
const nextDay = await getNextAvailableDay();
```

**✅ New (Recommended)**:
```typescript
const dates = await generateAvailableDatesFromAPI(false);
const nextDate = await getNextAvailableDate();
```

#### 3. Update API Calls

**❌ Old (Deprecated)**:
```typescript
const response = await fetch('/api/days/available');
const data = await response.json();
const days = data.days;
```

**✅ New (Recommended)**:
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();
const dates = data.dates;
```

#### 4. Update Cart Operations

**❌ Old (Deprecated)**:
```typescript
// Old system used lowercase day names
await addItem('monday', foodItem, quantity, customizations);
```

**✅ New (Recommended)**:
```typescript
// New system uses Title Case day names for consistency
await addItem('Monday', '2025-01-20', foodItem, quantity, customizations);
```

---

## Common Migration Patterns

### Pattern 1: Fetching Available Dates

```typescript
// Get available delivery dates
const dates = await generateAvailableDatesFromAPI();

// Filter for specific range
const januaryDates = await generateAvailableDatesFromAPI(
  false,        // includeDisabled
  '2025-01-01', // startDate
  '2025-01-31'  // endDate
);

// Find specific date
const targetDate = dates.find(d => d.date === '2025-01-20');
```

### Pattern 2: Adding Items to Cart

```typescript
// Add item with date
const deliveryDate = '2025-01-20';
await addItem(
  'Monday',           // Day name in Title Case (backward compatibility)
  deliveryDate,       // Date string (preferred)
  foodItem,
  quantity,
  customizations
);
```

### Pattern 3: Displaying Dates

```typescript
// Format date for display
const dateObj = new Date(dateOption.date + 'T00:00:00.000Z');
const formatted = dateObj.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'America/Los_Angeles'
});

// Output: "Monday, January 20, 2025"
```

---

## Key Differences

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Identifier** | Day name ("monday") - lowercase | Date string ("2025-01-20") |
| **Day Name Format** | lowercase ("monday") | Title Case ("Monday") |
| **Granularity** | Weekly recurring | Individual calendar dates |
| **Flexibility** | All Mondays same | Each date independent |
| **Database** | `availableDays` | `availableDates` |
| **API** | `/api/days/available` | `/api/available-dates` |
| **Field** | `day` | `date` |

---

## Migration Checklist

Use this checklist to track your migration progress:

### Phase 1: Assessment (Week 1)
- [ ] Read [Overview](./overview.md)
- [ ] Identify all usages of deprecated functions
- [ ] Audit codebase for `day` field usage
- [ ] Review current API integrations

### Phase 2: Planning (Week 2)
- [ ] Create migration tickets
- [ ] Estimate migration effort
- [ ] Schedule migration work
- [ ] Assign tasks to team members

### Phase 3: Implementation (Weeks 3-8)
- [ ] Update all server-side function calls
- [ ] Update all client-side function calls
- [ ] Migrate all API endpoints
- [ ] Update cart operations
- [ ] Update UI components

### Phase 4: Testing (Week 9-10)
- [ ] Unit tests updated and passing
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] Performance validated

### Phase 5: Deployment (Week 11)
- [ ] Deploy to staging
- [ ] Final validation in staging
- [ ] Deploy to production
- [ ] Monitor for issues

### Phase 6: Cleanup (Week 12+)
- [ ] Remove deprecated code (July 2025)
- [ ] Update documentation
- [ ] Archive old code
- [ ] Complete data migration (January 2026)

---

## Getting Help

### Documentation

- **General Questions**: Start with [Overview](./overview.md)
- **Function Migration**: See [Deprecated Functions](./deprecated-functions.md)
- **API Changes**: See [API Migration](./api-migration.md)
- **Data Issues**: See [Cart Data Migration](./cart-data-migration.md)
- **Code Examples**: See [New Usage Patterns](./new-usage-patterns.md)

### Common Issues

#### Issue: "Function not found" error
**Solution**: Update your imports to use new functions
```typescript
// ❌ Wrong
import { generateAvailableDaysFromAPI } from '@/lib/dayAvailabilityClient';

// ✅ Correct
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';
```

#### Issue: "API endpoint not found"
**Solution**: Update API endpoint URL
```typescript
// ❌ Wrong
fetch('/api/days/available')

// ✅ Correct
fetch('/api/available-dates')
```

#### Issue: Cart items missing date field
**Solution**: Use cart migration helper
```typescript
import { migrateLocalStorageCart } from '@/lib/localStorageCart';

await migrateLocalStorageCart();
```

### Support Channels

1. **Internal Teams**: Slack #engineering-migration
2. **Bug Reports**: Create GitHub issue with `migration` tag
3. **Questions**: Contact migration lead
4. **Blocking Issues**: Contact engineering manager

---

## Monitoring

### Track Migration Progress

**Deprecated Function Usage**:
```bash
# Check logs for deprecated function calls
grep "DEPRECATED" logs/app.log | wc -l
```

**API Endpoint Usage**:
```bash
# Monitor old endpoint usage
grep "/api/days/available" logs/access.log | wc -l
```

**Success Metrics**:
- Deprecated function calls: 📉 Decreasing
- New function usage: 📈 Increasing
- Error rates: 📊 Stable
- Performance: ✅ Acceptable

---

## Important Dates

### 🚨 Removal Deadlines

| What | When |
|------|------|
| Server functions removed | **July 1, 2025** |
| Client functions removed | **July 1, 2025** |
| Old API endpoints removed | **July 1, 2025** |
| Type fields removed | **January 1, 2026** |
| Database collection removed | **January 1, 2026** |

### 📋 Upcoming Milestones

- **April 1, 2025**: 3-month warning
- **June 1, 2025**: 1-month warning
- **June 23, 2025**: 1-week warning
- **July 1, 2025**: Code removal

---

## Best Practices

### ✅ Do

1. **Start migration early** - Don't wait until deadline
2. **Test thoroughly** - Cover all use cases
3. **Monitor logs** - Watch for deprecated function calls
4. **Update tests** - Keep tests in sync with code
5. **Document changes** - Help future developers

### ❌ Don't

1. **Don't ignore warnings** - Deprecation warnings matter
2. **Don't mix systems** - Use new system for new code
3. **Don't skip testing** - Migration bugs are expensive
4. **Don't wait to migrate** - Deadline will arrive
5. **Don't break backward compatibility** - During transition period

---

## Resources

### Code Examples

See [New Usage Patterns](./new-usage-patterns.md) for:
- Date selection components
- Cart operations
- API integrations
- Display patterns
- Common use cases

### Testing

See [API Migration](./api-migration.md#testing-checklist) for:
- Unit test examples
- Integration test examples
- End-to-end test scenarios

### Rollback

See [Removal Timeline](./removal-timeline.md#rollback-strategy) for:
- Rollback procedures
- Feature flag usage
- Emergency contacts

---

## Summary

This migration provides a more flexible and powerful delivery system. While the transition requires effort, the benefits are significant:

✅ **Better User Experience**: Clear delivery dates
✅ **More Control**: Date-specific availability
✅ **Future-Proof**: Easy to manage holidays and events
✅ **Scalable**: Ready for any scheduling needs

**Next Step**: Read the [Overview](./overview.md) to understand why this migration happened and how it affects your code.

---

**Document Version**: 1.0
**Last Updated**: January 5, 2025
**Maintenance**: Engineering Team
**Feedback**: Create GitHub issue or contact migration lead

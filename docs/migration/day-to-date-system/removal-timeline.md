# Deprecated Code Removal Timeline

## Table of Contents
- [Overview](#overview)
- [Deprecation Policy](#deprecation-policy)
- [Removal Schedule](#removal-schedule)
- [Migration Checklist](#migration-checklist)
- [Breaking Changes](#breaking-changes)
- [Rollback Strategy](#rollback-strategy)
- [Communication Plan](#communication-plan)

---

## Overview

This document outlines the timeline for removing deprecated code from the day-of-week to date-based system migration. Following this timeline ensures a smooth transition without breaking existing functionality.

### Key Dates

- **Deprecation Announcement**: January 2025
- **End of Life (EOL) for Old Functions**: July 2025 (6 months after deprecation)
- **Complete Removal**: January 2026 (12 months after deprecation)

---

## Deprecation Policy

### 3-Phase Removal Process

#### Phase 1: Deprecation Warning (Months 1-3)
- ✅ Completed (January 2025 - March 2025)
- Old functions marked with `@deprecated` JSDoc comments
- Console warnings added when deprecated functions are called
- Documentation published
- New functions implemented and tested

#### Phase 2: Soft Migration (Months 4-6)
- 🔄 Current Phase (April 2025 - June 2025)
- Both old and new systems functional
- Gradual migration of codebase
- Monitoring of deprecated function usage
- Bug fixes and refinement of new system

#### Phase 3: Hard Removal (Months 7-12)
- ⏳ Planned (July 2025 - December 2025)
- Remove deprecated functions from codebase
- Remove backward compatibility fields
- Update all remaining references
- Final testing and validation

#### Phase 4: Complete Cleanup (Month 12+)
- ⏳ Planned (January 2026+)
- Remove old database collection (`availableDays`)
- Remove old API endpoints
- Final documentation cleanup

---

## Removal Schedule

### Server-Side Functions

**File**: `src/lib/server/dayAvailability.ts`

**Status**: 🚫 Entire file deprecated

**Removal Date**: July 2025

| Function | Deprecated | Removal | Replacement |
|----------|------------|---------|-------------|
| `getEnabledDaysFromDatabase()` | Jan 2025 | Jul 2025 | `getAvailableDatesFromDatabase()` |
| `getEnabledDaysFromDB()` | Jan 2025 | Jul 2025 | `getAvailableDatesFromDatabase()` |
| `generateAvailableDays()` | Jan 2025 | Jul 2025 | `generateAvailableDateOptions()` |
| `getNextAvailableDay()` | Jan 2025 | Jul 2025 | `getNextAvailableDate()` |
| `getDayOption(dayName)` | Jan 2025 | Jul 2025 | Date-based queries |
| `isDayDisabled(date)` | Jan 2025 | Jul 2025 | `isDateDisabled(date)` |
| `isTomorrow(date)` | Jan 2025 | Jul 2025 | PST timezone utilities |

**Action Required**: Complete migration by **July 2025**

---

### Client-Side Functions

**File**: `src/lib/dayAvailabilityClient.ts`

| Function | Deprecated | Removal | Replacement |
|----------|------------|---------|-------------|
| `getEnabledDaysFromAPI()` | Jan 2025 | Jul 2025 | `generateAvailableDatesFromAPI()` |
| `generateAvailableDaysFromAPI()` | Jan 2025 | Jul 2025 | `generateAvailableDatesFromAPI()` |
| `getDayOptionFromAPI(dayName)` | Jan 2025 | Jul 2025 | `generateAvailableDatesFromAPI().find()` |

**Removal Date**: July 2025

**Action Required**: Complete migration by **July 2025**

---

### API Endpoints

| Endpoint | Deprecated | Removal | Replacement |
|----------|------------|---------|-------------|
| `GET /api/enabled-days` | Jan 2025 | Jul 2025 | `GET /api/available-dates` |
| `GET /api/days/available` | Jan 2025 | Jul 2025 | `GET /api/available-dates` |
| `GET /api/days/option` | Jan 2025 | Jul 2025 | `GET /api/available-dates` + filtering |

**Removal Date**: July 2025

**Action Required**: Update all API calls by **July 2025**

---

### TypeScript Types

**File**: `src/types/cart.ts`

| Type/Field | Deprecated | Removal | Replacement |
|------------|------------|---------|-------------|
| `DayType` | Jan 2025 | Jan 2026 | `DateType` (for new code) |
| `day` field in `CartItem` | Jan 2025 | Jan 2026 | `date` field |
| `day` field in `CartDay` | Jan 2025 | Jan 2026 | `date` field |

**Removal Date**: January 2026 (extended for data migration)

**Action Required**: Complete cart data migration by **January 2026**

---

### Database Collections

| Collection | Deprecated | Removal | Replacement |
|------------|------------|---------|-------------|
| `availableDays` | Jan 2025 | Jan 2026 | `availableDates` |

**Removal Date**: January 2026

**Action Required**: Admin panel updates complete by **January 2026**

---

## Migration Checklist

### Before Removal (Complete by July 2025)

#### Server-Side Code
- [ ] Replace all imports of `dayAvailability.ts` with `availableDates.ts`
- [ ] Update all function calls to use new signatures
- [ ] Remove references to deprecated functions
- [ ] Update server-side validation logic
- [ ] Test all date-related operations
- [ ] Update error handling for new response formats

#### Client-Side Code
- [ ] Replace all imports from deprecated client functions
- [ ] Update all UI components to use date-based system
- [ ] Update form validations
- [ ] Update localStorage key usage (if changed)
- [ ] Test all user-facing date selections
- [ ] Update error messages for new formats

#### API Integration
- [ ] Update all `fetch()` calls to use new endpoints
- [ ] Update request/response type definitions
- [ ] Update authentication tokens (if needed)
- [ ] Update error handling for new error responses
- [ ] Test all API integrations
- [ ] Update API documentation

#### Testing
- [ ] Unit tests updated for new functions
- [ ] Integration tests updated
- [ ] End-to-end tests passing
- [ ] Manual testing completed
- [ ] Performance testing completed
- [ ] Load testing completed

---

### Before Complete Cleanup (Complete by January 2026)

#### Data Migration
- [ ] All cart data migrated to use `date` field
- [ ] `day` field removed from database schema
- [ ] Database migration scripts tested
- [ ] Backup of old data verified
- [ ] Rollback plan documented
- [ ] Migration monitoring in place

#### Database Cleanup
- [ ] `availableDays` collection backed up
- [ ] Admin panel migrated to use `availableDates`
- [ ] Old collection removed from production
- [ ] Database indexes updated
- [ ] Database performance validated

#### Final Code Cleanup
- [ ] Remove all `@deprecated` code blocks
- [ ] Remove backward compatibility fields
- [ ] Remove type aliases (DayType)
- [ ] Update all JSDoc comments
- [ ] Remove deprecation warnings
- [ ] Final code review completed

---

## Breaking Changes

### July 2025 Removal

**What Breaks**:
1. All imports from `src/lib/server/dayAvailability.ts`
2. All deprecated client functions in `dayAvailabilityClient.ts`
3. Old API endpoints (`/api/enabled-days`, `/api/days/available`, `/api/days/option`)

**Impact**:
- Any code still using deprecated functions will fail
- Old API clients will receive 404 errors
- Type errors if deprecated types are still referenced

**Mitigation**:
- Monitor usage logs for deprecated function calls
- Send warnings to development team
- Provide migration assistance
- Have rollback plan ready

---

### January 2026 Removal

**What Breaks**:
1. Code accessing `day` field on cart items
2. `DayType` type annotations
3. `availableDays` database collection access
4. Admin panel day-based configuration

**Impact**:
- Runtime errors if `day` field is accessed
- Database queries on `availableDays` fail
- Admin panel features break

**Mitigation**:
- Ensure all cart data has `date` field
- Remove all `day` field references
- Complete admin panel migration
- Test data migration thoroughly

---

## Rollback Strategy

### If Issues Arise After July 2025 Removal

**Immediate Actions** (Hours 0-24):
1. **Feature Flags**: Enable feature flag to revert to old system
2. **Code Rollback**: Revert commit that removed deprecated code
3. **Database**: Ensure `availableDays` collection still exists
4. **API**: Restore old endpoints if removed
5. **Monitoring**: Watch for error spikes

**Follow-up Actions** (Days 1-7):
1. **Analysis**: Investigate root cause of failure
2. **Hotfix**: Create fix for new system
3. **Testing**: Thoroughly test hotfix
4. **Staging**: Validate in staging environment
5. **Communication**: Update team on status

**Prevention** (Future):
1. **Extended Timeline**: Delay removal if migration incomplete
2. **Better Monitoring**: Add alerts for deprecated function usage
3. **Incremental Removal**: Remove in smaller batches
4. **Documentation**: Document all edge cases

### Rollback Code Example

```typescript
// Feature flag to control system
const USE_DATE_BASED_SYSTEM = process.env.NEXT_PUBLIC_USE_DATE_SYSTEM === 'true';

// Unified interface
export async function getAvailableOptions() {
  if (USE_DATE_BASED_SYSTEM) {
    // New system
    return getAvailableDatesFromDatabase();
  } else {
    // Old system (rollback)
    return getEnabledDaysFromDatabase();
  }
}

// Component usage
function DateSelector() {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getAvailableOptions().then(setOptions);
  }, []);

  return (
    <select>
      {options.map(opt => (
        <option key={opt.id} value={USE_DATE_BASED_SYSTEM ? opt.date : opt.day}>
          {USE_DATE_BASED_SYSTEM ? opt.formattedDate : opt.label}
        </option>
      ))}
    </select>
  );
}
```

---

## Communication Plan

### Internal Communication

#### 3 Months Before Removal (April 2025)
- [ ] Email to development team about upcoming removal
- [ ] Standup announcement about timeline
- [ ] Update team wiki with migration status
- [ ] Create migration ticket tracker

#### 1 Month Before Removal (June 2025)
- [ ] Final warning email
- [ ] Sprint planning dedicated to migration
- [ ] Code review of all deprecated function usage
- [ ] Update project management tools

#### 1 Week Before Removal (June 2025)
- [ ] Daily standup reminders
- [ ] Final migration sprint
- [ ] Code freeze for non-migration work
- [ ] Prepare rollback plan

### External Communication (If Applicable)

#### API Consumers
- [ ] Send deprecation notices via email
- [ ] Update API documentation with warnings
- [ ] Provide migration guide
- [ ] Offer support for migration

#### Partners/Integrations
- [ ] Schedule migration calls
- [ ] Provide test environment
- [ ] Offer extended support window
- [ ] Document breaking changes

---

## Monitoring and Metrics

### Metrics to Track

#### Before Removal
- **Deprecated Function Usage**: Track call counts
  ```typescript
  // Add to deprecated functions
  console.warn(`[DEPRECATED] ${functionName} called ${callCount} times`);
  ```

- **API Endpoint Usage**: Monitor old endpoint traffic
  ```typescript
  // Add to old API routes
  console.warn(`[DEPRECATED] /api/enabled-days called ${requestCount} times`);
  ```

- **Error Rates**: Watch for migration-related errors
- **Performance**: Compare old vs new system performance

#### After Removal
- **Error Spikes**: Monitor for unexpected errors
- **API 404s**: Check for calls to removed endpoints
- **User Reports**: Track user-reported issues
- **Rollback Triggers**: Define thresholds for rollback

### Monitoring Dashboard

Create dashboard showing:
1. Deprecated function call counts (trending down)
2. New function adoption rates (trending up)
3. API endpoint usage distribution
4. Error rates by system
5. Performance metrics (response time, throughput)

---

## Decision Matrix

### Extend Timeline If:

| Condition | Action |
|-----------|--------|
| > 10% of codebase still uses deprecated functions (1 week before removal) | Extend timeline by 1 month |
| Critical bugs found in new system | Extend timeline until fixed |
| External partners not migrated | Extend timeline by 2 months |
| Migration testing incomplete | Delay removal until complete |
| Major performance regression | Investigate and fix before removal |

### Proceed With Removal If:

| Condition | Requirement |
|-----------|-------------|
| < 5% deprecated function usage | Safe to remove |
| All unit tests passing | Safe to remove |
| All integration tests passing | Safe to remove |
| Performance acceptable or better | Safe to remove |
| Rollback plan tested and ready | Safe to remove |

---

## Summary Timeline

```
January 2025     - Deprecation announced, warnings added
                  ✓ New system implemented
                  ✓ Documentation published

February 2025    - Soft migration begins
                  ✓ Both systems operational

March 2025       - Migration continues
                  ✓ Monitoring and bug fixes

April 2025       - Final migration push
                  ⚠️ 3-month warning sent

May 2025         - Migration sprint
                  ⚠️ 2-month warning sent

June 2025        - Final cleanup sprint
                  ⚠️ 1-week warning sent

July 2025        - 🚨 REMOVAL DATE
                  ✗ Deprecated functions removed
                  ✗ Old API endpoints removed
                  ✗ Old imports fail

August 2025      - Post-removal monitoring
                  ✓ Rollback if needed

September 2025   - Data migration begins
                  ✓ Cart data updated

October 2025     - Continue data migration

November 2025    - Final data migration

December 2025    - Validate data migration

January 2026     - 🚨 COMPLETE CLEANUP
                  ✗ day field removed from types
                  ✗ availableDays collection removed
                  ✗ Final cleanup complete
```

---

## Quick Reference

### Removal Dates

| Item | Removal Date |
|------|--------------|
| Server functions (`dayAvailability.ts`) | **July 1, 2025** |
| Client functions (`dayAvailabilityClient.ts`) | **July 1, 2025** |
| Old API endpoints | **July 1, 2025** |
| `day` field in types | **January 1, 2026** |
| `availableDays` database collection | **January 1, 2026** |

### Critical Dates

- **April 1, 2025**: 3-month warning, finalize migration plans
- **June 1, 2025**: 1-month warning, final migration sprint
- **June 23, 2025**: 1-week warning, final checks
- **July 1, 2025**: REMOVAL of deprecated code
- **January 1, 2026**: COMPLETE cleanup

### Contact Points

- **Migration Questions**: Engineering team lead
- **Blocking Issues**: Create critical ticket
- **Rollback Decision**: Engineering manager
- **Extension Request**: CTO approval

---

## Action Items for Teams

### Development Team
- [ ] Audit codebase for deprecated function usage
- [ ] Create migration tickets
- [ ] Update all imports and function calls
- [ ] Write/update tests
- [ ] Complete migration by June 2025

### QA Team
- [ ] Update test plans
- [ ] Test migration scenarios
- [ ] Validate new system
- [ ] Check for regressions
- [ ] Sign-off on migration

### DevOps Team
- [ ] Monitor deprecated function usage
- [ ] Set up alerts
- [ ] Prepare rollback plan
- [ ] Update deployment scripts
- [ ] Monitor post-removal

### Product Team
- [ ] Update product documentation
- [ ] Notify external API consumers
- [ ] Plan communication strategy
- [ ] Update admin panel
- [ ] Validate user experience

---

## Success Criteria

### Migration Complete When:

✅ Zero deprecated function calls in production logs
✅ All tests passing with new system
✅ Performance metrics acceptable
✅ No user-facing issues reported
✅ Data migration complete
✅ Old code removed from repository
✅ Documentation updated
✅ Team trained on new system

### Removal Safe When:

✅ < 1% deprecated usage (legacy clients only)
✅ Rollback plan tested and documented
✅ Monitoring in place
✅ On-call team notified
✅ Post-removal support scheduled

---

**Last Updated**: January 2025
**Next Review**: April 2025
**Owner**: Engineering Team
**Status**: 🟡 On Track

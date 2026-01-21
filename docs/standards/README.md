# API Standards Directory

This directory contains comprehensive documentation for API standards and best practices.

## Documents

### API Date Format Standards
**File:** `api-date-formats.md` (22KB, 794 lines)
**Last Updated:** 2026-01-07
**Status:** ✅ Active Standard

Defines the standard date and time formats for all API endpoints:
- **Timestamps:** ISO 8601 format (e.g., `2026-01-15T10:30:00.000Z`)
- **Date-Only:** YYYY-MM-DD format (e.g., `2026-01-15`)
- **Display Dates:** Human-readable format (e.g., "Monday, January 15, 2026")

**Key Points:**
- All timestamps must use ISO 8601 format
- Date-only fields must use PST timezone
- Optional formattedDate field for UI display
- Type-safe helper functions available

**Helper Functions:** See `/src/lib/apiDateFormat.ts`
- `formatAPIDate(date)` - ISO 8601 timestamps (general use)
- `formatAPIDateOnly(date)` - YYYY-MM-DD dates (PST timezone)
- `formatAPITimestamp(date)` - ISO 8601 with explicit millisecond precision
- `isValidAPIDate(date)` - Date validation
- `formatAPIDateArray(dates, formatter)` - Batch formatting

**Bug Fix Documentation:** `/docs/bug-fixes/api-date-format-inconsistency/`
- **README:** Complete bug fix overview and resolution
- **analysis.md:** Detailed analysis of inconsistencies found
- **implementation.md:** Step-by-step implementation guide
- **test-results.md:** Comprehensive testing results (57 tests, all passed)
- **frontend-migration-guide.md:** Frontend developer migration guide
- **endpoints/**: Endpoint-specific standards
  - `Orders-API.md` - Orders API date format standards
  - `Analytics-API.md` - Email Analytics API standards
  - `Webhooks-API.md` - Webhooks API standards
  - `Calendar-API.md` - Calendar API standards

### Order Cutoff Logic
**File:** `order-cutoff-logic.md` (16KB)
**Last Updated:** 2025-01-05
**Status:** ✅ Active Standard

Documents the business logic for order cutoff times:
- Cutoff at 1 PM PST the day before delivery
- Day availability determination
- Timezone handling for PST/PDT

## Quick Links

### Date Format Standards
- **Main Documentation:** `/docs/standards/api-date-formats.md`
- **Quick Reference:** `/docs/standards/api-date-formats-summary.md/api-date-formats-summary.md`
- **Implementation Guide:** `/docs/api-date-format-standardization.md`
- **Analysis:** `/docs/api-date-format-analysis.md`
- **Bug Fix Documentation:** `/docs/bug-fixes/api-date-format-inconsistency/`

### Code Files
- **Central Utilities:** `/src/lib/apiDateFormat.ts` (with comprehensive JSDoc)
- **Utilities README:** `/src/lib/apiDateFormat.README.md`
- **Type Definitions:** `/src/utils/formatters.ts`
- **Timezone Utilities:** `/src/lib/timezone.ts`

### Testing and Examples
- **Demo File:** `/src/lib/apiDateFormat.demo.ts`
- **Integration Examples:** `/src/lib/apiDateFormat.integration.example.ts`
- **Verification Script:** `/scripts/verify-date-format.js`

## Implementation Status

### Completed ✅
- [x] Centralized date formatting utilities
- [x] Comprehensive standards documentation
- [x] Type-safe helper functions
- [x] Bug fix documentation
- [x] Example implementations
- [x] Testing suite (57 tests, all passed)
- [x] Frontend migration guide
- [x] Endpoint-specific guides

### In Progress 🔄
- [ ] Apply standards to Orders API endpoints
- [ ] Apply standards to Analytics API endpoints
- [ ] Update remaining endpoints

### Not Started ⏳
- [ ] OpenAPI/Swagger specification (no existing spec)
- [ ] Linting rules for date format consistency

## Usage

When implementing new API endpoints:

1. **Read Standards:** Review `/docs/standards/api-date-formats.md`
2. **Import Utilities:** Use functions from `/src/lib/apiDateFormat.ts`
3. **Follow Patterns:** Use documented patterns from implementation guide
4. **Document:** Add comprehensive JSDoc comments
5. **Test:** Test date handling thoroughly (see test-results.md)
6. **Verify:** Run verification script to check compliance

When updating existing API endpoints:

1. **Review:** Check endpoint-specific guide in `/docs/bug-fixes/api-date-format-inconsistency/endpoints/`
2. **Import:** Add formatting utilities
3. **Update:** Replace old patterns with standardized utilities
4. **Document:** Add JSDoc and inline comments
5. **Test:** Verify with sample data
6. **Coordinate:** Inform frontend team of changes

When frontend consumes date fields:

1. **Read Guide:** Review `/docs/bug-fixes/api-date-format-inconsistency/frontend-migration-guide.md`
2. **Update Types:** Change `Date | string` to explicit string types
3. **Parse:** Use `new Date(isoString)` for timestamps
4. **Format:** Format on frontend for display (optional)
5. **Test:** Verify timezone handling

---

**Maintained by:** Backend Team
**Last Updated:** 2026-01-07
**Total Documentation:** 10 files
**Test Coverage:** 57 tests, 100% passing

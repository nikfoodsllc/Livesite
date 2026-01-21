#!/usr/bin/env node

/**
 * Verification Script for API Date Format Standardization
 *
 * This script verifies that the food-items-day-wise API follows the standardized
 * date formatting pattern with both 'date' (YYYY-MM-DD) and 'formattedDate' fields.
 *
 * Usage:
 *   node scripts/verify-date-format.js
 */

const fs = require('fs');
const path = require('path');

const API_FILE = path.join(__dirname, '../src/app/api/food-items-day-wise/route.ts');

console.log('🔍 Verifying API Date Format Standardization...\n');

// Read the API file
const content = fs.readFileSync(API_FILE, 'utf8');

// Verification checks
const checks = {
  hasDateField: false,
  hasFormattedDateField: false,
  hasFormatDateStringFunction: false,
  hasIso8601Documentation: false,
  hasDualFormatExplanation: false,
  hasUsageGuidelines: false,
  hasJSDocDocumentation: false,
  validatesDateFormat: false,
};

// Check 1: Verify 'date' field exists
checks.hasDateField = content.includes('date: date,') || content.includes('date: date\n');
console.log(`${checks.hasDateField ? '✅' : '❌'} 'date' field present in response`);

// Check 2: Verify 'formattedDate' field exists
checks.hasFormattedDateField = content.includes('formattedDate: formatDateString(date)');
console.log(`${checks.hasFormattedDateField ? '✅' : '❌'} 'formattedDate' field present in response`);

// Check 3: Verify formatDateString function exists
checks.hasFormatDateStringFunction = content.includes('function formatDateString(dateString: string)');
console.log(`${checks.hasFormatDateStringFunction ? '✅' : '❌'} formatDateString() function defined`);

// Check 4: Verify ISO 8601 documentation
checks.hasIso8601Documentation = content.includes('ISO 8601') && content.includes('YYYY-MM-DD');
console.log(`${checks.hasIso8601Documentation ? '✅' : '❌'} ISO 8601 format documented`);

// Check 5: Verify dual format explanation
checks.hasDualFormatExplanation = content.includes('canonical API format') && content.includes('human-readable');
console.log(`${checks.hasDualFormatExplanation ? '✅' : '❌'} Dual format pattern explained`);

// Check 6: Verify usage guidelines
checks.hasUsageGuidelines = content.includes('Use this for:') && content.includes('Avoid using for:');
console.log(`${checks.hasUsageGuidelines ? '✅' : '❌'} Field usage guidelines documented`);

// Check 7: Verify JSDoc documentation
checks.hasJSDocDocumentation = content.includes('* @param dateString') && content.includes('* @returns');
console.log(`${checks.hasJSDocDocumentation ? '✅' : '❌'} JSDoc documentation present`);

// Check 8: Verify date format validation
checks.validatesDateFormat = content.includes('isValidDateFormat') && content.includes('dateRegex');
console.log(`${checks.validatesDateFormat ? '✅' : '❌'} Date format validation implemented`);

// Summary
console.log('\n' + '='.repeat(50));
const passedChecks = Object.values(checks).filter(Boolean).length;
const totalChecks = Object.keys(checks).length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`\n📊 Summary: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`);

if (passedChecks === totalChecks) {
  console.log('\n✅ All checks passed! The API follows the date format standardization.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the implementation.');
  console.log('\nFailed checks:');
  Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .forEach(([name, _]) => console.log(`  - ${name}`));
  process.exit(1);
}

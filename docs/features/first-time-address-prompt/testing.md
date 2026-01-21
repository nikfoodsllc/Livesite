# First-Time User Address Prompt - Testing Guide

## 🧪 Testing Overview

This document provides comprehensive testing scenarios, test cases, and validation procedures for the First-Time Address Prompt feature.

## 🎯 Pre-Testing Setup

### Environment Preparation
1. **Test Accounts Needed:**
   - New user account (isCompleted: false, no addresses)
   - Existing user with addresses (isCompleted: true or false)
   - Test account with dismissed prompt state

2. **Browser Tools:**
   - Browser DevTools (for localStorage inspection)
   - React DevTools (for state inspection)
   - Network tab (for API monitoring)

3. **Test Data:**
   - Valid US address with serviceable zipcode
   - Valid US address with non-serviceable zipcode
   - Invalid zipcode format
   - Various phone number formats

### LocalStorage Management
```javascript
// Clear dismiss state
localStorage.removeItem('hasDismissedAddressPrompt');

// Check dismiss state
localStorage.getItem('hasDismissedAddressPrompt'); // 'true' or null

// Manually set dismiss state
localStorage.setItem('hasDismissedAddressPrompt', 'true');
```

## ✅ Manual Testing Scenarios

### Scenario 1: First-Time User Login (Happy Path)
**Prerequisites:**
- New user account with `isCompleted: false`
- No saved addresses
- Clean localStorage (no dismiss flag)

**Steps:**
1. Log in with new user credentials
2. Wait for page to fully load
3. Observe the top of the page below the header

**Expected Results:**
- ✅ Prompt banner appears with smooth fade-in animation
- ✅ Banner shows location icon and friendly message
- ✅ "Add Address" button is prominent and clickable
- ✅ X (dismiss) button is visible in top-right
- ✅ Background has gradient overlay
- ✅ On mobile, layout stacks vertically

**Visual Verification:**
- Typography is readable
- Colors match brand theme
- No layout shifts or overlaps
- Smooth animations

---

### Scenario 2: Add Address Flow
**Prerequisites:**
- Prompt is visible (from Scenario 1)

**Steps:**
1. Click "Add Address" button
2. AddressDialog should open
3. Search for an address in the address search field
4. Select a valid address from dropdown
5. Fill in apartment, floor if applicable
6. Verify zipcode is marked as serviceable (green checkmark)
7. Fill in personal details (name, email, phone)
8. Verify phone validation works
9. Click "Add Address" button
10. Wait for save to complete
11. Close dialog (should auto-close)

**Expected Results:**
- ✅ AddressDialog opens in "add" mode
- ✅ User profile data (name, email) is pre-filled
- ✅ Address search autocomplete works
- ✅ Selected address populates street, city, zipcode
- ✅ Zipcode validation shows serviceable (green check)
- ✅ Phone validation accepts 10-digit numbers
- ✅ Form submits without errors
- ✅ Dialog closes automatically after save
- ✅ Prompt banner disappears immediately
- ✅ Page continues to function normally

**Post-Save Verification:**
```javascript
// Check localStorage
localStorage.getItem('hasDismissedAddressPrompt'); // Should still be null

// Check addresses via API or address book page
// Should show 1 address
```

---

### Scenario 3: Dismiss Prompt Flow
**Prerequisites:**
- Prompt is visible

**Steps:**
1. Click the X (dismiss) button
2. Observe prompt disappearance
3. Refresh the page (F5 or Ctrl+R)
4. Log out and log back in
5. Navigate to different pages

**Expected Results:**
- ✅ Prompt closes immediately without animation
- ✅ Page layout adjusts smoothly
- ✅ Prompt does NOT reappear after refresh
- ✅ Prompt does NOT reappear after re-login
- ✅ Prompt does NOT reappear on other pages
- ✅ localStorage contains `'hasDismissedAddressPrompt': 'true'`

**LocalStorage Verification:**
```javascript
localStorage.getItem('hasDismissedAddressPrompt'); // Should be 'true'
```

---

### Scenario 4: Existing User with Addresses
**Prerequisites:**
- User account with at least 1 saved address
- Clean or dismissed localStorage state

**Steps:**
1. Log in with existing user
2. Navigate to home page
3. Check for prompt banner

**Expected Results:**
- ✅ Prompt does NOT appear
- ✅ No console errors related to prompt
- ✅ Page loads normally
- ✅ No layout shifts or flickering

**Debugging Check:**
```javascript
// In React DevTools, check FirstTimeAddressPrompt component
// showPrompt should be false
// addresses.length should be > 0
```

---

### Scenario 5: User with isCompleted = true
**Prerequisites:**
- User with `isCompleted: true` flag
- May or may not have addresses

**Steps:**
1. Log in with completed user
2. Wait for page load
3. Check for prompt

**Expected Results:**
- ✅ Prompt does NOT appear
- ✅ Even if user has no addresses, prompt respects `isCompleted` flag

---

### Scenario 6: Dismissed User State Persistence
**Prerequisites:**
- User who previously dismissed prompt
- `isCompleted: false`
- No addresses

**Steps:**
1. Verify localStorage has dismiss flag: `localStorage.setItem('hasDismissedAddressPrompt', 'true')`
2. Log in (or refresh if already logged in)
3. Check for prompt
4. Navigate to multiple pages
5. Refresh browser

**Expected Results:**
- ✅ Prompt never appears (across all pages)
- ✅ State persists across sessions
- ✅ No console errors
- ✅ Normal browsing experience

---

### Scenario 7: Address Dialog Error Handling
**Prerequisites:**
- Prompt is visible

**Steps:**
1. Click "Add Address"
2. Enter invalid zipcode (e.g., "00000" - non-serviceable)
3. Wait for zipcode validation
4. Try to submit form
5. Enter invalid phone (e.g., "123")
6. Try to submit form
7. Enter valid zipcode but leave required fields empty
8. Try to submit form

**Expected Results:**
- ✅ Non-serviceable zipcode shows error message
- ✅ Submit button disabled when zipcode invalid
- ✅ Phone validation shows error for invalid format
- ✅ Required fields show validation errors
- ✅ Error messages are clear and helpful
- ✅ Dialog stays open on error
- ✅ User can correct errors and resubmit

---

### Scenario 8: Network Error Handling
**Prerequisites:**
- Prompt is visible
- DevTools Network tab open

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Click "Add Address"
4. Try to submit address form
5. Restore network connection
6. Submit again

**Expected Results:**
- ✅ Appropriate error message shown
- ✅ No app crash or white screen
- ✅ User can retry after restoring connection
- ✅ Dialog doesn't close on network error
- ✅ Error is user-friendly

---

## 📱 Responsive Testing

### Desktop (> 768px)
**Check:**
- [ ] Banner displays horizontally
- [ ] Icon and text align vertically centered
- [ ] Buttons display inline with actions
- [ ] Hover effects work on buttons
- [ ] No horizontal scrolling
- [ ] Adequate padding and margins

### Tablet (481px - 768px)
**Check:**
- [ ] Layout adapts appropriately
- [ ] Text remains readable
- [ ] Buttons are touch-friendly (min 44px height)
- [ ] No overlap with header or content

### Mobile (≤ 480px)
**Check:**
- [ ] Banner content stacks vertically
- [ ] Icon above text
- [ ] Buttons below text
- [ ] Full-width buttons or adequate spacing
- [ ] Text scales appropriately (not too small)
- [ ] Touch targets are adequate size
- [ ] No horizontal scroll

---

## 🌐 Browser Compatibility

### Modern Browsers
| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest 2 versions | ✅ Pass | Primary target |
| Firefox | Latest 2 versions | ✅ Pass | Full support |
| Safari | Latest 2 versions | ✅ Pass | Including iOS |
| Edge | Latest 2 versions | ✅ Pass | Chromium-based |

### Browser-Specific Tests
- **localStorage Support:** Verify in all browsers
- **Flexbox Layout:** Test for rendering issues
- **CSS Gradients:** Verify fallback behavior
- **Animations:** Test performance on lower-end devices

---

## ♿ Accessibility Testing

### Keyboard Navigation
**Test:**
1. Tab through the page
2. Focus should reach the prompt
3. Tab through prompt elements
4. Verify focus indicators are visible
5. Test Enter/Space on buttons

**Expected:**
- ✅ Focus is visible on all interactive elements
- ✅ Tab order is logical
- ✅ Enter activates "Add Address" button
- ✅ Escape key does not close prompt (intentional - only X button)
- ✅ Focus trap not required (not a modal)

### Screen Reader Testing
**Test with NVDA (Windows) or VoiceOver (Mac):**
1. Enable screen reader
2. Navigate to prompt
3. Listen to announcements

**Expected:**
- ✅ "Add your delivery address to get started" is announced
- ✅ "Add Address, button" is announced
- ✅ "Remind me later, button" is announced for X button
- ✅ Role and state are properly communicated

### Color Contrast
**Verify:**
- ✅ Text meets WCAG AA standards (4.5:1 for normal text)
- ✅ Icon contrast is sufficient
- ✅ Button text contrast meets standards
- ✅ Gradient background doesn't affect readability

**Test Tools:**
- axe DevTools
- WAVE browser extension
- Chrome Lighthouse accessibility audit

---

## 🧪 Edge Cases

### Edge Case 1: Very Long User Name
**Test:**
- User with extremely long name (100+ characters)

**Expected:**
- ✅ Name doesn't break layout
- ✅ Text truncates gracefully with ellipsis
- ✅ No horizontal overflow

### Edge Case 2: Rapid Login/Logout
**Test:**
1. Log in as new user
2. Immediately log out
3. Log in again
4. Repeat multiple times

**Expected:**
- ✅ No memory leaks
- ✅ State cleans up properly
- ✅ No duplicate API calls
- ✅ No console errors

### Edge Case 3: localStorage Disabled
**Test:**
- Disable localStorage in browser settings
- Log in as new user

**Expected:**
- ✅ Prompt still appears (graceful degradation)
- ✅ Dismissal doesn't persist (shows on refresh)
- ✅ No app crashes
- ✅ Console may show localStorage errors (acceptable)

### Edge Case 4: Multiple Tabs Open
**Test:**
1. Open app in multiple tabs
2. Log in as new user in one tab
3. Observe behavior in other tabs

**Expected:**
- ✅ Each tab manages state independently
- ✅ No race conditions
- ✅ localStorage changes sync across tabs
- ✅ Prompt behavior consistent

### Edge Case 5: Slow Network
**Test:**
- Set network throttling to "Slow 3G"
- Log in as new user

**Expected:**
- ✅ Loading states handled gracefully
- ✅ Prompt doesn't flicker
- ✅ Address fetch shows loading or waits
- ✅ No layout shifts

### Edge Case 6: Clock Skew / Token Expiry
**Test:**
- Use expired auth token
- Log in as new user

**Expected:**
- ✅ AuthContext handles token expiry
- ✅ User is logged out gracefully
- ✅ Prompt doesn't show for invalid session
- ✅ No app crash

---

## 🧩 Integration Testing

### Test 1: Prompt → Address Dialog → Address Book
**Steps:**
1. Trigger prompt
2. Add address via prompt
3. Go to Account → Addresses
4. Verify address appears

**Expected:**
- ✅ Address saved to database
- ✅ Address visible in address book
- ✅ No duplicate addresses created

### Test 2: Prompt → Cart → Checkout
**Steps:**
1. Trigger prompt
2. Add address via prompt
3. Add item to cart
4. Proceed to checkout
5. Verify address is pre-selected

**Expected:**
- ✅ Address available for selection
- ✅ Checkout completes successfully
- ✅ No address-related errors

### Test 3: Multiple Prompt Triggers
**Steps:**
1. Log in as new user (no dismiss flag)
2. Navigate across 10+ pages
3. Return to home page
4. Observe prompt behavior

**Expected:**
- ✅ Prompt shows consistently (not dismissed)
- ✅ No performance degradation
- ✅ No memory leaks from re-renders
- ✅ Address list only fetched once (cached)

---

## 🐛 Regression Testing Checklist

Before each release, verify:

- [ ] Prompt shows for new users (`isCompleted: false`, no addresses)
- [ ] Prompt doesn't show for existing users with addresses
- [ ] Prompt doesn't show for `isCompleted: true` users
- [ ] Dismiss button works and persists
- [ ] Address dialog opens and saves correctly
- [ ] Prompt disappears after address added
- [ ] No console errors
- [ ] Responsive on mobile, tablet, desktop
- [ ] Accessible via keyboard
- [ ] No performance issues

---

## 📊 Test Case Summary

| Test Category | Test Cases | Priority |
|--------------|------------|----------|
| Core Functionality | 8 | P0 (Critical) |
| Responsive Design | 3 | P1 (High) |
| Browser Compatibility | 4 | P1 (High) |
| Accessibility | 3 | P1 (High) |
| Edge Cases | 6 | P2 (Medium) |
| Integration | 3 | P1 (High) |
| **Total** | **27** | - |

---

## 🔍 Debugging Tips

### Check Prompt State in DevTools
```javascript
// 1. Check React state
// In React DevTools, find FirstTimeAddressPrompt component:
// - showPrompt: boolean
// - addresses: array length
// - isLoadingAddresses: boolean

// 2. Check localStorage
console.log(localStorage.getItem('hasDismissedAddressPrompt'));

// 3. Check user object
// In React DevTools, find AuthContext:
// - user.isCompleted: boolean
// - user.id: string

// 4. Monitor API calls
// Network tab → Filter by /api/address
// Should see GET request on mount
```

### Force Show Prompt (Testing)
```javascript
// Clear all state
localStorage.removeItem('hasDismissedAddressPrompt');

// In React DevTools, modify state:
// Set showPrompt = true
// Set addresses = []
```

### Force Hide Prompt (Testing)
```javascript
// Set dismiss flag
localStorage.setItem('hasDismissedAddressPrompt', 'true');
// Refresh page
```

---

## ✅ Pre-Release Checklist

### Code Review
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] No ESLint errors
- [ ] Code follows project conventions
- [ ] No hardcoded values (use constants)

### Performance
- [ ] No unnecessary re-renders
- [ ] Component renders efficiently
- [ ] API calls are memoized
- [ ] No memory leaks (cleanup in useEffect)

### User Experience
- [ ] Smooth animations
- [ ] No layout shifts
- [ ] Clear error messages
- [ ] Intuitive interactions
- [ ] Mobile-friendly

### Documentation
- [ ] Code is commented
- [ ] This test document is complete
- [ ] Implementation docs are accurate
- [ ] Overview document is up-to-date

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Device-Specific Dismissal:** Dismissal state doesn't sync across devices
   - **Workaround:** User can add address through normal flows on other devices

2. **No Analytics:** Currently no tracking of prompt performance
   - **Planned:** Add analytics for conversion tracking

### Future Enhancements
- Add A/B testing framework
- Implement cross-device state sync
- Add performance monitoring
- Enable personalized messaging

---

**Last Updated**: January 12, 2026
**Test Coverage**: 27 test cases across 6 categories
**Next Review**: After first production deployment

# Testing Guide: Unauthenticated Quiz Access with Auth Overlay

## Prerequisites

### 1. Start the Server
```bash
# From project root
cd dev-tools
START_SERVER.bat

# Or manually:
venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 2. Verify Server is Running
- Open browser: http://localhost:8000/health
- Expected response: `{"status":"healthy","indexes_loaded":true}`

### 3. Clear Browser Data (Optional, for clean test)
- Clear localStorage: `localStorage.clear()` in browser console
- Clear cookies for localhost
- Use incognito/private mode

## Test Scenarios

### Scenario 1: Anonymous Quiz Completion

**Goal:** Verify users can complete quiz without authentication

**Steps:**
1. Open browser: http://localhost:8000/
2. Click "Try Quiz" or navigate to http://localhost:8000/quiz/category.html
3. **Expected:** Category page loads without redirect to auth
4. **Verify in console:** No errors, no auth check redirect

5. Select a category (e.g., "Smartwatch")
6. Click "Weiter" (Next)
7. **Expected:** Use-case page loads
8. **Verify in localStorage:** `verifyr_quiz_answers` contains selected category

9. Select 1-3 use cases (e.g., "Running", "Health Tracking")
10. Click "Weiter" (Next)
11. **Expected:** Features page loads
12. **Verify in localStorage:** `verifyr_quiz_answers` contains useCases array

13. Select 1-5 features (e.g., "Long Battery", "GPS Accuracy")
14. Click "Ergebnisse anzeigen" (Show Results)
15. **Expected:**
    - Quiz submits to `/quiz/score` endpoint
    - Backend accepts submission without Authorization header
    - Redirect to `/quiz/results.html`

16. **Verify in Network tab:**
    - POST to `/quiz/score` has no Authorization header
    - Response status: 200 OK
    - Response contains `matched_products` array

17. **Verify in localStorage:**
    - `verifyr_quiz_results` contains quiz results
    - `verifyr_quiz_completed` is "true"

---

### Scenario 2: Auth Modal on Results Page

**Goal:** Verify auth modal appears on results page for anonymous users

**Steps:**
1. After completing anonymous quiz (Scenario 1)
2. **Expected on results page:**
    - Product carousel visible in background
    - Auth modal overlay appears on top
    - Modal is centered on screen
    - Modal has dark overlay background (rgba(0, 0, 0, 0.85))
    - Modal shows 3 tabs: "Anmelden", "Warteliste", "Registrieren"
    - Modal title: "Anmelden um fortzufahren"

3. Try to close modal by clicking outside
4. **Expected:** Modal does not close (allowClose: false)

5. Look for close (X) button in modal
6. **Expected:** No close button visible (no-close class applied)

7. Try to click on product carousel underneath
8. **Expected:** Clicks are blocked by modal overlay

9. **Verify in Elements inspector:**
    - Modal element exists with class "auth-modal-overlay active"
    - Modal content has class "no-close"
    - body has style "overflow: hidden"

10. **Verify language switcher:**
    - Click "EN" button
    - All modal text translates to English
    - Click "DE" button
    - Text returns to German

---

### Scenario 3: Login via Auth Modal on Results

**Goal:** Verify login flow works from results page modal

**Prerequisites:** Have a valid test user account

**Steps:**
1. On results page with auth modal visible
2. Ensure "Anmelden" (Login) tab is active
3. Enter email: `your-test-email@example.com`
4. Enter password: `your-test-password`
5. Click "Anmelden" button

6. **Expected:**
    - Button shows loading state (disabled)
    - Supabase auth.signInWithPassword() called
    - On success, tokens stored in localStorage:
      - `verifyr_access_token`
      - `verifyr_user_id`
      - `verifyr_user_email`
    - Modal disappears
    - Page reloads

7. After reload:
8. **Expected:**
    - Results page loads without modal
    - Product carousel fully interactive
    - Chat button works
    - No auth overlay

9. **Verify in localStorage:**
    - `verifyr_access_token` contains JWT
    - Token has valid format (3 parts separated by dots)

---

### Scenario 4: Signup via Auth Modal on Results

**Goal:** Verify signup flow works from results page modal

**Steps:**
1. On results page with auth modal visible
2. Click "Registrieren" (Sign Up) tab
3. Enter email: `new-user-{timestamp}@example.com`
4. Enter password: `TestPassword123!`
5. Enter confirm password: `TestPassword123!`
6. Click "Registrieren" button

7. **Expected:**
    - Passwords match validation passes
    - Button shows loading state
    - Supabase auth.signUp() called
    - On success:
      - Tokens stored in localStorage (if email confirmation not required)
      - Success message appears
      - Modal disappears after 1.5 seconds
      - Page reloads

8. **Test password mismatch:**
    - Enter different passwords
    - Click "Registrieren"
    - **Expected:** Error message "Passwörter stimmen nicht überein"

---

### Scenario 5: Waitlist via Auth Modal

**Goal:** Verify waitlist signup works

**Steps:**
1. On results page with auth modal visible
2. Click "Warteliste" (Waitlist) tab
3. Enter email: `waitlist-user@example.com`
4. Click "Zur Warteliste hinzufügen" button

5. **Expected:**
    - Button shows loading state
    - Request sent to hardcoded waitlist Supabase
    - Success message: "✅ Erfolgreich zur Warteliste hinzugefügt!"
    - Email field clears
    - User remains on same page

6. **Verify in Network tab:**
    - POST to Supabase waitlist endpoint
    - Request body contains email and timestamp

---

### Scenario 6: Auth Modal on Chat Page

**Goal:** Verify auth modal appears when visiting chat page without authentication

**Steps:**
1. Clear localStorage: `localStorage.clear()`
2. Navigate to: http://localhost:8000/chat.html
3. **Expected:**
    - Chat interface loads (header, messages area, input)
    - Chat input is disabled
    - Send button is disabled
    - Input placeholder: "Bitte authentifizieren Sie sich, um den Chat zu nutzen"
    - Auth modal overlay appears on top
    - Modal cannot be closed

4. **Verify in Elements inspector:**
    - `chatInput` element has `disabled` attribute
    - `sendButton` element has `disabled` attribute
    - Modal overlay is visible

5. Login via modal (use existing credentials)
6. **Expected:**
    - Modal disappears
    - Page reloads
    - Chat input enabled
    - Send button enabled
    - Input placeholder: "Frag nach Produkteigenschaften..."

7. Type a test message: "What is the battery life?"
8. **Expected:** Message sends successfully

---

### Scenario 7: Token Expiration During Quiz

**Goal:** Verify graceful handling of expired token

**Steps:**
1. Start quiz with valid token in localStorage
2. Complete category and use-case selection
3. Before submitting features:
    - Open DevTools console
    - Run: `localStorage.setItem('verifyr_access_token', 'invalid.token.value')`
4. Submit features form
5. **Expected:**
    - POST to `/quiz/score` with invalid token
    - Backend returns 401 Unauthorized
    - Frontend catches 401
    - Clears token: `localStorage.removeItem('verifyr_access_token')`
    - Retries submission without Authorization header
    - Submission succeeds as anonymous
    - Results page loads with auth modal

6. **Verify in Network tab:**
    - Two POST requests to `/quiz/score`
    - First request: 401 status
    - Second request: 200 status

---

### Scenario 8: Direct Access to Results Page

**Goal:** Verify behavior when accessing results page directly

**Steps:**
1. Navigate directly to: http://localhost:8000/quiz/results.html
2. **Expected (no quiz results in localStorage):**
    - Page detects missing `verifyr_quiz_results`
    - Redirects to `/quiz/category.html`

3. Complete quiz normally
4. On results page, note the URL
5. Copy URL, close tab
6. Open new incognito window
7. Paste URL: http://localhost:8000/quiz/results.html
8. **Expected (different browser session):**
    - No quiz results in this session's localStorage
    - Redirects to category page

---

### Scenario 9: Back Button Navigation

**Goal:** Verify back/forward button behavior

**Steps:**
1. Complete anonymous quiz
2. On results page with auth modal
3. Click browser back button
4. **Expected:**
    - Navigate back to features page
    - Features page loads normally (no auth check)
    - Previous selections still visible

5. Click browser forward button
6. **Expected:**
    - Navigate forward to results page
    - Results page loads
    - Auth modal appears again (because still not authenticated)

7. Login via modal
8. After page reload
9. Click back button
10. **Expected:**
    - Navigate to features page
    - Still authenticated (token in localStorage)

11. Click forward button
12. **Expected:**
    - Navigate to results page
    - No auth modal (authenticated)

---

### Scenario 10: Mobile Responsiveness

**Goal:** Verify modal works on mobile devices

**Steps (using browser DevTools):**
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate to results page with auth modal

5. **Expected:**
    - Modal fits screen (max-width: 100%)
    - Modal has padding: 16px on mobile
    - Modal content scrollable if needed
    - Font sizes readable (16px minimum)

6. Click in email input field
7. **Expected:**
    - Virtual keyboard appears
    - Modal scrolls to keep input visible
    - Modal max-height: 80vh (leaves room for keyboard)

8. Fill out login form
9. Submit
10. **Expected:**
    - Form submission works
    - No layout issues

11. Test landscape orientation
12. **Expected:**
    - Modal still fits screen
    - All content accessible

---

### Scenario 11: Language Switching in Modal

**Goal:** Verify all translations work correctly

**Steps:**
1. On results page with auth modal (German default)
2. **Verify German text:**
    - Title: "Anmelden um fortzufahren"
    - Tabs: "Anmelden", "Warteliste", "Registrieren"
    - Email label: "E-Mail-Adresse"
    - Password label: "Passwort"

3. Click "EN" in language switcher
4. **Expected - All text translates:**
    - Title: "Sign in to continue"
    - Tabs: "Login", "Waitlist", "Sign Up"
    - Email label: "Email Address"
    - Password label: "Password"
    - Confirm password label: "Confirm Password"
    - Login button: "Log In"
    - Waitlist button: "Join Waitlist"
    - Signup button: "Sign Up"

5. Switch to Signup tab
6. Try to submit with mismatched passwords
7. **Expected:**
    - Error message in English: "Passwords do not match."

8. Click "DE" to switch back to German
9. **Expected:**
    - All text returns to German
    - Error message: "Passwörter stimmen nicht überein."

10. **Verify localStorage:**
    - Language preference stored: `verifyr_language: "de"` or `"en"`

---

### Scenario 12: Multiple Tab Switching

**Goal:** Verify modal tab switching works smoothly

**Steps:**
1. On results page with auth modal
2. Click "Anmelden" tab
3. **Expected:**
    - Login form visible
    - Other forms hidden
    - Tab has "active" class

4. Click "Warteliste" tab
5. **Expected:**
    - Waitlist form visible
    - Login form hidden
    - Waitlist tab has "active" class
    - Login tab loses "active" class

6. Click "Registrieren" tab
7. **Expected:**
    - Signup form visible
    - Other forms hidden
    - Signup tab has "active" class

8. Fill out email in signup form
9. Switch to "Anmelden" tab
10. Switch back to "Registrieren" tab
11. **Expected:**
    - Email field is empty (form reset or cleared)

---

### Scenario 13: Authenticated User Quiz Flow

**Goal:** Verify authenticated users don't see auth modal

**Prerequisites:** Valid token in localStorage

**Steps:**
1. Ensure `verifyr_access_token` exists in localStorage
2. Navigate to: http://localhost:8000/quiz/category.html
3. Complete quiz normally
4. Submit quiz
5. **Expected:**
    - POST to `/quiz/score` includes Authorization header
    - Backend logs user ID (not "anonymous")
    - Results page loads

6. On results page:
7. **Expected:**
    - No auth modal appears
    - Product carousel fully interactive
    - Chat button works immediately

8. Click chat button
9. **Expected:**
    - Navigate to chat page
    - No auth modal
    - Chat input/send enabled
    - Can send messages immediately

---

## Common Issues & Troubleshooting

### Issue 1: Modal doesn't appear
**Check:**
- Browser console for JavaScript errors
- Network tab for failed script loads
- Ensure auth-modal.js and auth-modal.css loaded successfully
- Verify Supabase client script loaded from CDN

### Issue 2: Login fails with error
**Check:**
- Network tab for Supabase API response
- Console for error messages
- Verify Supabase config loaded from `/config` endpoint
- Check credentials are correct

### Issue 3: Modal appears even when authenticated
**Check:**
- Token exists in localStorage: `localStorage.getItem('verifyr_access_token')`
- Token is valid (not expired or malformed)
- Backend `/products` endpoint returns 200 (token verification)

### Issue 4: Quiz submission fails
**Check:**
- Network tab for `/quiz/score` request/response
- Backend logs for errors
- Request body contains required fields: category, useCases, features

### Issue 5: Page doesn't reload after login
**Check:**
- Browser console for errors in `onAuthSuccess` callback
- Verify `window.location.reload()` is called
- Check browser allows reloads (some extensions block)

### Issue 6: Translations don't work
**Check:**
- Language switcher updates `localStorage.getItem('verifyr_language')`
- Modal DOM elements have correct text content
- No errors in `switchLanguage()` method

---

## Browser DevTools Commands

**Check authentication status:**
```javascript
console.log('Token:', localStorage.getItem('verifyr_access_token'));
console.log('User ID:', localStorage.getItem('verifyr_user_id'));
console.log('Email:', localStorage.getItem('verifyr_user_email'));
```

**Check quiz state:**
```javascript
console.log('Quiz Answers:', JSON.parse(localStorage.getItem('verifyr_quiz_answers')));
console.log('Quiz Results:', JSON.parse(localStorage.getItem('verifyr_quiz_results')));
console.log('Quiz Completed:', localStorage.getItem('verifyr_quiz_completed'));
```

**Clear all data:**
```javascript
localStorage.clear();
location.reload();
```

**Simulate expired token:**
```javascript
localStorage.setItem('verifyr_access_token', 'expired.token.value');
```

**Check modal state:**
```javascript
console.log('Modal instance:', window.__authModalInstance);
console.log('Body overflow:', document.body.style.overflow);
```

---

## Success Criteria

### ✅ All scenarios pass
- Anonymous users can complete quiz
- Auth modal appears on results and chat
- Login/signup/waitlist functions work
- Authenticated users have full access
- Token expiration handled gracefully
- Mobile responsive design works
- Language switching functional
- Back/forward navigation works

### ✅ No console errors
- No JavaScript errors in any scenario
- No failed network requests (except intentional 401 test)
- No missing resources (CSS, JS, images)

### ✅ User experience smooth
- No unexpected redirects
- Forms submit without issues
- Loading states show correctly
- Success messages clear
- Error messages helpful

---

## Performance Checks

**Page Load Times:**
- Category page: < 2 seconds
- Results page: < 3 seconds
- Chat page: < 3 seconds

**Modal Animations:**
- Fade in: 0.3s smooth
- Slide up: 0.3s smooth
- No janky animations

**API Response Times:**
- `/quiz/score`: < 2 seconds
- `/products/metadata`: < 1 second
- `/config`: < 500ms

---

## Final Verification

After completing all test scenarios:

1. ✅ Anonymous quiz completion works end-to-end
2. ✅ Auth modal forces authentication on results/chat
3. ✅ All 3 auth methods work (login, signup, waitlist)
4. ✅ Language switching works in modal
5. ✅ Mobile responsive on all screen sizes
6. ✅ Token expiration handled gracefully
7. ✅ No security issues (tokens validated server-side)
8. ✅ localStorage used appropriately
9. ✅ Back button navigation works correctly
10. ✅ Authenticated users have seamless experience

**Implementation is complete when all checkboxes above are ticked!** ✨


# FORGOT PASSWORD IMPLEMENTATION PLAN

## Overview
Add "Forgot Password" functionality to the login screen, allowing users to reset their passwords via email. This complements the existing manual account creation workflow where admins create accounts and users need a way to set/reset their own passwords.

---

## Current Authentication Status

### What Exists:
✅ **Login** - Fully functional with JWT verification
✅ **Waitlist** - Separate Supabase instance for email collection
❌ **Signup** - Disabled (controlled by `ENABLE_SIGNUP` env var)
❌ **Forgot Password** - NOT IMPLEMENTED (this plan addresses this)
❌ **Change Password** - Not implemented (logged-in users cannot change passwords)

### Current Workflow:
1. User joins waitlist
2. Admin manually creates Supabase account with temporary password
3. Admin sends credentials to user
4. User logs in with provided credentials
5. **Problem:** User is stuck with that password (no way to change it)

### Solution:
Add "Forgot Password" flow so users can reset/change their passwords at any time.

---

## 1. System Architecture

### User Flow:
```
Login Screen
    ↓
User clicks "Forgot Password?" link
    ↓
Modal/Form appears: "Enter your email"
    ↓
User submits email
    ↓
Supabase sends password reset email
    ↓
User clicks link in email
    ↓
Redirected to /reset-password.html
    ↓
User enters new password + confirmation
    ↓
Password updated in Supabase
    ↓
Success message + redirect to login
    ↓
User logs in with new password
```

### Technical Flow:
```
Frontend: auth.html / auth-modal.js
    ↓
User clicks "Forgot Password?"
    ↓
Call: supabaseClient.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://your-domain.com/reset-password.html'
})
    ↓
Supabase sends email with magic link containing token
    ↓
User clicks link → lands on reset-password.html?token=xxx
    ↓
Frontend: reset-password.html / reset-password.js
    ↓
Extract token from URL (Supabase handles this automatically)
    ↓
User enters new password
    ↓
Call: supabaseClient.auth.updateUser({ password: newPassword })
    ↓
Password updated
    ↓
Redirect to /auth.html with success message
```

---

## 2. Implementation Details

### 2.1 Frontend Changes

#### File 1: `frontend/auth.html` (Modify)
**Changes:**
- Add "Forgot Password?" link below login form
- Add forgot password modal (or reuse existing modal structure)

**Location:** After login button, before closing `</form>` tag

```html
<!-- Add after login button in login form -->
<div class="form-footer">
  <a href="#" class="forgot-password-link" onclick="showForgotPasswordModal(); return false;">
    <span class="forgot-text-de">Passwort vergessen?</span>
    <span class="forgot-text-en" style="display: none;">Forgot password?</span>
  </a>
</div>

<!-- Add modal at end of body (before closing </body>) -->
<div id="forgotPasswordModal" class="modal">
  <div class="modal-content">
    <span class="modal-close" onclick="hideForgotPasswordModal()">&times;</span>
    <h3 id="forgotPasswordTitle">Passwort zurücksetzen</h3>
    <p id="forgotPasswordDesc">Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.</p>
    <form onsubmit="handleForgotPassword(event)">
      <div class="form-group">
        <label for="forgotPasswordEmail" id="forgotPasswordEmailLabel">E-Mail</label>
        <input type="email" id="forgotPasswordEmail" class="form-input" required>
      </div>
      <button type="submit" class="btn-primary" id="forgotPasswordBtn">
        <span class="btn-text" id="forgotPasswordBtnText">Link senden</span>
        <span class="btn-loading"></span>
      </button>
      <div class="form-message" id="forgotPasswordMessage"></div>
    </form>
  </div>
</div>
```

**CSS to add (in `<style>` section):**
```css
.form-footer {
  margin-top: 16px;
  text-align: center;
}

.forgot-password-link {
  color: var(--primary-blue);
  font-size: 14px;
  text-decoration: none;
  transition: opacity 0.2s;
}

.forgot-password-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
}

.modal.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 28px;
  color: var(--gray);
  cursor: pointer;
  line-height: 1;
}

.modal-close:hover {
  color: var(--dark);
}
```

---

#### File 2: `frontend/auth.js` (Modify)
**Add these functions:**

```javascript
/**
 * Show forgot password modal
 */
function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.classList.add('active');

    // Update language
    updateForgotPasswordLanguage();

    // Clear previous messages
    const messageEl = document.getElementById('forgotPasswordMessage');
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    // Clear input
    document.getElementById('forgotPasswordEmail').value = '';

    // Track modal open
    if (typeof gtag !== 'undefined') {
        gtag('event', 'forgot_password_open', {
            'event_category': 'auth'
        });
    }
}

/**
 * Hide forgot password modal
 */
function hideForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.classList.remove('active');
}

/**
 * Update forgot password modal language
 */
function updateForgotPasswordLanguage() {
    const lang = localStorage.getItem('verifyr-lang') || 'de';

    const texts = {
        de: {
            title: 'Passwort zurücksetzen',
            description: 'Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.',
            emailLabel: 'E-Mail',
            buttonText: 'Link senden',
            successMessage: 'Wir haben dir einen Link zum Zurücksetzen deines Passworts gesendet. Bitte überprüfe deine E-Mails.',
            errorMessage: 'Fehler beim Senden des Links. Bitte versuche es erneut.',
            invalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.'
        },
        en: {
            title: 'Reset Password',
            description: 'Enter your email address and we\'ll send you a link to reset your password.',
            emailLabel: 'Email Address',
            buttonText: 'Send Link',
            successMessage: 'We\'ve sent you a password reset link. Please check your email.',
            errorMessage: 'Error sending reset link. Please try again.',
            invalidEmail: 'Please enter a valid email address.'
        }
    };

    const t = texts[lang];

    document.getElementById('forgotPasswordTitle').textContent = t.title;
    document.getElementById('forgotPasswordDesc').textContent = t.description;
    document.getElementById('forgotPasswordEmailLabel').textContent = t.emailLabel;
    document.getElementById('forgotPasswordBtnText').textContent = t.buttonText;

    // Store translations for use in handleForgotPassword
    window._forgotPasswordTexts = t;
}

/**
 * Handle forgot password form submission
 */
async function handleForgotPassword(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage('Authentication service not available', 'error');
        return;
    }

    const email = document.getElementById('forgotPasswordEmail').value.trim();
    const btn = document.getElementById('forgotPasswordBtn');
    const messageEl = document.getElementById('forgotPasswordMessage');
    const t = window._forgotPasswordTexts || {
        successMessage: 'Password reset link sent. Check your email.',
        errorMessage: 'Error sending reset link.',
        invalidEmail: 'Please enter a valid email address.'
    };

    if (!email) {
        messageEl.textContent = t.invalidEmail;
        messageEl.className = 'form-message error';
        return;
    }

    setLoading(btn, true);
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    try {
        // Get current domain for redirect URL
        const redirectUrl = window.location.origin + '/reset-password.html';

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            throw error;
        }

        // Success - show message
        messageEl.textContent = t.successMessage;
        messageEl.className = 'form-message success';

        // Track successful request
        if (typeof gtag !== 'undefined') {
            gtag('event', 'forgot_password_request', {
                'event_category': 'auth'
            });
        }

        // Clear email field
        document.getElementById('forgotPasswordEmail').value = '';

        // Close modal after 3 seconds
        setTimeout(() => {
            hideForgotPasswordModal();
        }, 3000);

    } catch (error) {
        console.error('Forgot password error:', error);
        messageEl.textContent = t.errorMessage;
        messageEl.className = 'form-message error';
    } finally {
        setLoading(btn, false);
    }
}

// Also update the language switcher to update forgot password modal
// Find the existing language switching code and add this line:
// updateForgotPasswordLanguage();
```

---

#### File 3: `frontend/components/auth-modal.js` (Modify)
**Add similar functionality to AuthModal class:**

```javascript
// Add to AuthModal class translations object (lines 24-93)
// Inside both 'de' and 'en' objects, add:

forgotPasswordLink: 'Passwort vergessen?',  // DE
forgotPasswordTitle: 'Passwort zurücksetzen',
forgotPasswordDesc: 'Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.',
forgotPasswordButton: 'Link senden',
forgotPasswordSuccess: 'Wir haben dir einen Link zum Zurücksetzen deines Passworts gesendet. Bitte überprüfe deine E-Mails.',
forgotPasswordError: 'Fehler beim Senden des Links. Bitte versuche es erneut.',

// And for EN:
forgotPasswordLink: 'Forgot password?',
forgotPasswordTitle: 'Reset Password',
forgotPasswordDesc: 'Enter your email address and we\'ll send you a link to reset your password.',
forgotPasswordButton: 'Send Link',
forgotPasswordSuccess: 'We\'ve sent you a password reset link. Please check your email.',
forgotPasswordError: 'Error sending reset link. Please try again.',
```

**Add method to AuthModal class:**
```javascript
async handleForgotPassword(email) {
    const t = this.translations[this.currentLanguage];

    if (!this.supabaseClient) {
        return { error: 'Authentication service not available' };
    }

    try {
        const redirectUrl = window.location.origin + '/reset-password.html';

        const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) throw error;

        return { success: t.forgotPasswordSuccess };
    } catch (error) {
        console.error('Forgot password error:', error);
        return { error: t.forgotPasswordError };
    }
}
```

**Update render() method to include forgot password link in login form:**
```javascript
// In the login form section (around line 145), add after the submit button:
<div class="form-footer">
    <a href="#" class="forgot-password-link" onclick="this.closest('.auth-modal-content').dispatchEvent(new CustomEvent('forgotPassword')); return false;">
        ${t.forgotPasswordLink}
    </a>
</div>
```

---

#### File 4: `frontend/reset-password.html` (NEW - Create)
**Full file content:**

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passwort zurücksetzen - Verifyr</title>

    <link rel="icon" type="image/x-icon" href="images/favicon.ico">

    <!-- Supabase JS -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-blue: #3B82F6;
            --dark-blue: #1E40AF;
            --dark: #0F172A;
            --gray: #64748B;
            --light-gray: #F1F5F9;
            --white: #FFFFFF;
            --success: #10B981;
            --error: #EF4444;
        }

        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #F8FAFC 0%, #E5E7EB 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .reset-container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 480px;
            width: 100%;
        }

        .logo {
            text-align: center;
            margin-bottom: 32px;
        }

        .logo h1 {
            font-size: 32px;
            font-weight: 700;
            color: var(--primary-blue);
            font-family: 'Sora', sans-serif;
        }

        h2 {
            font-size: 24px;
            color: var(--dark);
            margin-bottom: 12px;
            text-align: center;
        }

        .description {
            color: var(--gray);
            text-align: center;
            margin-bottom: 32px;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: var(--dark);
            font-weight: 500;
            font-size: 14px;
        }

        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--light-gray);
            border-radius: 8px;
            font-size: 15px;
            transition: border-color 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary-blue);
        }

        .password-requirements {
            font-size: 12px;
            color: var(--gray);
            margin-top: 8px;
        }

        .btn-primary {
            width: 100%;
            padding: 14px 24px;
            background: var(--primary-blue);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            margin-top: 24px;
        }

        .btn-primary:hover {
            background: var(--dark-blue);
        }

        .btn-primary:disabled {
            background: var(--gray);
            cursor: not-allowed;
        }

        .btn-primary.loading .btn-text {
            display: none;
        }

        .btn-primary .btn-loading {
            display: none;
        }

        .btn-primary.loading .btn-loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
            text-align: center;
        }

        .message.success {
            background: #D1FAE5;
            color: #065F46;
            border: 1px solid #10B981;
        }

        .message.error {
            background: #FEE2E2;
            color: #991B1B;
            border: 1px solid #EF4444;
        }

        .back-to-login {
            text-align: center;
            margin-top: 24px;
        }

        .back-to-login a {
            color: var(--primary-blue);
            text-decoration: none;
            font-size: 14px;
        }

        .back-to-login a:hover {
            text-decoration: underline;
        }

        .language-switcher {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 8px;
        }

        .lang-btn {
            padding: 6px 12px;
            background: white;
            border: 2px solid var(--light-gray);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: var(--gray);
            transition: all 0.2s;
        }

        .lang-btn.active {
            background: var(--primary-blue);
            color: white;
            border-color: var(--primary-blue);
        }
    </style>
</head>
<body>
    <div class="language-switcher">
        <button class="lang-btn active" onclick="switchLanguage('de')">DE</button>
        <button class="lang-btn" onclick="switchLanguage('en')">EN</button>
    </div>

    <div class="reset-container">
        <div class="logo">
            <h1>Verifyr</h1>
        </div>

        <h2 id="pageTitle">Neues Passwort festlegen</h2>
        <p class="description" id="pageDescription">
            Bitte gib dein neues Passwort ein. Es muss mindestens 6 Zeichen lang sein.
        </p>

        <form id="resetPasswordForm" onsubmit="handleResetPassword(event)">
            <div class="form-group">
                <label for="newPassword" id="passwordLabel">Neues Passwort</label>
                <input
                    type="password"
                    id="newPassword"
                    class="form-input"
                    placeholder="Mindestens 6 Zeichen"
                    minlength="6"
                    required
                >
            </div>

            <div class="form-group">
                <label for="confirmPassword" id="confirmPasswordLabel">Passwort bestätigen</label>
                <input
                    type="password"
                    id="confirmPassword"
                    class="form-input"
                    placeholder="Passwort erneut eingeben"
                    minlength="6"
                    required
                >
                <div class="password-requirements" id="passwordRequirements">
                    Das Passwort muss mindestens 6 Zeichen lang sein.
                </div>
            </div>

            <button type="submit" class="btn-primary" id="resetBtn">
                <span class="btn-text" id="btnText">Passwort aktualisieren</span>
                <span class="btn-loading"></span>
            </button>

            <div id="message"></div>
        </form>

        <div class="back-to-login">
            <a href="/auth.html" id="backToLoginLink">Zurück zur Anmeldung</a>
        </div>
    </div>

    <script src="reset-password.js"></script>
</body>
</html>
```

---

#### File 5: `frontend/reset-password.js` (NEW - Create)
**Full file content:**

```javascript
/**
 * Reset Password Page - Handles password reset via Supabase
 */

let supabaseClient = null;
let currentLanguage = 'de';

// Translations
const translations = {
    de: {
        pageTitle: 'Neues Passwort festlegen',
        pageDescription: 'Bitte gib dein neues Passwort ein. Es muss mindestens 6 Zeichen lang sein.',
        passwordLabel: 'Neues Passwort',
        confirmPasswordLabel: 'Passwort bestätigen',
        passwordRequirements: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
        btnText: 'Passwort aktualisieren',
        backToLoginLink: 'Zurück zur Anmeldung',
        successMessage: 'Passwort erfolgreich aktualisiert! Du wirst zur Anmeldeseite weitergeleitet...',
        errorPasswordMismatch: 'Die Passwörter stimmen nicht überein.',
        errorTooShort: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
        errorGeneric: 'Fehler beim Aktualisieren des Passworts. Bitte versuche es erneut.',
        errorInvalidToken: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordere einen neuen Link an.',
        errorNoToken: 'Kein Reset-Token gefunden. Bitte benutze den Link aus deiner E-Mail.',
        loadingConfig: 'Lade Konfiguration...'
    },
    en: {
        pageTitle: 'Set New Password',
        pageDescription: 'Please enter your new password. It must be at least 6 characters long.',
        passwordLabel: 'New Password',
        confirmPasswordLabel: 'Confirm Password',
        passwordRequirements: 'Password must be at least 6 characters long.',
        btnText: 'Update Password',
        backToLoginLink: 'Back to Login',
        successMessage: 'Password updated successfully! Redirecting to login page...',
        errorPasswordMismatch: 'Passwords do not match.',
        errorTooShort: 'Password must be at least 6 characters long.',
        errorGeneric: 'Error updating password. Please try again.',
        errorInvalidToken: 'Invalid or expired reset link. Please request a new one.',
        errorNoToken: 'No reset token found. Please use the link from your email.',
        loadingConfig: 'Loading configuration...'
    }
};

/**
 * Initialize on page load
 */
async function init() {
    // Get language from localStorage or URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    currentLanguage = urlLang || localStorage.getItem('verifyr-lang') || 'de';

    // Update UI language
    updateLanguage();

    // Load Supabase config and initialize client
    await loadSupabaseConfig();

    // Check if we have a valid session (from magic link)
    checkResetToken();
}

/**
 * Load Supabase configuration from backend
 */
async function loadSupabaseConfig() {
    try {
        showMessage(translations[currentLanguage].loadingConfig, 'info');

        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error('Failed to load config');
        }

        const config = await response.json();

        if (config.supabase_url && config.supabase_anon_key && window.supabase) {
            supabaseClient = window.supabase.createClient(
                config.supabase_url,
                config.supabase_anon_key
            );
            console.log('✅ Supabase client initialized');
            hideMessage();
        } else {
            throw new Error('Supabase configuration missing');
        }
    } catch (error) {
        console.error('Error loading Supabase config:', error);
        showMessage(translations[currentLanguage].errorGeneric, 'error');
    }
}

/**
 * Check if reset token is present and valid
 */
async function checkResetToken() {
    if (!supabaseClient) {
        showMessage(translations[currentLanguage].errorGeneric, 'error');
        return;
    }

    try {
        // Supabase automatically handles the token from URL hash
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (!session) {
            // No session means no valid token
            showMessage(translations[currentLanguage].errorNoToken, 'error');
            disableForm();
            return;
        }

        console.log('✅ Valid reset token detected');
    } catch (error) {
        console.error('Error checking reset token:', error);
        showMessage(translations[currentLanguage].errorInvalidToken, 'error');
        disableForm();
    }
}

/**
 * Handle password reset form submission
 */
async function handleResetPassword(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(translations[currentLanguage].errorGeneric, 'error');
        return;
    }

    const t = translations[currentLanguage];
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('resetBtn');

    // Validation
    if (newPassword.length < 6) {
        showMessage(t.errorTooShort, 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage(t.errorPasswordMismatch, 'error');
        return;
    }

    // Set loading state
    setLoading(btn, true);
    hideMessage();

    try {
        // Update password for the authenticated user
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        // Success!
        showMessage(t.successMessage, 'success');

        // Track successful password reset
        if (typeof gtag !== 'undefined') {
            gtag('event', 'password_reset_success', {
                'event_category': 'auth'
            });
        }

        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = '/auth.html';
        }, 2000);

    } catch (error) {
        console.error('Password reset error:', error);
        const errorMsg = error.message || t.errorGeneric;
        showMessage(errorMsg, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/**
 * Switch language
 */
function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('verifyr-lang', lang);
    updateLanguage();
}

/**
 * Update UI language
 */
function updateLanguage() {
    const t = translations[currentLanguage];

    // Update text content
    document.getElementById('pageTitle').textContent = t.pageTitle;
    document.getElementById('pageDescription').textContent = t.pageDescription;
    document.getElementById('passwordLabel').textContent = t.passwordLabel;
    document.getElementById('confirmPasswordLabel').textContent = t.confirmPasswordLabel;
    document.getElementById('passwordRequirements').textContent = t.passwordRequirements;
    document.getElementById('btnText').textContent = t.btnText;
    document.getElementById('backToLoginLink').textContent = t.backToLoginLink;

    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(currentLanguage));
    });

    // Update document lang attribute
    document.documentElement.lang = currentLanguage;
}

/**
 * Show message
 */
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

/**
 * Hide message
 */
function hideMessage() {
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';
    messageEl.className = '';
}

/**
 * Set loading state
 */
function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

/**
 * Disable form (when token is invalid)
 */
function disableForm() {
    document.getElementById('resetBtn').disabled = true;
    document.getElementById('newPassword').disabled = true;
    document.getElementById('confirmPassword').disabled = true;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
```

---

## 3. Supabase Configuration Changes

### 3.1 Email Templates Configuration

**Location:** Supabase Dashboard → Authentication → Email Templates

#### Template: "Reset Password"
**What to update:**
- **Subject line:** Keep default or customize
- **Email body:** Customize if needed (optional)
- **Redirect URL:** This is handled in code, but verify in dashboard

**Default template works fine**, Supabase automatically includes the reset link.

**Verify Settings:**
1. Go to Supabase Dashboard
2. Navigate to: **Authentication → Email Templates**
3. Find **"Reset Password"** template
4. Ensure it's enabled
5. **Confirm URL:** The `redirectTo` parameter in code will override this

**Example email template (already configured by Supabase):**
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

---

### 3.2 Redirect URLs Configuration

**Location:** Supabase Dashboard → Authentication → URL Configuration

**Add to Redirect URLs (whitelist):**
```
http://localhost:8000/reset-password.html
https://your-production-domain.com/reset-password.html
https://www.verifyr.de/reset-password.html
```

**Steps:**
1. Go to Supabase Dashboard
2. Navigate to: **Authentication → URL Configuration**
3. Under **"Redirect URLs"**, add:
   - `http://localhost:8000/*` (for development)
   - `https://your-domain.com/*` (for production)
4. Click **Save**

**Why needed:** Supabase only allows redirects to whitelisted URLs for security.

---

### 3.3 Email Provider Settings

**Location:** Supabase Dashboard → Project Settings → Auth → Email

**Verify:**
- **SMTP settings** (if using custom email provider)
- **Rate limits** (default: 4 emails per hour per user)
- **Email confirmation required:** Can be OFF for password resets

**For production:**
- Consider using SendGrid, AWS SES, or other SMTP provider
- Update SMTP settings in Supabase dashboard
- Test email delivery

---

### 3.4 Password Policy

**Location:** Supabase Dashboard → Authentication → Policies

**Current requirement:** Minimum 6 characters (standard Supabase default)

**To change:**
1. Go to **Authentication → Policies**
2. Adjust **Minimum password length** if needed
3. Update frontend validation to match

---

## 4. Backend Changes (Minimal)

### No backend changes required! ✅

The password reset flow is entirely handled by Supabase:
- Frontend calls `supabaseClient.auth.resetPasswordForEmail()`
- Supabase sends email
- User clicks link → lands on frontend reset page
- Frontend calls `supabaseClient.auth.updateUser()`
- Supabase updates password

**Backend JWT verification (existing) continues to work** - no changes needed in `auth_middleware.py`.

---

## 5. Testing Plan

### 5.1 Development Testing

**Step 1: Test Forgot Password Flow**
1. Start local server: `.\manage_server.ps1 -Action start`
2. Open `http://localhost:8000/auth.html`
3. Click "Forgot Password?" link
4. Enter test email (must be existing Supabase user)
5. Check email inbox for reset link
6. Verify email contains correct redirect URL

**Step 2: Test Password Reset**
1. Click link in email
2. Should land on `http://localhost:8000/reset-password.html`
3. Enter new password (min 6 chars)
4. Enter confirmation password (must match)
5. Click "Update Password"
6. Should see success message
7. Should redirect to login page after 2s

**Step 3: Test New Password Login**
1. On login page, enter email
2. Enter NEW password (not old one)
3. Should login successfully
4. Should redirect to quiz or chat

**Step 4: Test Error Cases**
- Non-existent email → Should still say "email sent" (security)
- Invalid token → Should show error on reset page
- Passwords don't match → Should show error
- Password too short (<6 chars) → Should show error
- Expired token (>1 hour) → Should show error

---

### 5.2 Production Testing

**Before Deployment:**
1. Add production domain to Supabase redirect URLs
2. Test SMTP email delivery
3. Verify email template formatting
4. Test on mobile devices

**After Deployment:**
1. Test forgot password flow on production URL
2. Verify emails are received (check spam folder)
3. Verify reset link works
4. Monitor Supabase auth logs for errors

---

## 6. File Summary

### Files to Modify:
1. ✏️ `frontend/auth.html` - Add forgot password link + modal
2. ✏️ `frontend/auth.js` - Add 3 functions (show/hide/handle forgot password)
3. ✏️ `frontend/components/auth-modal.js` - Add forgot password translations + method

### Files to Create:
4. ✨ `frontend/reset-password.html` - Password reset page
5. ✨ `frontend/reset-password.js` - Reset password logic

### Files Unchanged:
- ✅ `backend/auth_middleware.py` - No changes needed
- ✅ `backend/main.py` - No changes needed
- ✅ All other backend files

---

## 7. Implementation Checklist

### Phase 1: Frontend (2-3 hours)
- [ ] Modify `auth.html` - add forgot password link + modal
- [ ] Modify `auth.js` - add 3 functions
- [ ] Modify `auth-modal.js` - add translations + method
- [ ] Create `reset-password.html`
- [ ] Create `reset-password.js`
- [ ] Test locally

### Phase 2: Supabase Config (15 mins)
- [ ] Add redirect URLs to whitelist
- [ ] Verify email template is enabled
- [ ] Test email delivery
- [ ] Check rate limits

### Phase 3: Testing (1 hour)
- [ ] Test forgot password flow (happy path)
- [ ] Test password reset (happy path)
- [ ] Test error cases (invalid token, mismatch, etc.)
- [ ] Test on mobile
- [ ] Cross-browser testing

### Phase 4: Deployment (30 mins)
- [ ] Commit changes
- [ ] Deploy to production
- [ ] Add production URL to Supabase
- [ ] Test production flow
- [ ] Monitor logs

---

## 8. User Experience Flow

### Scenario 1: User Forgets Password
```
1. User goes to login page
2. Clicks "Forgot Password?"
3. Enters email → "Check your email"
4. Receives email within 1 minute
5. Clicks reset link
6. Lands on reset page
7. Enters new password
8. Success! Redirects to login
9. Logs in with new password
```

### Scenario 2: Admin Creates New Account
```
1. Admin creates Supabase user account (manual)
2. Admin does NOT set password
3. Admin uses Supabase "Send password reset email" feature
4. User receives email with setup link
5. User clicks link → sets own password
6. User logs in with self-chosen password
```

**Benefit:** Users set their own secure passwords, no need to share credentials.

---

## 9. Security Considerations

✅ **Password reset tokens expire after 1 hour** (Supabase default)
✅ **Rate limiting:** 4 reset emails per hour per user (prevents abuse)
✅ **Email verification:** Reset link only works once
✅ **HTTPS required:** Redirect URLs must use HTTPS in production
✅ **No password sent via email:** Only secure reset links
✅ **Token in URL hash:** More secure than query params (not sent to server logs)

---

## 10. Cost Impact

**Supabase Free Tier:**
- 50,000 monthly active users
- Unlimited password reset emails (counted as auth events)
- No additional cost

**Custom SMTP (if used):**
- Depends on provider (SendGrid, AWS SES, etc.)
- Typically $0.0001 per email
- 1,000 resets/month = $0.10

---

## 11. Future Enhancements

**Phase 2 (Optional):**
1. **Change Password (for logged-in users)**
   - Add settings page
   - Require current password for verification
   - Allow password update without email flow

2. **Two-Factor Authentication (2FA)**
   - Supabase supports TOTP
   - Add to user settings

3. **Social Login**
   - Google OAuth
   - GitHub OAuth
   - Apple Sign In

4. **Magic Link Login**
   - Passwordless authentication
   - Email-only login

---

## Ready to Implement! ✅

**Total Implementation Time:** ~4-5 hours (including testing)
**Complexity:** Low (mostly frontend, Supabase handles backend)
**Impact:** High (essential UX feature)
**Risk:** Low (isolated feature, easy to rollback)

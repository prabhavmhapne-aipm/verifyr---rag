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

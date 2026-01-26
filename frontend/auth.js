/**
 * Verifyr Authentication - Frontend Logic
 *
 * Handles login/signup using Supabase authentication.
 * Redirects to chat.html (users) or admin.html (admins) after login.
 */

// Configuration - will be loaded from backend
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';
let ENABLE_SIGNUP = true;

// Hardcoded credentials for waitlist (same as index.html)
const WAITLIST_SUPABASE_URL = 'https://aoeskfvjqlnxpwerzdxh.supabase.co';
const WAITLIST_SUPABASE_KEY = 'sb_publishable_6uxROb1pJC1WMgekGFUHGQ_uhe-J1kM';

// Supabase client instance
let supabaseClient = null;

/**
 * Initialize authentication on page load
 */
async function initAuth() {
    try {
        // Load configuration from backend
        const config = await loadConfig();
        SUPABASE_URL = config.supabase_url;
        SUPABASE_ANON_KEY = config.supabase_anon_key;
        ENABLE_SIGNUP = config.enable_signup;

        // Initialize Supabase client
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Check if already logged in
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                // Already logged in, redirect
                redirectAfterLogin(session);
                return;
            }
        } else {
            showMessage('Configuration error: Supabase not configured', 'error');
            disableAllForms();
            return;
        }

        // Update UI based on signup setting
        updateSignupUI();

    } catch (error) {
        console.error('Error initializing auth:', error);
        showMessage('Failed to load authentication. Please try again later.', 'error');
    }
}

/**
 * Load configuration from backend
 */
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error('Failed to load config');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        // Return defaults
        return {
            supabase_url: '',
            supabase_anon_key: '',
            enable_signup: false
        };
    }
}

/**
 * Update signup UI based on ENABLE_SIGNUP setting
 */
function updateSignupUI() {
    const signupTab = document.getElementById('signupTab');
    const signupFields = document.getElementById('signupFields');
    const signupDisabledNotice = document.getElementById('signupDisabledNotice');

    if (!ENABLE_SIGNUP) {
        // Disable signup tab
        signupTab.disabled = true;
        signupTab.title = 'Registration is currently disabled';

        // Show disabled notice in signup form
        if (signupFields) signupFields.style.display = 'none';
        if (signupDisabledNotice) signupDisabledNotice.style.display = 'block';
    }
}

/**
 * Show login form
 */
function showLoginForm() {
    // Update tabs
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('waitlistTab').classList.remove('active');
    document.getElementById('signupTab').classList.remove('active');

    // Update forms
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('waitlistForm').classList.remove('active');
    document.getElementById('signupForm').classList.remove('active');

    // Track tab switch to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'auth_tab_switch', {
            'event_category': 'navigation',
            'tab': 'login'
        });
    }

    hideMessage();
}

/**
 * Show waitlist form
 */
function showWaitlistForm() {
    // Update tabs
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('waitlistTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');

    // Update forms
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('waitlistForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');

    // Track tab switch to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'auth_tab_switch', {
            'event_category': 'navigation',
            'tab': 'waitlist'
        });
    }

    hideMessage();
}

/**
 * Show signup form
 */
function showSignupForm() {
    // Update tabs
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('waitlistTab').classList.remove('active');
    document.getElementById('signupTab').classList.add('active');

    // Update forms
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('waitlistForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');

    // Track tab switch to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'auth_tab_switch', {
            'event_category': 'navigation',
            'tab': 'signup'
        });
    }

    hideMessage();
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage('Authentication service not available', 'error');
        return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
    }

    setLoading(btn, true);
    hideMessage();

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (data.session) {
            // Track successful login to Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'login', {
                    'method': 'email'
                });
            }

            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => redirectAfterLogin(data.session), 500);
        }

    } catch (error) {
        console.error('Login error:', error);
        showMessage(getErrorMessage(error), 'error');
    } finally {
        setLoading(btn, false);
    }
}

/**
 * Handle signup form submission
 */
async function handleSignup(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage('Authentication service not available', 'error');
        return;
    }

    if (!ENABLE_SIGNUP) {
        showMessage('Registration is currently disabled', 'error');
        return;
    }

    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = document.getElementById('signupBtn');

    // Validation
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    setLoading(btn, true);
    hideMessage();

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            // Check if email confirmation is required
            if (data.user.identities && data.user.identities.length === 0) {
                showMessage('This email is already registered. Please login instead.', 'error');
                showLoginForm();
            } else if (data.session) {
                // Auto-confirmed, redirect
                showMessage('Account created! Redirecting...', 'success');
                setTimeout(() => redirectAfterLogin(data.session), 500);
            } else {
                // Email confirmation required
                showMessage('Account created! Please check your email to confirm your account.', 'success');
            }
        }

    } catch (error) {
        console.error('Signup error:', error);
        showMessage(getErrorMessage(error), 'error');
    } finally {
        setLoading(btn, false);
    }
}

/**
 * Redirect user after successful login
 */
function redirectAfterLogin(session) {
    // Check if user is admin
    const user = session.user;
    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    const isAdmin = (
        userMetadata.is_admin === true ||
        appMetadata.is_admin === true ||
        userMetadata.role === 'admin' ||
        appMetadata.role === 'admin'
    );

    // Store session token for API calls
    localStorage.setItem('verifyr_access_token', session.access_token);
    localStorage.setItem('verifyr_user_id', user.id);
    localStorage.setItem('verifyr_user_email', user.email);
    localStorage.setItem('verifyr_is_admin', isAdmin.toString());

    // Redirect based on role
    if (isAdmin) {
        window.location.href = '/admin.html';
    } else {
        // Redirect to quiz first (new user flow)
        window.location.href = '/quiz/category.html';
    }
}

/**
 * Show message to user
 */
function showMessage(text, type) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
}

/**
 * Hide message
 */
function hideMessage() {
    const messageEl = document.getElementById('authMessage');
    messageEl.className = 'auth-message';
    messageEl.textContent = '';
}

/**
 * Set loading state on button
 */
function setLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Disable all forms (for error states)
 */
function disableAllForms() {
    document.getElementById('loginBtn').disabled = true;
    document.getElementById('signupBtn').disabled = true;
    document.getElementById('signupTab').disabled = true;
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'ToggleIcon');

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = 'Hide';
    } else {
        input.type = 'password';
        if (icon) icon.textContent = 'Show';
    }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error) {
    const message = error.message || error.toString();

    // Map common Supabase errors to friendly messages
    if (message.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please try again.';
    }
    if (message.includes('Email not confirmed')) {
        return 'Please confirm your email before logging in.';
    }
    if (message.includes('User already registered')) {
        return 'This email is already registered. Please login instead.';
    }
    if (message.includes('Password should be')) {
        return 'Password must be at least 6 characters long.';
    }
    if (message.includes('rate limit')) {
        return 'Too many attempts. Please try again later.';
    }

    return message;
}

/**
 * Handle waitlist form submission
 */
async function handleWaitlist(event) {
    event.preventDefault();

    const emailInput = document.getElementById('waitlistEmail');
    const submitBtn = document.getElementById('waitlistBtn');
    const messageEl = document.getElementById('waitlistMessage');
    const email = emailInput.value.trim();

    // Rate limiting
    const rateLimitKey = 'last_waitlist_submit';
    const lastSubmit = localStorage.getItem(rateLimitKey);
    const now = Date.now();

    if (lastSubmit && now - lastSubmit < 60000) {
        const msg = window.translations?.[window.currentLanguage]?.waitlist?.rateLimit || 'Please wait before submitting again.';
        messageEl.textContent = msg;
        messageEl.className = 'waitlist-message error';
        return;
    }

    localStorage.setItem(rateLimitKey, now);

    submitBtn.disabled = true;
    const joiningText = window.translations?.[window.currentLanguage]?.waitlist?.joining || 'Joining...';
    submitBtn.querySelector('.btn-text').textContent = joiningText;
    messageEl.textContent = '';
    messageEl.className = 'waitlist-message';

    try {
        // Use hardcoded credentials for waitlist (same as index.html)
        const response = await fetch(`${WAITLIST_SUPABASE_URL}/rest/v1/early_access_emails`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': WAITLIST_SUPABASE_KEY,
                'Authorization': `Bearer ${WAITLIST_SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                email: email,
                created_at: new Date().toISOString()
            })
        });

        if (response.ok || response.status === 201) {
            // Track successful waitlist join to Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'waitlist_join', {
                    'event_category': 'conversion'
                });
            }

            const successMsg = window.translations?.[window.currentLanguage]?.waitlist?.success || "You're on the waitlist! We'll notify you when your access is approved.";
            messageEl.textContent = successMsg;
            messageEl.className = 'waitlist-message success';
            emailInput.value = '';
        } else if (response.status === 409) {
            // Email already exists in waitlist
            const alreadyMsg = window.translations?.[window.currentLanguage]?.waitlist?.alreadyOnList || "This email is already on the waitlist. We'll notify you when access is approved.";
            messageEl.textContent = alreadyMsg;
            messageEl.className = 'waitlist-message success';
            emailInput.value = '';
        } else {
            const errorText = await response.text();
            console.error('Waitlist API error:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
        }
    } catch (error) {
        console.error('Waitlist error:', error);
        messageEl.textContent = 'Something went wrong. Please try again.';
        messageEl.className = 'waitlist-message error';
    } finally {
        submitBtn.disabled = false;
        const buttonText = window.translations?.[window.currentLanguage]?.waitlist?.button || 'Join Waitlist';
        submitBtn.querySelector('.btn-text').textContent = buttonText;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAuth);

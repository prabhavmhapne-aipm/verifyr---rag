/**
 * AuthModal - Reusable authentication modal component
 * Displays login/waitlist/signup interface with language support
 * Follows same rules and functions as auth.html
 */

class AuthModal {
    constructor(options = {}) {
        this.redirectTarget = options.redirectTarget; // 'results' or 'chat'
        this.onAuthSuccess = options.onAuthSuccess;
        this.allowClose = options.allowClose || false; // Cannot close on results/chat
        this.currentLanguage = localStorage.getItem('verifyr-lang') || 'de';
        this.supabaseClient = null;
        this.supabaseConfig = null;
        this.modalEl = null;
        this.currentTab = 'login';
        this.enableSignup = false; // Disabled by default, loaded from config

        // Correct waitlist credentials (same as auth.html)
        this.WAITLIST_SUPABASE_URL = 'https://aoeskfvjqlnxpwerzdxh.supabase.co';
        this.WAITLIST_SUPABASE_KEY = 'sb_publishable_6uxROb1pJC1WMgekGFUHGQ_uhe-J1kM';

        // Translations
        this.translations = {
            de: {
                title: 'Anmelden um fortzufahren',
                loginTab: 'Anmelden',
                waitlistTab: 'Warteliste',
                signupTab: 'Registrieren',
                signupDisabled: 'Registrierung ist derzeit deaktiviert',
                emailLabel: 'E-Mail',
                emailPlaceholder: 'deine@email.com',
                passwordLabel: 'Passwort',
                passwordPlaceholder: 'Gib dein Passwort ein',
                confirmPasswordLabel: 'Passwort bestätigen',
                confirmPasswordPlaceholder: 'Passwort erneut eingeben',
                loginButton: 'Anmelden',
                waitlistButton: 'Auf Warteliste setzen',
                signupButton: 'Registrieren',
                loginSuccess: 'Anmeldung erfolgreich! Weiterleitung...',
                waitlistSuccess: 'Du stehst auf der Warteliste! Wir benachrichtigen dich, sobald dein Zugang freigeschaltet ist.',
                waitlistAlreadyOnList: 'Diese E-Mail steht bereits auf der Warteliste. Wir benachrichtigen dich, sobald dein Zugang freigeschaltet ist.',
                waitlistJoining: 'Wird hinzugefügt...',
                waitlistRateLimit: 'Bitte warte kurz, bevor du es erneut versuchst.',
                signupSuccess: 'Konto erfolgreich erstellt! Weiterleitung...',
                signupEmailConfirm: 'Konto erstellt! Bitte überprüfe deine E-Mail, um dein Konto zu bestätigen.',
                invalidCredentials: 'Ungültige E-Mail oder Passwort. Bitte versuche es erneut.',
                emailNotConfirmed: 'Bitte bestätige deine E-Mail vor der Anmeldung.',
                userAlreadyRegistered: 'Diese E-Mail ist bereits registriert. Bitte melde dich stattdessen an.',
                passwordTooShort: 'Passwort muss mindestens 6 Zeichen lang sein.',
                passwordMismatch: 'Passwörter stimmen nicht überein.',
                rateLimitError: 'Zu viele Versuche. Bitte versuche es später erneut.',
                genericError: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
                fillAllFields: 'Bitte fülle alle Felder aus.',
                signupDisabledMessage: 'Registrierung ist derzeit deaktiviert',
                show: 'Zeigen',
                hide: 'Verbergen'
            },
            en: {
                title: 'Sign in to continue',
                loginTab: 'Login',
                waitlistTab: 'Waitlist',
                signupTab: 'Sign Up',
                signupDisabled: 'Registration is currently disabled',
                emailLabel: 'Email Address',
                emailPlaceholder: 'your@email.com',
                passwordLabel: 'Password',
                passwordPlaceholder: 'Enter your password',
                confirmPasswordLabel: 'Confirm Password',
                confirmPasswordPlaceholder: 'Re-enter password',
                loginButton: 'Log In',
                waitlistButton: 'Join Waitlist',
                signupButton: 'Sign Up',
                loginSuccess: 'Login successful! Redirecting...',
                waitlistSuccess: "You're on the waitlist! We'll notify you when your access is approved.",
                waitlistAlreadyOnList: "This email is already on the waitlist. We'll notify you when access is approved.",
                waitlistJoining: 'Joining...',
                waitlistRateLimit: 'Please wait before submitting again.',
                signupSuccess: 'Account created successfully! Redirecting...',
                signupEmailConfirm: 'Account created! Please check your email to confirm your account.',
                invalidCredentials: 'Invalid email or password. Please try again.',
                emailNotConfirmed: 'Please confirm your email before logging in.',
                userAlreadyRegistered: 'This email is already registered. Please login instead.',
                passwordTooShort: 'Password must be at least 6 characters long.',
                passwordMismatch: 'Passwords do not match.',
                rateLimitError: 'Too many attempts. Please try again later.',
                genericError: 'Something went wrong. Please try again.',
                fillAllFields: 'Please fill in all fields.',
                signupDisabledMessage: 'Registration is currently disabled',
                show: 'Show',
                hide: 'Hide'
            }
        };

        // Prevent multiple instances
        if (window.__authModalInstance) {
            window.__authModalInstance.destroy();
        }
        window.__authModalInstance = this;

        this.render();
        this.init();
    }

    render() {
        const t = this.translations[this.currentLanguage];
        const closeClass = this.allowClose ? '' : 'no-close';

        const html = `
            <div class="auth-modal-overlay">
                <div class="auth-modal-content ${closeClass}">
                    ${this.allowClose ? '<button class="modal-close" aria-label="Close">&times;</button>' : ''}

                    <div class="auth-modal-header">
                        <h2 class="auth-modal-title">${t.title}</h2>
                        <div class="language-switcher">
                            <button class="lang-btn ${this.currentLanguage === 'de' ? 'active' : ''}" data-lang="de">DE</button>
                            <span class="lang-separator">|</span>
                            <button class="lang-btn ${this.currentLanguage === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                        </div>
                    </div>

                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">${t.loginTab}</button>
                        <button class="auth-tab" data-tab="waitlist">${t.waitlistTab}</button>
                        <button class="auth-tab" data-tab="signup" disabled title="${t.signupDisabled}">${t.signupTab}</button>
                    </div>

                    <div class="auth-forms">
                        <!-- Login Form -->
                        <form id="loginForm" class="auth-form active">
                            <div class="form-group">
                                <label for="loginEmail">${t.emailLabel}</label>
                                <input type="email" id="loginEmail" class="form-input" placeholder="${t.emailPlaceholder}" required autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">${t.passwordLabel}</label>
                                <div class="password-wrapper">
                                    <input type="password" id="loginPassword" class="form-input" placeholder="${t.passwordPlaceholder}" required autocomplete="current-password">
                                    <button type="button" class="password-toggle" data-target="loginPassword">
                                        <span class="password-toggle-text">${t.show}</span>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" class="btn-primary">
                                <span class="btn-text">${t.loginButton}</span>
                                <span class="btn-loading"></span>
                            </button>
                            <div class="form-message" id="loginMessage"></div>
                        </form>

                        <!-- Waitlist Form -->
                        <form id="waitlistForm" class="auth-form">
                            <div class="form-group">
                                <label for="waitlistEmail">${t.emailLabel}</label>
                                <input type="email" id="waitlistEmail" class="form-input" placeholder="${t.emailPlaceholder}" required autocomplete="email">
                            </div>
                            <button type="submit" class="btn-primary">
                                <span class="btn-text">${t.waitlistButton}</span>
                                <span class="btn-loading"></span>
                            </button>
                            <div class="form-message" id="waitlistMessage"></div>
                        </form>

                        <!-- Signup Form -->
                        <form id="signupForm" class="auth-form">
                            <div class="signup-disabled-notice">
                                <strong>${t.signupDisabledMessage}</strong>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Inject into document body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        this.modalEl = tempDiv.firstElementChild;
        document.body.appendChild(this.modalEl);
    }

    async init() {
        // Load Supabase config
        await this.loadSupabaseConfig();

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadSupabaseConfig() {
        try {
            const response = await fetch('/config');
            if (response.ok) {
                this.supabaseConfig = await response.json();
                this.enableSignup = this.supabaseConfig.enable_signup || false;

                // Update signup tab state
                const signupTab = this.modalEl.querySelector('[data-tab="signup"]');
                if (!this.enableSignup) {
                    signupTab.disabled = true;
                }

                // Initialize Supabase client
                if (this.supabaseConfig.supabase_url && this.supabaseConfig.supabase_anon_key && window.supabase) {
                    this.supabaseClient = window.supabase.createClient(
                        this.supabaseConfig.supabase_url,
                        this.supabaseConfig.supabase_anon_key
                    );
                }
            }
        } catch (error) {
            console.error('Error loading Supabase config:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        const tabButtons = this.modalEl.querySelectorAll('.auth-tab');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    this.switchTab(btn.dataset.tab);
                }
            });
        });

        // Language switching
        const langButtons = this.modalEl.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchLanguage(btn.dataset.lang));
        });

        // Password toggle buttons
        const passwordToggles = this.modalEl.querySelectorAll('.password-toggle');
        passwordToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                this.togglePassword(targetId);
            });
        });

        // Close button (if allowed)
        if (this.allowClose) {
            const closeBtn = this.modalEl.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Click outside to close
            this.modalEl.addEventListener('click', (e) => {
                if (e.target === this.modalEl) {
                    this.hide();
                }
            });
        }

        // Form submissions
        const loginForm = this.modalEl.querySelector('#loginForm');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const waitlistForm = this.modalEl.querySelector('#waitlistForm');
        waitlistForm.addEventListener('submit', (e) => this.handleWaitlist(e));
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        const tabButtons = this.modalEl.querySelectorAll('.auth-tab');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update forms
        const forms = this.modalEl.querySelectorAll('.auth-form');
        forms.forEach(form => {
            form.classList.remove('active');
        });

        const activeForm = this.modalEl.querySelector(`#${tabName}Form`);
        if (activeForm) {
            activeForm.classList.add('active');
        }

        // Clear messages
        this.clearMessages();
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('verifyr-lang', lang);

        const t = this.translations[lang];

        // Update title
        this.modalEl.querySelector('.auth-modal-title').textContent = t.title;

        // Update tabs
        const tabs = this.modalEl.querySelectorAll('.auth-tab');
        tabs[0].textContent = t.loginTab;
        tabs[1].textContent = t.waitlistTab;
        tabs[2].textContent = t.signupTab;
        tabs[2].title = t.signupDisabled;

        // Update login form
        const loginForm = this.modalEl.querySelector('#loginForm');
        loginForm.querySelector('label[for="loginEmail"]').textContent = t.emailLabel;
        loginForm.querySelector('#loginEmail').placeholder = t.emailPlaceholder;
        loginForm.querySelector('label[for="loginPassword"]').textContent = t.passwordLabel;
        loginForm.querySelector('#loginPassword').placeholder = t.passwordPlaceholder;
        loginForm.querySelector('.btn-text').textContent = t.loginButton;
        loginForm.querySelector('.password-toggle-text').textContent = t.show;

        // Update waitlist form
        const waitlistForm = this.modalEl.querySelector('#waitlistForm');
        waitlistForm.querySelector('label[for="waitlistEmail"]').textContent = t.emailLabel;
        waitlistForm.querySelector('#waitlistEmail').placeholder = t.emailPlaceholder;
        waitlistForm.querySelector('.btn-text').textContent = t.waitlistButton;

        // Update signup disabled message
        const signupNotice = this.modalEl.querySelector('.signup-disabled-notice strong');
        if (signupNotice) {
            signupNotice.textContent = t.signupDisabledMessage;
        }

        // Update language buttons
        const langButtons = this.modalEl.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    }

    togglePassword(inputId) {
        const input = this.modalEl.querySelector(`#${inputId}`);
        const toggle = this.modalEl.querySelector(`[data-target="${inputId}"]`);
        const toggleText = toggle.querySelector('.password-toggle-text');
        const t = this.translations[this.currentLanguage];

        if (input.type === 'password') {
            input.type = 'text';
            toggleText.textContent = t.hide;
        } else {
            input.type = 'password';
            toggleText.textContent = t.show;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const t = this.translations[this.currentLanguage];
        const messageEl = this.modalEl.querySelector('#loginMessage');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        const email = this.modalEl.querySelector('#loginEmail').value.trim();
        const password = this.modalEl.querySelector('#loginPassword').value;

        if (!email || !password) {
            this.showMessage(messageEl, t.fillAllFields, 'error');
            return;
        }

        this.setLoading(submitBtn, true);
        this.clearMessage(messageEl);

        try {
            if (!this.supabaseClient) {
                throw new Error('Authentication service not available');
            }

            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data.session) {
                this.showMessage(messageEl, t.loginSuccess, 'success');

                // Store tokens
                this.storeSession(data.session);

                // Call success callback or redirect
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(data.session);
                } else {
                    this.redirectAfterLogin(data.session);
                }
            }

        } catch (error) {
            console.error('Login error:', error);
            const errorMsg = this.getErrorMessage(error);
            this.showMessage(messageEl, errorMsg, 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async handleWaitlist(e) {
        e.preventDefault();
        const t = this.translations[this.currentLanguage];
        const messageEl = this.modalEl.querySelector('#waitlistMessage');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const emailInput = this.modalEl.querySelector('#waitlistEmail');
        const email = emailInput.value.trim();

        // Rate limiting
        const rateLimitKey = 'last_waitlist_submit';
        const lastSubmit = localStorage.getItem(rateLimitKey);
        const now = Date.now();

        if (lastSubmit && now - lastSubmit < 60000) {
            this.showMessage(messageEl, t.waitlistRateLimit, 'error');
            return;
        }

        localStorage.setItem(rateLimitKey, now);

        this.setLoading(submitBtn, true);
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = t.waitlistJoining;
        this.clearMessage(messageEl);

        try {
            // Use correct waitlist credentials
            const response = await fetch(`${this.WAITLIST_SUPABASE_URL}/rest/v1/early_access_emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.WAITLIST_SUPABASE_KEY,
                    'Authorization': `Bearer ${this.WAITLIST_SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    email: email,
                    created_at: new Date().toISOString()
                })
            });

            if (response.ok || response.status === 201) {
                this.showMessage(messageEl, t.waitlistSuccess, 'success');
                emailInput.value = '';
            } else if (response.status === 409) {
                // Email already exists
                this.showMessage(messageEl, t.waitlistAlreadyOnList, 'success');
                emailInput.value = '';
            } else {
                throw new Error(`API error: ${response.status}`);
            }

        } catch (error) {
            console.error('Waitlist error:', error);
            this.showMessage(messageEl, t.genericError, 'error');
        } finally {
            this.setLoading(submitBtn, false);
            submitBtn.querySelector('.btn-text').textContent = originalText;
        }
    }

    storeSession(session) {
        const user = session.user;
        const userMetadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};

        const isAdmin = (
            userMetadata.is_admin === true ||
            appMetadata.is_admin === true ||
            userMetadata.role === 'admin' ||
            appMetadata.role === 'admin'
        );

        localStorage.setItem('verifyr_access_token', session.access_token);
        localStorage.setItem('verifyr_user_id', user.id);
        localStorage.setItem('verifyr_user_email', user.email);
        localStorage.setItem('verifyr_is_admin', isAdmin.toString());
    }

    redirectAfterLogin(session) {
        const user = session.user;
        const userMetadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};

        const isAdmin = (
            userMetadata.is_admin === true ||
            appMetadata.is_admin === true ||
            userMetadata.role === 'admin' ||
            appMetadata.role === 'admin'
        );

        if (isAdmin) {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/quiz/category.html';
        }
    }

    getErrorMessage(error) {
        const t = this.translations[this.currentLanguage];
        const message = error.message || error.toString();

        if (message.includes('Invalid login credentials')) {
            return t.invalidCredentials;
        }
        if (message.includes('Email not confirmed')) {
            return t.emailNotConfirmed;
        }
        if (message.includes('User already registered')) {
            return t.userAlreadyRegistered;
        }
        if (message.includes('Password should be')) {
            return t.passwordTooShort;
        }
        if (message.includes('rate limit')) {
            return t.rateLimitError;
        }

        return t.genericError;
    }

    showMessage(element, text, type) {
        element.textContent = text;
        element.className = `form-message ${type}`;
    }

    clearMessage(element) {
        element.textContent = '';
        element.className = 'form-message';
    }

    clearMessages() {
        const messages = this.modalEl.querySelectorAll('.form-message');
        messages.forEach(msg => {
            msg.textContent = '';
            msg.className = 'form-message';
        });
    }

    setLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.querySelector('.btn-text').style.display = 'none';
            button.querySelector('.btn-loading').style.display = 'inline-block';
        } else {
            button.disabled = false;
            button.querySelector('.btn-text').style.display = 'inline';
            button.querySelector('.btn-loading').style.display = 'none';
        }
    }

    show() {
        this.modalEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.allowClose) return;
        this.modalEl.classList.remove('active');
        document.body.style.overflow = '';
    }

    destroy() {
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
        document.body.style.overflow = '';
        window.__authModalInstance = null;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthModal;
}

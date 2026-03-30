/**
 * Feature Priorities Selection Page (Screen 4)
 * Verifyr Quiz - Feature priorities multi-selection logic (max 10)
 */

class FeaturesController {
    constructor() {
        this.features = null;
        this.selectedFeatures = [];
        this.maxSelections = 5;
        this.currentLanguage = 'de';
        this.init();
    }

    async init() {
        // Check if previous steps completed
        this.checkPreviousSteps();

        // Load language preference
        this.currentLanguage = localStorage.getItem('verifyr-lang') || 'de';

        // Apply UI text in correct language
        this.updateUIText();

        // Reset button state (in case user navigated back)
        this.resetButtonState();

        // Load features data
        await this.loadFeatures();

        // Render features
        this.renderFeatures();

        // Setup event listeners
        this.setupEventListeners();

        // Check if returning user (has previous selection)
        this.loadPreviousSelection();
    }

    resetButtonState() {
        // Reset the submit button to normal state
        // This fixes the issue when user clicks back button
        const nextBtn = document.getElementById('nextBtn');
        const nextBtnArrow = document.getElementById('nextBtnArrow');

        if (nextBtn) {
            nextBtn.disabled = false;
            // Restore the original button HTML structure
            nextBtn.innerHTML = '<span id="nextBtnText">Weiter</span>';
        }
        if (nextBtnArrow) {
            nextBtnArrow.disabled = false;
        }
    }

    checkPreviousSteps() {
        try {
            const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            if (!quizAnswers.category || !quizAnswers.useCases) {
                // Missing previous selections - redirect to category page
                console.warn('Missing previous selections, redirecting to category page');
                window.location.href = '/quiz/category.html';
            }
        } catch (error) {
            console.error('Error checking previous steps:', error);
            window.location.href = '/quiz/category.html';
        }
    }

    async loadFeatures() {
        try {
            const response = await fetch('/quiz/data/features.json');
            if (!response.ok) {
                throw new Error('Failed to load features');
            }
            const data = await response.json();
            this.features = data.features;
            this.maxSelections = data.metadata?.max_selections || 5;
            console.log('✅ Features loaded:', this.features.length);
            console.log('Max selections:', this.maxSelections);
        } catch (error) {
            console.error('Error loading features:', error);
            alert('Failed to load features. Please refresh the page.');
        }
    }

    renderFeatures() {
        const grid = document.getElementById('featuresGrid');
        if (!grid || !this.features) return;

        grid.innerHTML = '';

        this.features.forEach(feature => {
            const card = this.createFeatureCard(feature);
            grid.appendChild(card);
        });
    }

    createFeatureCard(feature) {
        const card = document.createElement('div');
        card.className = 'selection-card feature-card';
        card.dataset.featureId = feature.id;

        // Get localized text
        const title = feature.title[this.currentLanguage] || feature.title.de;
        const description = feature.description?.[this.currentLanguage] || feature.description?.de || '';

        // Use placeholder image for now (actual images can be added later)
        const imageUrl = feature.image || '/images/quiz/placeholder.jpg';

        // Set background image
        card.style.backgroundImage = `url(${imageUrl})`;

        card.innerHTML = `
            <div class="card-overlay">
                <h3 class="card-title">${title}</h3>
                ${description ? `<p class="card-description">${description}</p>` : ''}
            </div>
        `;

        return card;
    }

    setupEventListeners() {
        // Card click handler (multi-select with max limit)
        document.getElementById('featuresGrid').addEventListener('click', (e) => {
            const card = e.target.closest('.selection-card');
            if (card) {
                this.handleCardClick(card);
            }
        });

        // Next button (submit quiz)
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.handleSubmit();
        });

        // Next arrow button (submit quiz - desktop)
        document.getElementById('nextBtnArrow').addEventListener('click', () => {
            this.handleSubmit();
        });

        // Reset icons (bottom nav + top counter)
        const doReset = () => {
            const qa = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            delete qa.features;
            localStorage.setItem('verifyr_quiz_answers', JSON.stringify(qa));
            localStorage.removeItem('verifyr_quiz_completed');
            this.selectedFeatures = [];
            document.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            this.updateSelectionCounter();
            this.updateNextButton();
        };
        document.getElementById('resetBtn').addEventListener('click', doReset);
        document.getElementById('resetBtnTop').addEventListener('click', doReset);
    }

    handleCardClick(card) {
        const featureId = card.dataset.featureId;

        // Clear any existing results when selection changes
        localStorage.removeItem('verifyr_quiz_completed');
        localStorage.removeItem('verifyr_quiz_results');

        // Check if already selected
        if (card.classList.contains('selected')) {
            // Deselect
            card.classList.remove('selected');
            const index = this.selectedFeatures.indexOf(featureId);
            if (index > -1) {
                this.selectedFeatures.splice(index, 1);
            }
        } else {
            // Check if max selections reached
            if (this.selectedFeatures.length >= this.maxSelections) {
                // Show feedback (could be a toast notification)
                this.showMaxSelectionsMessage();
                return;
            }

            // Select
            card.classList.add('selected');
            this.selectedFeatures.push(featureId);
        }

        // Update selection counter
        this.updateSelectionCounter();

        // Enable/disable next button
        this.updateNextButton();

        console.log('Selected features:', this.selectedFeatures);
    }

    showMaxSelectionsMessage() {
        const texts = {
            de: `Maximal ${this.maxSelections} Prioritäten wählbar`,
            en: `You can select up to ${this.maxSelections} priorities`
        };
        const message = texts[this.currentLanguage] || texts.en;

        const toast = document.getElementById('quizToast');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    updateSelectionCounter() {
        const count = this.selectedFeatures.length;
        document.getElementById('selectionCount').textContent = count;
        document.getElementById('maxCount').textContent = this.maxSelections;
    }

    updateNextButton() {
        const hasSelection = this.selectedFeatures.length > 0;
        document.getElementById('nextBtn').disabled = !hasSelection;
        document.getElementById('nextBtnArrow').disabled = !hasSelection;
    }

    async handleSubmit() {
        if (this.selectedFeatures.length === 0) {
            return;
        }

        // Save features to localStorage then hand off to dedicated loading screen
        const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
        quizAnswers.features = this.selectedFeatures;
        localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));

        console.log('✅ Features saved:', this.selectedFeatures);
        console.log('📋 Complete quiz answers:', quizAnswers);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'quiz_features_selected', {
                'event_category': 'quiz_funnel',
                'feature_count': this.selectedFeatures.length
            });
        }
        if (typeof posthog !== 'undefined' && typeof posthog.capture === 'function') {
            posthog.capture('quiz_step_completed', {
                step: 'features',
                step_number: 3,
                features: this.selectedFeatures,
                feature_count: this.selectedFeatures.length
            });
        }

        window.location.href = '/quiz/budget.html';
    }

    async submitQuizToBackend(quizAnswers) {
        try {
            const token = localStorage.getItem('verifyr_access_token');
            const headers = { 'Content-Type': 'application/json' };

            // Only add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/quiz/score-with-rag', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(quizAnswers)
            });

            // Handle token expiration - retry as anonymous
            if (!response.ok && response.status === 401) {
                console.warn('Token expired, retrying as anonymous user');
                localStorage.removeItem('verifyr_access_token');
                return this.submitQuizToBackend(quizAnswers);
            }

            if (!response.ok) {
                throw new Error(`Failed to submit quiz: ${response.status}`);
            }

            const results = await response.json();
            console.log('✅ Quiz results:', results);

            // Store results in localStorage
            localStorage.setItem('verifyr_quiz_results', JSON.stringify(results));

            // Navigate to results page to show matched products
            localStorage.setItem('verifyr_quiz_completed', 'true');
            window.location.href = '/quiz/results.html';

        } catch (error) {
            console.error('Error submitting quiz to backend:', error);
            throw error;
        }
    }

    loadPreviousSelection() {
        try {
            const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            if (quizAnswers.features && Array.isArray(quizAnswers.features)) {
                this.selectedFeatures = [...quizAnswers.features];

                // Select the cards
                this.selectedFeatures.forEach(featureId => {
                    const card = document.querySelector(`[data-feature-id="${featureId}"]`);
                    if (card) {
                        card.classList.add('selected');
                    }
                });

                this.updateSelectionCounter();
                this.updateNextButton();
                console.log('Restored previous selection:', this.selectedFeatures);
            }
        } catch (error) {
            console.error('Error loading previous selection:', error);
        }
    }

    updateUIText() {
        const texts = {
            de: {
                heading: 'Was ist dir am wichtigsten?',
                subheading: 'Wähle bis zu 5 Prioritäten',
                back: 'Zurück',
                next: 'Weiter',
                selected: 'ausgewählt'
            },
            en: {
                heading: 'What is most important to you?',
                subheading: 'Choose up to 5 priorities',
                back: 'Back',
                next: 'Next',
                selected: 'selected'
            }
        };

        const lang = this.currentLanguage;
        document.getElementById('pageHeading').textContent = texts[lang].heading;
        document.getElementById('backBtnText').textContent = texts[lang].back;
        document.getElementById('nextBtnText').textContent = texts[lang].next;
        document.getElementById('selectedText').textContent = texts[lang].selected;
    }
}

// Global controller instance
let featuresController = null;

// Handle logout
async function handleLogout() {
    try {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    } catch(e) { /* ignore */ }
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
    ['verifyr_access_token','verifyr_user_id','verifyr_user_email','verifyr_is_admin'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('quizSidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Update user email display and login/logout button (mobile + sidebar)
function updateUserDisplay() {
    const userEmail = localStorage.getItem('verifyr_user_email');
    const currentLang = localStorage.getItem('verifyr-lang') || 'de';

    // Get translated button text
    const logoutText = currentLang === 'de' ? 'Abmelden' : 'Logout';
    const loginText = currentLang === 'de' ? 'Anmelden' : 'Login';

    // Mobile elements
    const mobileUserEmail = document.getElementById('mobileUserEmail');
    const mobileLogoutBtn = document.querySelector('.mobile-logout-btn');

    // Sidebar elements
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    const sidebarAuthBtn = document.getElementById('sidebarAuthBtn');

    if (userEmail) {
        // User is logged in - show email and logout button

        // Mobile
        if (mobileUserEmail) {
            mobileUserEmail.textContent = userEmail;
        }
        if (mobileLogoutBtn) {
            mobileLogoutBtn.textContent = logoutText;
            mobileLogoutBtn.onclick = handleLogout;
            mobileLogoutBtn.classList.remove('mobile-login-btn');
            mobileLogoutBtn.classList.add('mobile-logout-btn');
        }

        // Sidebar
        if (sidebarUserEmail) {
            sidebarUserEmail.textContent = userEmail;
        }
        if (sidebarAuthBtn) {
            sidebarAuthBtn.textContent = logoutText;
            sidebarAuthBtn.onclick = handleLogout;
            sidebarAuthBtn.classList.remove('sidebar-login-btn');
            sidebarAuthBtn.classList.add('sidebar-logout-btn');
        }
    } else {
        // User is not logged in - hide email, show login button

        // Mobile (email hidden by CSS when not logged in)
        if (mobileLogoutBtn) {
            mobileLogoutBtn.textContent = loginText;
            mobileLogoutBtn.onclick = () => window.location.href = '/auth.html';
            mobileLogoutBtn.classList.remove('mobile-logout-btn');
            mobileLogoutBtn.classList.add('mobile-login-btn');
        }

        // Sidebar (email hidden by CSS when not logged in)
        if (sidebarAuthBtn) {
            sidebarAuthBtn.textContent = loginText;
            sidebarAuthBtn.onclick = () => window.location.href = '/auth.html';
            sidebarAuthBtn.classList.remove('sidebar-logout-btn');
            sidebarAuthBtn.classList.add('sidebar-login-btn');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    featuresController = new FeaturesController();
    updateUserDisplay();
});

// Reset button state when page is shown (including back button navigation)
window.addEventListener('pageshow', (event) => {
    // Always reset button state to handle back button navigation
    const nextBtn = document.getElementById('nextBtn');
    const nextBtnArrow = document.getElementById('nextBtnArrow');

    if (nextBtn && nextBtn.disabled) {
        // Button is disabled (stuck in loading state), reset it
        nextBtn.disabled = false;

        // Restore original button structure
        const currentLang = localStorage.getItem('verifyr-lang') || 'de';
        const buttonText = currentLang === 'de' ? 'Weiter' : 'Next';
        nextBtn.innerHTML = `<span id="nextBtnText">${buttonText}</span>`;

        console.log('✅ Button state reset (back navigation detected)');
    }

    if (nextBtnArrow && nextBtnArrow.disabled) {
        nextBtnArrow.disabled = false;
    }
});

// Language switcher functionality
function switchLanguage(lang) {
    // Store preference (use the correct key)
    localStorage.setItem('verifyr-lang', lang);

    // Update active state
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-lang') === lang) {
            option.classList.add('active');
        }
    });

    // Update controller language and refresh UI text
    if (featuresController) {
        featuresController.currentLanguage = lang;
        featuresController.updateUIText();
        featuresController.renderFeatures();
        featuresController.loadPreviousSelection();
        console.log(`✅ Language switched to: ${lang}`);
    }

    // Update login/logout button text
    updateUserDisplay();
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('verifyr-lang') || 'de';
    const langOption = document.querySelector(`.lang-option[data-lang="${savedLang}"]`);
    if (langOption) {
        langOption.classList.add('active');
        document.querySelectorAll('.lang-option').forEach(opt => {
            if (opt !== langOption) {
                opt.classList.remove('active');
            }
        });
    }
});

// Show admin button if user is admin
document.addEventListener('DOMContentLoaded', function() {
    const isAdmin = localStorage.getItem('verifyr_is_admin') === 'true';
    if (isAdmin) {
        const adminBtn = document.querySelector('.admin-only');
        if (adminBtn) {
            adminBtn.style.display = 'block';
        }
    }
});

// Hamburger menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });

        // Show admin menu items if user is admin
        const isAdmin = localStorage.getItem('verifyr_is_admin') === 'true';
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    // Initialize language active state for all language switches
    const savedLang = localStorage.getItem('verifyr-lang') || 'de';
    document.querySelectorAll('.lang-option').forEach(option => {
        if (option.getAttribute('data-lang') === savedLang) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
});

// Glassmorphism navbar on scroll
(function () {
    const nav = document.querySelector('nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
})();

/**
 * Feature Priorities Selection Page (Screen 4)
 * Verifyr Quiz - Feature priorities multi-selection logic (max 5)
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

        // Load features data
        await this.loadFeatures();

        // Render features
        this.renderFeatures();

        // Setup event listeners
        this.setupEventListeners();

        // Reset button state FIRST (in case user navigated back)
        this.resetButtonState();

        // Update UI text (this sets the correct language)
        this.updateUIText();

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
            nextBtn.innerHTML = '<span id="nextBtnText">Quiz abschließen</span>';
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
    }

    handleCardClick(card) {
        const featureId = card.dataset.featureId;

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
            de: `Du kannst maximal ${this.maxSelections} Prioritäten auswählen`,
            en: `You can select up to ${this.maxSelections} priorities`
        };
        const message = texts[this.currentLanguage];

        // Simple alert for now (could be replaced with toast notification)
        alert(message);
    }

    updateSelectionCounter() {
        const count = this.selectedFeatures.length;
        document.getElementById('selectionCount').textContent = count;
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

        // Save selection to localStorage
        const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
        quizAnswers.features = this.selectedFeatures;
        localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));

        console.log('✅ Features saved:', this.selectedFeatures);
        console.log('📋 Complete quiz answers:', quizAnswers);

        // Show loading state
        const nextBtn = document.getElementById('nextBtn');
        const nextBtnArrow = document.getElementById('nextBtnArrow');
        nextBtn.disabled = true;
        nextBtnArrow.disabled = true;
        nextBtn.innerHTML = '<span class="loading">Ergebnisse werden analysiert...</span>';

        try {
            // Submit quiz to backend
            await this.submitQuizToBackend(quizAnswers);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            nextBtn.disabled = false;
            nextBtnArrow.disabled = false;
            nextBtn.innerHTML = '<span id="nextBtnText">Quiz abschließen</span>';
            alert('Fehler beim Absenden des Quiz. Bitte versuche es erneut.');
        }
    }

    async submitQuizToBackend(quizAnswers) {
        try {
            const token = localStorage.getItem('verifyr_access_token');
            const headers = { 'Content-Type': 'application/json' };

            // Only add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/quiz/score', {
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
                next: 'Quiz abschließen',
                selected: 'ausgewählt'
            },
            en: {
                heading: 'What is most important to you?',
                subheading: 'Choose up to 5 priorities',
                back: 'Back',
                next: 'Complete Quiz',
                selected: 'selected'
            }
        };

        const lang = this.currentLanguage;
        document.getElementById('pageHeading').textContent = texts[lang].heading;
        document.getElementById('pageSubheading').textContent = texts[lang].subheading;
        document.getElementById('backBtnText').textContent = texts[lang].back;
        document.getElementById('nextBtnText').textContent = texts[lang].next;
        document.getElementById('selectedText').textContent = texts[lang].selected;

        // Re-render cards to update their text and restore selection
        this.renderFeatures();
        this.loadPreviousSelection();
    }
}

// Global controller instance
let featuresController = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    featuresController = new FeaturesController();
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
        const buttonText = currentLang === 'de' ? 'Quiz abschließen' : 'Complete Quiz';
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
        console.log(`✅ Language switched to: ${lang}`);
    }
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

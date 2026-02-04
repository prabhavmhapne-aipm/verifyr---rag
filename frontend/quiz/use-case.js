/**
 * Use Case Selection Page (Screen 3)
 * Verifyr Quiz - Use case multi-selection logic
 */

class UseCaseController {
    constructor() {
        this.useCases = null;
        this.selectedUseCases = [];
        this.currentLanguage = 'de';
        this.init();
    }

    async init() {
        // Check if category was selected
        this.checkCategorySelected();

        // Load language preference
        this.currentLanguage = localStorage.getItem('verifyr-lang') || 'de';

        // Load use cases data
        await this.loadUseCases();

        // Render use cases
        this.renderUseCases();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI text
        this.updateUIText();

        // Check if returning user (has previous selection)
        this.loadPreviousSelection();
    }

    checkCategorySelected() {
        try {
            const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            if (!quizAnswers.category) {
                // No category selected - redirect back to category page
                console.warn('No category selected, redirecting to category page');
                window.location.href = '/quiz/category.html';
            }
        } catch (error) {
            console.error('Error checking category:', error);
            window.location.href = '/quiz/category.html';
        }
    }

    async loadUseCases() {
        try {
            const response = await fetch('/quiz/data/use-cases.json');
            if (!response.ok) {
                throw new Error('Failed to load use cases');
            }
            const data = await response.json();
            this.useCases = data.useCases;
            console.log('✅ Use cases loaded:', this.useCases.length);
        } catch (error) {
            console.error('Error loading use cases:', error);
            alert('Failed to load use cases. Please refresh the page.');
        }
    }

    renderUseCases() {
        const grid = document.getElementById('useCaseGrid');
        if (!grid || !this.useCases) return;

        grid.innerHTML = '';

        this.useCases.forEach(useCase => {
            const card = this.createUseCaseCard(useCase);
            grid.appendChild(card);
        });
    }

    createUseCaseCard(useCase) {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.dataset.useCaseId = useCase.id;

        // Use image if available, fallback to emoji icon
        const iconHtml = useCase.icon
            ? `<img src="${useCase.icon}" alt="${useCase.id}" class="card-image">`
            : `<div class="card-icon">${useCase.icon_emoji || '🏃'}</div>`;

        // Get localized text
        const title = useCase.title[this.currentLanguage] || useCase.title.de;
        const description = useCase.description?.[this.currentLanguage] || useCase.description?.de || '';

        card.innerHTML = `
            ${iconHtml}
            <div class="card-text">
                <h3 class="card-title">${title}</h3>
            </div>
        `;

        return card;
    }

    setupEventListeners() {
        // Card click handler (multi-select)
        document.getElementById('useCaseGrid').addEventListener('click', (e) => {
            const card = e.target.closest('.selection-card');
            if (card) {
                this.handleCardClick(card);
            }
        });

        // Next button
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.handleNext();
        });

        // Next arrow button (desktop)
        document.getElementById('nextBtnArrow').addEventListener('click', () => {
            this.handleNext();
        });
    }

    handleCardClick(card) {
        const useCaseId = card.dataset.useCaseId;

        // Multi-select: toggle selection
        if (card.classList.contains('selected')) {
            // Deselect
            card.classList.remove('selected');
            const index = this.selectedUseCases.indexOf(useCaseId);
            if (index > -1) {
                this.selectedUseCases.splice(index, 1);
            }
        } else {
            // Select
            card.classList.add('selected');
            this.selectedUseCases.push(useCaseId);
        }

        // Enable/disable next button based on selection
        this.updateNextButton();

        console.log('Selected use cases:', this.selectedUseCases);
    }

    updateNextButton() {
        const hasSelection = this.selectedUseCases.length > 0;
        document.getElementById('nextBtn').disabled = !hasSelection;
        document.getElementById('nextBtnArrow').disabled = !hasSelection;
    }

    handleNext() {
        if (this.selectedUseCases.length === 0) {
            return;
        }

        // Save selection to localStorage
        const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
        quizAnswers.useCases = this.selectedUseCases;
        localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));

        console.log('✅ Use cases saved:', this.selectedUseCases);

        // Navigate to features page
        window.location.href = '/quiz/features.html';
    }

    loadPreviousSelection() {
        try {
            const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            if (quizAnswers.useCases && Array.isArray(quizAnswers.useCases)) {
                this.selectedUseCases = [...quizAnswers.useCases];

                // Select the cards
                this.selectedUseCases.forEach(useCaseId => {
                    const card = document.querySelector(`[data-use-case-id="${useCaseId}"]`);
                    if (card) {
                        card.classList.add('selected');
                    }
                });

                this.updateNextButton();
                console.log('Restored previous selection:', this.selectedUseCases);
            }
        } catch (error) {
            console.error('Error loading previous selection:', error);
        }
    }

    updateUIText() {
        const texts = {
            de: {
                heading: 'Wofür Hauptsächlich?',
                subheading: 'Wähle alle Zutreffend aus',
                back: 'Zurück',
                next: 'Weiter'
            },
            en: {
                heading: 'What mainly for?',
                subheading: 'Choose all that apply',
                back: 'Back',
                next: 'Next'
            }
        };

        const lang = this.currentLanguage;
        document.getElementById('pageHeading').textContent = texts[lang].heading;
        document.getElementById('pageSubheading').textContent = texts[lang].subheading;
        document.getElementById('backBtnText').textContent = texts[lang].back;
        document.getElementById('nextBtnText').textContent = texts[lang].next;

        // Re-render cards to update their text and restore selection
        this.renderUseCases();
        this.loadPreviousSelection();
    }
}

// Global controller instance
let useCaseController = null;

// Handle logout
async function handleLogout() {
    try {
        // Get Supabase client from window (initialized by auth-modal.js)
        const supabaseClient = window.supabaseClient;

        // Sign out from Supabase
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        // Clear localStorage
        localStorage.removeItem('verifyr_access_token');
        localStorage.removeItem('verifyr_user_id');
        localStorage.removeItem('verifyr_user_email');
        localStorage.removeItem('verifyr_is_admin');

        // Redirect to home page
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway
        window.location.href = '/';
    }
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
            mobileUserEmail.style.display = 'block';
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
            sidebarUserEmail.style.display = 'block';
        }
        if (sidebarAuthBtn) {
            sidebarAuthBtn.textContent = logoutText;
            sidebarAuthBtn.onclick = handleLogout;
            sidebarAuthBtn.classList.remove('sidebar-login-btn');
            sidebarAuthBtn.classList.add('sidebar-logout-btn');
        }
    } else {
        // User is not logged in - hide email, show login button

        // Mobile
        if (mobileUserEmail) {
            mobileUserEmail.style.display = 'none';
        }
        if (mobileLogoutBtn) {
            mobileLogoutBtn.textContent = loginText;
            mobileLogoutBtn.onclick = () => window.location.href = '/auth.html';
            mobileLogoutBtn.classList.remove('mobile-logout-btn');
            mobileLogoutBtn.classList.add('mobile-login-btn');
        }

        // Sidebar
        if (sidebarUserEmail) {
            sidebarUserEmail.style.display = 'none';
        }
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
    useCaseController = new UseCaseController();
    updateUserDisplay();
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
    if (useCaseController) {
        useCaseController.currentLanguage = lang;
        useCaseController.updateUIText();
        console.log(`✅ Language switched to: ${lang}`);
    }

    // Update login/logout button text
    updateUserDisplay();
}

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

/**
 * Category Selection Page (Screen 1)
 * Verifyr Quiz - Category selection logic
 */

class CategoryController {
    constructor() {
        this.categories = null;
        this.selectedCategory = null;
        this.currentLanguage = 'de'; // Default to German
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();

        // Load language preference
        this.currentLanguage = localStorage.getItem('verifyr_language') || 'de';

        // Load categories data
        await this.loadCategories();

        // Render categories
        this.renderCategories();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI text
        this.updateUIText();

        // Check if returning user (has previous selection)
        this.loadPreviousSelection();
    }

    async checkAuth() {
        const token = localStorage.getItem('verifyr_access_token');
        if (!token) {
            // Redirect to auth page
            window.location.href = '/auth.html?redirect=quiz/category.html';
            return;
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/quiz/data/categories.json');
            if (!response.ok) {
                throw new Error('Failed to load categories');
            }
            const data = await response.json();
            this.categories = data.categories;
            console.log('✅ Categories loaded:', this.categories.length);
        } catch (error) {
            console.error('Error loading categories:', error);
            alert('Failed to load categories. Please refresh the page.');
        }
    }

    renderCategories() {
        const grid = document.getElementById('categoryGrid');
        if (!grid || !this.categories) return;

        grid.innerHTML = '';

        this.categories.forEach(category => {
            const card = this.createCategoryCard(category);
            grid.appendChild(card);
        });
    }

    createCategoryCard(category) {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.dataset.categoryId = category.id;

        // Use image if available, fallback to emoji icon
        const iconHtml = category.icon
            ? `<img src="${category.icon}" alt="${category.id}" class="card-image">`
            : `<div class="card-icon">${category.icon_emoji || '⌚'}</div>`;

        // Get localized text
        const title = category.title[this.currentLanguage] || category.title.de;
        const subtitle = category.subtitle?.[this.currentLanguage] || category.subtitle?.de || '';
        const description = category.description?.[this.currentLanguage] || category.description?.de || '';

        card.innerHTML = `
            ${iconHtml}
            <div class="card-text">
                <h3 class="card-title">${title}</h3>
                ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}
            </div>
        `;

        return card;
    }

    setupEventListeners() {
        // Card click handler
        document.getElementById('categoryGrid').addEventListener('click', (e) => {
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
        const categoryId = card.dataset.categoryId;

        // Single-select: remove selection from all other cards
        document.querySelectorAll('.selection-card').forEach(c => {
            c.classList.remove('selected');
        });

        // Select this card
        card.classList.add('selected');
        this.selectedCategory = categoryId;

        // Enable next button and arrow
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('nextBtnArrow').disabled = false;

        console.log('Selected category:', categoryId);
    }

    handleNext() {
        if (!this.selectedCategory) {
            return;
        }

        // Save selection to localStorage
        const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
        quizAnswers.category = this.selectedCategory;
        localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));

        console.log('✅ Category saved:', this.selectedCategory);

        // Navigate to use-case page
        window.location.href = '/quiz/use-case.html';
    }

    loadPreviousSelection() {
        try {
            const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
            if (quizAnswers.category) {
                this.selectedCategory = quizAnswers.category;

                // Select the card
                const card = document.querySelector(`[data-category-id="${this.selectedCategory}"]`);
                if (card) {
                    card.classList.add('selected');
                    document.getElementById('nextBtn').disabled = false;
                    document.getElementById('nextBtnArrow').disabled = false;
                }

                console.log('Restored previous selection:', this.selectedCategory);
            }
        } catch (error) {
            console.error('Error loading previous selection:', error);
        }
    }

    updateUIText() {
        // Update page text based on language
        const texts = {
            de: {
                heading: 'Was suchst du?',
                subheading: 'Wähle eine Kategorie aus',
                back: 'Zurück',
                next: 'Weiter'
            },
            en: {
                heading: 'What are you looking for?',
                subheading: 'Choose a category',
                back: 'Back',
                next: 'Next'
            }
        };

        const lang = this.currentLanguage;
        document.getElementById('pageHeading').textContent = texts[lang].heading;
        document.getElementById('pageSubheading').textContent = texts[lang].subheading;
        document.getElementById('backBtnText').textContent = texts[lang].back;
        document.getElementById('nextBtnText').textContent = texts[lang].next;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CategoryController();
});

// Language switcher functionality
function switchLanguage(lang) {
    // Store preference
    localStorage.setItem('preferredLanguage', lang);

    // Update active state
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-lang') === lang) {
            option.classList.add('active');
        }
    });

    // TODO: Implement actual translation logic
    // For now, just store preference for future use
    console.log(`Language switched to: ${lang}`);
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('preferredLanguage') || 'de';
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

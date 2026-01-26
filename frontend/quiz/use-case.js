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
        // Check authentication
        await this.checkAuth();

        // Check if category was selected
        this.checkCategorySelected();

        // Load language preference
        this.currentLanguage = localStorage.getItem('verifyr_language') || 'de';

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

    async checkAuth() {
        const token = localStorage.getItem('verifyr_access_token');
        if (!token) {
            window.location.href = '/auth.html?redirect=quiz/use-case.html';
            return;
        }
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

        // Use emoji icon
        const icon = useCase.icon_emoji || '🏃';

        // Get localized text
        const title = useCase.title[this.currentLanguage] || useCase.title.de;
        const description = useCase.description?.[this.currentLanguage] || useCase.description?.de || '';

        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <h3 class="card-title">${title}</h3>
            ${description ? `<p class="card-description">${description}</p>` : ''}
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
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UseCaseController();
});

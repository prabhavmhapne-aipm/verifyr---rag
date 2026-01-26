/**
 * Results Page (Screen 5)
 * Verifyr Quiz - Display matched products from quiz
 */

class ResultsController {
    constructor() {
        this.quizResults = null;
        this.productsMetadata = {};
        this.currentLanguage = 'de';
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();

        // Load language preference
        this.currentLanguage = localStorage.getItem('verifyr_language') || 'de';

        // Load quiz results from localStorage
        this.loadQuizResults();

        // Update UI text
        this.updateUIText();

        // Fetch product metadata
        await this.loadProductsMetadata();

        // Render results
        this.renderResults();
    }

    async checkAuth() {
        const token = localStorage.getItem('verifyr_access_token');
        if (!token) {
            window.location.href = '/auth.html?redirect=quiz/results.html';
            return;
        }
    }

    loadQuizResults() {
        try {
            const resultsJson = localStorage.getItem('verifyr_quiz_results');
            if (!resultsJson) {
                console.warn('No quiz results found, redirecting to quiz');
                window.location.href = '/quiz/category.html';
                return;
            }

            this.quizResults = JSON.parse(resultsJson);
            console.log('✅ Quiz results loaded:', this.quizResults);
        } catch (error) {
            console.error('Error loading quiz results:', error);
            this.showEmptyState();
        }
    }

    async loadProductsMetadata() {
        try {
            const token = localStorage.getItem('verifyr_access_token');
            const response = await fetch('/products/metadata', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load products metadata');
            }

            const data = await response.json();

            // Create lookup map by product ID
            data.products.forEach(product => {
                this.productsMetadata[product.id] = product;
            });

            console.log('✅ Products metadata loaded:', Object.keys(this.productsMetadata).length);
        } catch (error) {
            console.error('Error loading products metadata:', error);
        }
    }

    renderResults() {
        if (!this.quizResults || !this.quizResults.matched_products || this.quizResults.matched_products.length === 0) {
            this.showEmptyState();
            return;
        }

        // Update results count
        const count = this.quizResults.matched_products.length;
        const texts = {
            de: `${count} passende ${count === 1 ? 'Produkt' : 'Produkte'} gefunden`,
            en: `${count} matching ${count === 1 ? 'product' : 'products'} found`
        };
        document.getElementById('resultsCount').textContent = texts[this.currentLanguage];

        // Render quiz summary
        this.renderQuizSummary();

        // Render matched products
        this.renderMatchedProducts();
    }

    renderQuizSummary() {
        const summaryCard = document.getElementById('quizSummary');
        const tagsContainer = document.getElementById('summaryTags');

        if (!this.quizResults.quiz_summary) {
            summaryCard.style.display = 'none';
            return;
        }

        const summary = this.quizResults.quiz_summary;
        const tags = [];

        // Add primary use case
        if (summary.primary_use_case) {
            tags.push(this.formatLabel(summary.primary_use_case));
        }

        // Add priorities
        if (summary.priorities && Array.isArray(summary.priorities)) {
            summary.priorities.forEach(priority => {
                tags.push(this.formatLabel(priority));
            });
        }

        // Render tags
        tagsContainer.innerHTML = tags.map(tag =>
            `<span class="summary-tag">${tag}</span>`
        ).join('');

        summaryCard.style.display = 'block';
    }

    formatLabel(key) {
        // Convert snake_case to Title Case
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    renderMatchedProducts() {
        const container = document.getElementById('matchedProducts');
        container.innerHTML = '';

        // Sort by match score (highest first)
        const sortedProducts = [...this.quizResults.matched_products].sort((a, b) =>
            b.match_score - a.match_score
        );

        sortedProducts.forEach((match, index) => {
            const productCard = this.createProductCard(match, index === 0);
            container.appendChild(productCard);
        });
    }

    createProductCard(match, isTopMatch) {
        const product = this.productsMetadata[match.product_id];

        if (!product) {
            console.warn('Product metadata not found for:', match.product_id);
            return document.createElement('div');
        }

        const card = document.createElement('div');
        card.className = 'product-card';

        const matchPercentage = Math.round(match.match_score * 100);
        const matchBadgeClass = isTopMatch ? 'match-badge top-match' : 'match-badge';

        // Get localized text
        const displayName = product.display_name || product.id;
        const brand = product.brand || '';
        const category = product.category || '';
        const priceRange = product.price_range || '';
        const imageUrl = product.image_url || '/images/products/placeholder.jpg';

        card.innerHTML = `
            <div class="match-badge ${matchBadgeClass}">${matchPercentage}% Match</div>

            <div class="product-content">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${displayName}" onerror="this.src='/images/products/placeholder.jpg'">
                </div>

                <div class="product-info">
                    <div class="product-brand">${brand}</div>
                    <h2 class="product-name">${displayName}</h2>
                    <p class="product-category">${this.formatLabel(category)}</p>
                    ${priceRange ? `<div class="product-price">${priceRange}</div>` : ''}

                    <div class="match-reasons">
                        <h3>${this.currentLanguage === 'de' ? 'Warum passt es?' : 'Why it matches'}</h3>
                        <div class="reasons-list">
                            ${this.renderReasons(match.match_reasons)}
                        </div>
                    </div>
                </div>
            </div>

            ${this.renderProductSpecs(product)}
        `;

        return card;
    }

    renderReasons(reasons) {
        if (!reasons || reasons.length === 0) {
            return '<div class="reason-item"><span class="reason-icon">✓</span><span>Gute Gesamtübereinstimmung mit deinen Präferenzen</span></div>';
        }

        return reasons.map(reason => `
            <div class="reason-item">
                <span class="reason-icon">✓</span>
                <span>${reason}</span>
            </div>
        `).join('');
    }

    renderProductSpecs(product) {
        if (!product.key_specs) {
            return '';
        }

        const specs = product.key_specs;
        const specsHtml = Object.entries(specs).map(([key, value]) => `
            <div class="spec-item">
                <div class="spec-label">${this.formatLabel(key)}</div>
                <div class="spec-value">${value}</div>
            </div>
        `).join('');

        const heading = this.currentLanguage === 'de' ? 'Technische Daten' : 'Key Specs';

        return `
            <div class="product-specs">
                <h3>${heading}</h3>
                <div class="specs-grid">
                    ${specsHtml}
                </div>
            </div>
        `;
    }

    showEmptyState() {
        const container = document.getElementById('matchedProducts');

        const texts = {
            de: {
                icon: '🔍',
                heading: 'Keine Ergebnisse gefunden',
                text: 'Leider konnten wir keine passenden Produkte für deine Auswahl finden.',
                button: 'Quiz neu starten'
            },
            en: {
                icon: '🔍',
                heading: 'No Results Found',
                text: 'Unfortunately, we couldn\'t find any matching products for your selections.',
                button: 'Restart Quiz'
            }
        };

        const lang = this.currentLanguage;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${texts[lang].icon}</div>
                <h2>${texts[lang].heading}</h2>
                <p>${texts[lang].text}</p>
                <a href="/quiz/category.html" class="btn btn-primary">
                    ${texts[lang].button}
                </a>
            </div>
        `;

        // Hide quiz summary
        document.getElementById('quizSummary').style.display = 'none';

        // Update results count
        const countTexts = {
            de: 'Keine Produkte gefunden',
            en: 'No products found'
        };
        document.getElementById('resultsCount').textContent = countTexts[lang];
    }

    updateUIText() {
        const texts = {
            de: {
                heading: 'Deine Ergebnisse',
                ctaHeading: 'Noch Fragen?',
                ctaSubheading: 'Chatte mit Verifyr, um mehr über diese Produkte zu erfahren',
                ctaButton: 'Mit Verifyr chatten'
            },
            en: {
                heading: 'Your Results',
                ctaHeading: 'Have Questions?',
                ctaSubheading: 'Chat with Verifyr to learn more about these products',
                ctaButton: 'Chat with Verifyr'
            }
        };

        const lang = this.currentLanguage;
        document.getElementById('pageHeading').textContent = texts[lang].heading;
        document.getElementById('ctaHeading').textContent = texts[lang].ctaHeading;
        document.getElementById('ctaSubheading').textContent = texts[lang].ctaSubheading;
        document.getElementById('ctaButton').textContent = texts[lang].ctaButton;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResultsController();
});

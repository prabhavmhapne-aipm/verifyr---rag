/**
 * Results Page JavaScript - Figma Screen 5
 * Generates horizontal carousel with product cards
 */

class ResultsController {
    constructor() {
        this.quizResults = null;
        this.productsMetadata = {};
        this.currentLanguage = 'de';
        this.init();
    }

    async init() {
        // Check auth status (returns boolean instead of redirecting)
        const isAuthenticated = await this.checkAuth();

        this.currentLanguage = localStorage.getItem('verifyr-lang') || 'de';
        this.loadQuizResults();
        await this.loadProductsMetadata();
        this.renderCarousel();
        this.updateHeader();

        // Show auth modal if not authenticated
        if (!isAuthenticated) {
            this.showAuthModal();
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('verifyr_access_token');
        if (!token) return false;

        // Optionally verify token with backend
        try {
            const response = await fetch('/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    showAuthModal() {
        const modal = new AuthModal({
            redirectTarget: 'results',
            allowClose: false,  // Must authenticate
            onAuthSuccess: (session) => {
                console.log('✅ Auth success, reloading results page');
                window.location.reload();  // Reload to refresh with auth state
            }
        });
        modal.show();
    }

    loadQuizResults() {
        try {
            const resultsJson = localStorage.getItem('verifyr_quiz_results');
            if (!resultsJson) {
                console.warn('No quiz results found');
                window.location.href = '/quiz/category.html';
                return;
            }
            this.quizResults = JSON.parse(resultsJson);
            console.log('✅ Quiz results loaded:', this.quizResults);
        } catch (error) {
            console.error('Error loading quiz results:', error);
            window.location.href = '/quiz/category.html';
        }
    }

    async loadProductsMetadata() {
        try {
            const token = localStorage.getItem('verifyr_access_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/products/metadata', { headers });
            if (!response.ok) throw new Error('Failed to load products metadata');

            const data = await response.json();
            data.products.forEach(product => {
                this.productsMetadata[product.id] = product;
            });

            console.log('✅ Products metadata loaded:', Object.keys(this.productsMetadata).length);
        } catch (error) {
            console.error('Error loading products metadata:', error);
        }
    }

    updateHeader() {
        const count = this.quizResults?.matched_products?.length || 0;
        const texts = {
            de: `${count} passende ${count === 1 ? 'Produkt' : 'Produkte'} gefunden`,
            en: `${count} matching ${count === 1 ? 'product' : 'products'} found`
        };
        document.getElementById('headerSubtitle').textContent = texts[this.currentLanguage];
        document.getElementById('headerSubtitle').classList.remove('loading');
    }

    renderCarousel() {
        const track = document.getElementById('carouselTrack');
        if (!this.quizResults?.matched_products || this.quizResults.matched_products.length === 0) {
            track.innerHTML = '<div style="padding: 40px; text-align: center; color: #6A7282;">Keine Produkte gefunden</div>';
            return;
        }

        // Sort by match score
        const sortedProducts = [...this.quizResults.matched_products].sort((a, b) =>
            b.match_score - a.match_score
        );

        sortedProducts.forEach((match, index) => {
            const card = this.createProductCard(match, index);
            track.appendChild(card);
        });
    }

    createProductCard(match, index) {
        const product = this.productsMetadata[match.product_id];
        if (!product) {
            console.warn('Product not found:', match.product_id);
            return document.createElement('div');
        }

        const card = document.createElement('div');
        card.className = 'product-card';

        const displayName = product.display_name?.[this.currentLanguage] || product.display_name?.de || product.id;
        const category = this.formatLabel(product.category);
        const imageUrl = product.image_url || '/images/products/placeholder.jpg';
        const matchScore = Math.round(match.match_score * 100);

        card.innerHTML = `
            <!-- 1. Product Image -->
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${displayName}" onerror="this.src='/images/products/placeholder.jpg'">
                <button class="favorite-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>

            <!-- 2. Product Meta -->
            <div class="product-meta">
                <h2 class="product-name">${displayName}</h2>
                <p class="product-category">${category}</p>
                <div class="product-rating">
                    <span class="star-icon">⭐</span>
                    <span class="rating-number">4.5</span>
                    <span class="review-count">(193 Bewertungen)</span>
                </div>
            </div>

            <!-- 3. Tab Switcher -->
            <div class="tab-container">
                <button class="tab-button active" data-tab="empfehlung" data-card-index="${index}">Empfehlung</button>
                <button class="tab-button" data-tab="produktdaten" data-card-index="${index}">Produktdaten</button>
            </div>

            <!-- Tab Content: Empfehlung -->
            <div class="tab-content active" data-content="empfehlung" data-card-index="${index}">
                ${this.renderEmpfehlungTab(match, product)}
            </div>

            <!-- Tab Content: Produktdaten -->
            <div class="tab-content" data-content="produktdaten" data-card-index="${index}">
                ${this.renderProduktdatenTab(product)}
            </div>
        `;

        // Add tab switching functionality
        this.setupTabSwitching(card, index);

        return card;
    }

    renderEmpfehlungTab(match, product) {
        return `
            <!-- 4. Purchase Buttons -->
            <div class="purchase-section">
                <div class="purchase-buttons">
                    <a href="https://amazon.de" target="_blank" class="purchase-button purchase-button-1">
                        Bei Amazon.de<br>Bestellen für 778€
                    </a>
                    <a href="https://ebay.de" target="_blank" class="purchase-button purchase-button-2">
                        Bei eBay.de<br>Bestellen für 799€
                    </a>
                    <a href="#" class="purchase-button purchase-button-3">
                        Bei Media Markt<br>Bestellen für 849€
                    </a>
                </div>
            </div>

            <!-- 5. Recommendation Box -->
            <div class="recommendation-box">
                <div class="recommendation-header">
                    <h3 class="recommendation-title">Unsere Empfehlung</h3>
                    <span class="average-score">${Math.round(match.match_score * 100)}% Match</span>
                </div>

                <div class="recommendation-text">
                    ${this.generateRecommendationText(match, product)}
                </div>

                <div class="strengths-section">
                    <h4 class="section-title">Stärken</h4>
                    <ul class="section-list">
                        ${this.generateStrengths(product).map(s => `<li>+ ${s}</li>`).join('')}
                    </ul>
                </div>

                <div class="weaknesses-section">
                    <h4 class="section-title">Schwächen</h4>
                    <ul class="section-list">
                        ${this.generateWeaknesses(product).map(w => `<li>- ${w}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- 6. Reviews Header -->
            <div class="reviews-header">
                <p class="reviews-header-text">Neutral Verifizierte Tests zusammengefasst</p>
            </div>

            <!-- 7. Review Boxes -->
            ${this.renderReviewBoxes(product)}

            <!-- 8. Reddit Box -->
            <div class="reddit-box">
                <div class="reddit-logo">📱</div>
                <a href="https://reddit.com/r/Garmin" target="_blank" class="reddit-text">
                    ${product.display_name?.de || product.id} Forum Diskussion und Review
                </a>
            </div>

            <!-- 9. YouTube Box -->
            <div class="youtube-box">
                <div class="youtube-logo">▶️</div>
                <span class="youtube-text">
                    ${product.display_name?.de || product.id} In-Depth Review: Brilliance at a Cost?
                </span>
            </div>

            <!-- 10. Amazon Ratings Box -->
            <div class="amazon-box">
                <div class="amazon-rating-graphic">⭐⭐⭐⭐⭐ 4.5/5</div>
                <a href="https://amazon.de" target="_blank" class="amazon-link">
                    193 Bewertungen bei Amazon.de lesen
                </a>
            </div>
        `;
    }

    renderProduktdatenTab(product) {
        const specs = product.key_specs || {};

        return `
            <div style="padding: 16px;">
                <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 16px 0; color: #090814;">Technische Daten</h3>
                ${Object.entries(specs).map(([key, value]) => {
                    const label = this.formatLabel(key);
                    const displayValue = typeof value === 'object' ? (value[this.currentLanguage] || value.de || JSON.stringify(value)) : value;
                    return `
                        <div style="margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                            <div style="font-size: 10px; color: #6A7282; margin-bottom: 4px;">${label}</div>
                            <div style="font-size: 12px; color: #011928; font-weight: 500;">${displayValue}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    generateRecommendationText(match, product) {
        const reasons = match.match_reasons?.join('. ') || 'Gute Übereinstimmung mit deinen Präferenzen';
        return `
            Basierend auf deinen Antworten im Quiz empfehlen wir dir dieses Produkt mit einem Match-Score von ${Math.round(match.match_score * 100)}%.
            ${reasons}. Das Gerät bietet eine ausgezeichnete Balance zwischen Funktionen und Benutzerfreundlichkeit.
        `;
    }

    generateStrengths(product) {
        const strengths = [];
        const specs = product.key_specs || {};

        if (specs.battery_life) {
            strengths.push('Sehr gute Akkulaufzeit');
        }
        if (specs.water_resistance) {
            strengths.push('Wasserdicht und robust');
        }
        if (specs.display) {
            strengths.push('Helles, gut ablesbares Display');
        }
        if (specs.sensors) {
            strengths.push('Umfangreiche Sensoren für Health-Tracking');
        }

        return strengths.length > 0 ? strengths : ['Gute Gesamtleistung', 'Zuverlässige Qualität'];
    }

    generateWeaknesses(product) {
        const weaknesses = [];
        const specs = product.key_specs || {};

        // Generic weaknesses (would be customized per product in real app)
        if (product.brand === 'Apple') {
            weaknesses.push('Hoher Preis im Vergleich zur Konkurrenz');
            weaknesses.push('Kurze Akkulaufzeit');
        } else if (product.brand === 'Garmin') {
            weaknesses.push('Komplexe Bedienung für Einsteiger');
            weaknesses.push('Große Bauform');
        }

        return weaknesses.length > 0 ? weaknesses : ['Keine wesentlichen Schwächen'];
    }

    renderReviewBoxes(product) {
        const reviews = [
            { source: 'Trusted Reviews', rating: '1,5', link: `${product.display_name?.en || product.id} Review` },
            { source: 'heise online', rating: '1,0', link: `${product.display_name?.de || product.id} im Test` },
            { source: 'Outdoor Gear Lab', rating: '1,4', link: 'Detailed Review' }
        ];

        return reviews.map(review => `
            <div class="review-box">
                <div class="review-left">
                    <div class="review-logo" style="font-weight: 600; font-size: 12px;">${review.source}</div>
                    <a href="#" class="review-link">${review.link}</a>
                </div>
                <div class="review-rating">${review.rating}</div>
            </div>
        `).join('');
    }

    setupTabSwitching(card, cardIndex) {
        const tabButtons = card.querySelectorAll('.tab-button');
        const tabContents = card.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // Remove active from all tabs in this card
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => {
                    if (content.dataset.cardIndex == cardIndex) {
                        content.classList.remove('active');
                    }
                });

                // Add active to clicked tab
                button.classList.add('active');
                const targetContent = card.querySelector(`[data-content="${tabName}"][data-card-index="${cardIndex}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    formatLabel(key) {
        return key.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ResultsController();
});

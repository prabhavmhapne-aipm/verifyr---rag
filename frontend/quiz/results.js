/**
 * Results Page JavaScript - Figma Screen 5
 * Generates horizontal carousel with product cards
 */

class ResultsController {
    constructor() {
        this.quizResults = null;
        this.productsMetadata = {};
        this.useCasesMetadata = {};
        this.featuresMetadata = {};
        this.currentLanguage = 'de';
        this.quizTraceId = null;
        this.init();
    }

    async init() {
        // Check auth status (returns boolean instead of redirecting)
        const isAuthenticated = await this.checkAuth();

        this.currentLanguage = localStorage.getItem('verifyr-lang') || 'de';
        this.sentimentCache = {};
        this.redditCache = {};
        this.loadQuizResults();
        await this.loadQuizTraceId();
        await this.loadProductsMetadata();
        this.renderCarousel();
        this.updateHeader();
        this.loadSentimentForAllCards();
        this.loadReviewsForAllCards();
        this.loadRedditSentimentForAllCards();
        this.setupYoutubeModal();
        this.setupFeedbackHandlers();
        this.setupAccordionHandlers();
        this.setupFloatingMiniHeader();

        if (typeof gtag !== 'undefined') {
            gtag('event', 'quiz_results_viewed', {
                'event_category': 'quiz_funnel',
                'authenticated': isAuthenticated
            });
        }
        if (typeof posthog !== 'undefined' && typeof posthog.capture === 'function') {
            var _res = this.quizResults;
            posthog.capture('results_viewed', {
                authenticated: isAuthenticated,
                product_count: _res?.matched_products?.length || 0,
                top_product: _res?.matched_products?.[0]?.product_id || null
            });
        }

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

    async loadSentimentForAllCards() {
        if (!this.quizResults?.matched_products) return;
        const token = localStorage.getItem('verifyr_access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        for (const match of this.quizResults.matched_products) {
            try {
                const res = await fetch(`/products/${match.product_id}/amazon-sentiment`, { headers });
                if (!res.ok) continue;
                const data = await res.json();
                this.sentimentCache[match.product_id] = data;
                this.updateCardSentiment(match.product_id, data);
            } catch (e) {
                // Non-fatal — card just keeps its empty state
            }
        }

        // Re-sync after all async sentiment content has loaded (star ratings may affect product-meta height)
        requestAnimationFrame(() => this.synchronizeSectionHeights());
    }

    updateCardSentiment(productId, data) {
        const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        if (!card) return;

        // Update top rating bar
        if (data.available && data.amazon_rating != null) {
            const starsEl = card.querySelector('.rating-stars');
            const ratingEl = card.querySelector('.rating-number');
            const reviewCountEl = card.querySelector('.review-count');
            if (starsEl) starsEl.textContent = this._renderStars(data.amazon_rating);
            if (ratingEl) ratingEl.textContent = data.amazon_rating.toFixed(1).replace('.', ',');
            if (reviewCountEl) {
                const t = this.currentLanguage === 'de' ? 'Bewertungen' : 'Reviews';
                const count = data.amazon_review_count
                    ? `(${data.amazon_review_count.toLocaleString('de-DE')} ${t})`
                    : '';
                reviewCountEl.textContent = count;
            }
        }

        // Update amazon sentiment box
        const sentimentBox = card.querySelector('.amazon-sentiment-box');
        if (sentimentBox) {
            sentimentBox.innerHTML = this.renderSentimentWidget(data, productId);
        }
    }

    async loadQuizTraceId() {
        // Extract trace_id from stored quiz results (set by loading.html / features.js)
        try {
            const resultsJson = localStorage.getItem('verifyr_quiz_results');
            if (resultsJson) {
                const parsed = JSON.parse(resultsJson);
                this.quizTraceId = parsed.trace_id || null;
            }
        } catch (e) { /* ignore */ }
    }

    setupFeedbackHandlers() {
        // Per-product feedback — delegated from carouselTrack
        const track = document.getElementById('carouselTrack');
        if (track) {
            track.addEventListener('click', (e) => {
                const thumbBtn = e.target.closest('.product-feedback-thumb');
                const copyBtn = e.target.closest('.product-copy-btn');

                if (thumbBtn && !thumbBtn.disabled) {
                    const card = thumbBtn.closest('.product-card');
                    const productId = card?.dataset.productId;
                    const value = thumbBtn.dataset.value === '1' ? 1 : 0;
                    this._submitProductFeedback(productId, value, card);
                }

                if (copyBtn) {
                    const card = copyBtn.closest('.product-card');
                    this._copyProductRecommendation(card, copyBtn);
                }
            });
        }

    }

    setupAccordionHandlers() {
        document.addEventListener('click', (e) => {
            const toggle = e.target.closest('.section-toggle') || e.target.closest('.acc-section-header');
            if (!toggle) return;
            const key = toggle.dataset.section || toggle.querySelector('.section-toggle')?.dataset.section;
            if (!key) return;
            const isExpanded = toggle.classList.contains('expanded') ||
                toggle.querySelector('.section-toggle')?.classList.contains('expanded');
            // Toggle all section bodies with this key across all cards
            document.querySelectorAll(`.section-body[data-section="${key}"]`).forEach(body => {
                body.style.display = isExpanded ? 'none' : 'block';
            });
            // Rotate all matching chevrons
            document.querySelectorAll(`.section-toggle[data-section="${key}"]`).forEach(btn => {
                btn.classList.toggle('expanded', !isExpanded);
            });

            // Re-sync heights after content is shown/hidden
            // Double RAF ensures browser completes reflow after display:block before measuring
            requestAnimationFrame(() => requestAnimationFrame(() => this.synchronizeSectionHeights()));
        });
    }

    setupFloatingMiniHeader() {
        const cards = document.querySelectorAll('#carouselTrack .product-card');
        if (!cards.length) return;

        const headerEl = document.querySelector('.quiz-container nav') || document.querySelector('nav');
        const firstMeta = document.querySelector('#carouselTrack .product-card .product-meta');
        if (!firstMeta) return;
        const headerHeight = headerEl ? headerEl.getBoundingClientRect().bottom : 61;

        // Mobile: single chip that updates as user swipes
        if (window.innerWidth < 768) {
            const chip = document.createElement('div');
            chip.className = 'swimlane-name-chip';
            chip.innerHTML = `<span class="swimlane-rank"></span><span class="swimlane-name"></span>`;
            document.body.appendChild(chip);

            const rankEl = chip.querySelector('.swimlane-rank');
            const nameEl = chip.querySelector('.swimlane-name');

            const updateContent = () => {
                const container = document.getElementById('carouselContainer');
                if (!container) return;
                const containerRect = container.getBoundingClientRect();
                let activeIndex = 0, maxVisible = -1;
                cards.forEach((card, i) => {
                    const r = card.getBoundingClientRect();
                    const overlap = Math.min(r.right, containerRect.right) - Math.max(r.left, containerRect.left);
                    if (overlap > maxVisible) { maxVisible = overlap; activeIndex = i; }
                });
                const product = this.productsMetadata[cards[activeIndex].dataset.productId];
                rankEl.textContent = `#${activeIndex + 1}`;
                nameEl.textContent = product?.display_name?.[this.currentLanguage] || product?.display_name?.de || '';
            };

            const positionChip = () => {
                chip.style.top = `${(headerEl ? headerEl.getBoundingClientRect().bottom : 61) + 12}px`;
                chip.style.left = '12px';
                chip.style.width = 'calc(100vw - 24px)';
            };

            const container = document.getElementById('carouselContainer');
            if (container) container.addEventListener('scroll', () => { updateContent(); positionChip(); }, { passive: true });
            window.addEventListener('resize', positionChip);
            updateContent();
            positionChip();

            new IntersectionObserver(
                ([entry]) => chip.classList.toggle('visible', !entry.isIntersecting),
                { rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 0 }
            ).observe(firstMeta);
            return;
        }

        // Desktop only — original code below, unchanged
        const chips = [];

        cards.forEach((card, i) => {
            const productId = card.dataset.productId;
            const product = this.productsMetadata[productId];
            if (!product) return;
            const name = product.display_name?.[this.currentLanguage] || product.display_name?.de || productId;

            const chip = document.createElement('div');
            chip.className = 'swimlane-name-chip';
            chip.innerHTML = `<span class="swimlane-rank">#${i + 1}</span><span class="swimlane-name">${name}</span>`;
            document.body.appendChild(chip);
            chips.push({ chip, card });
        });

        const positionChips = () => {
            const topOffset = (headerEl ? headerEl.getBoundingClientRect().bottom : 61) + 12;
            const cardPadding = 16;
            chips.forEach(({ chip, card }) => {
                const rect = card.getBoundingClientRect();
                chip.style.top = `${topOffset}px`;
                chip.style.left = `${rect.left + cardPadding}px`;
                chip.style.width = `${rect.width - cardPadding * 2}px`;
            });
        };

        // Reposition on horizontal card scroll and window resize
        const container = document.getElementById('carouselContainer');
        if (container) container.addEventListener('scroll', positionChips, { passive: true });
        window.addEventListener('resize', positionChips);
        positionChips();

        // Show chips once product-meta scrolls out of view
        const observer = new IntersectionObserver(
            ([entry]) => {
                const show = !entry.isIntersecting;
                chips.forEach(({ chip }) => chip.classList.toggle('visible', show));
                if (show) positionChips();
            },
            { rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 0 }
        );
        observer.observe(firstMeta);
    }

    _submitProductFeedback(productId, value, card) {
        // Update UI immediately — always
        if (card) {
            card.querySelectorAll('.product-feedback-thumb').forEach(btn => {
                btn.disabled = true;
                btn.classList.add('feedback-submitted');
            });
            const sent = card.querySelector('.product-feedback-sent');
            if (sent) sent.style.display = 'inline';
        }

        if (!this.quizTraceId || !productId) return;
        const token = localStorage.getItem('verifyr_access_token');
        fetch('/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ trace_id: this.quizTraceId, name: `product_feedback_${productId}`, value })
        }).catch(e => console.warn('Product feedback submission failed:', e));
    }

    _copyProductRecommendation(card, btn) {
        if (!card) return;
        const productId = card.dataset.productId || '';
        const name = card.querySelector('.product-name')?.textContent?.trim() || '';
        const reasoning = card.querySelector('.recommendation-text p')?.textContent?.trim() || '';
        const strengths = [...card.querySelectorAll('.strengths-section .section-list li')]
            .map(el => el.textContent.trim()).join('\n• ');
        const weaknesses = [...card.querySelectorAll('.weaknesses-section .section-list li')]
            .map(el => el.textContent.trim()).join('\n• ');

        let text = name;
        if (reasoning) text += `\n\n${reasoning}`;
        if (strengths) text += `\n\nStärken:\n• ${strengths}`;
        if (weaknesses) text += `\n\nSchwächen:\n• ${weaknesses}`;

        const originalHTML = btn.innerHTML;

        const onSuccess = () => {
            if (this.quizTraceId) {
                const token = localStorage.getItem('verifyr_access_token');
                fetch('/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ trace_id: this.quizTraceId, name: `copy_recommendation_${productId}`, value: 1 })
                }).catch(() => {});
            }
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>${this.currentLanguage === 'de' ? 'Kopiert!' : 'Copied!'}</span>`;
            btn.style.color = '#16A34A';
            btn.style.borderColor = '#16A34A';
            setTimeout(() => { btn.innerHTML = originalHTML; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
        };

        const onFail = () => {
            // Fallback: execCommand for non-HTTPS or restricted environments
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                onSuccess();
            } catch (_) {
                // Silent fail — user never sees an error
            }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(onFail);
        } else {
            onFail();
        }
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
            this.useCasesMetadata = data.use_cases_metadata || {};
            this.featuresMetadata = data.features_metadata || {};

            console.log('✅ Products metadata loaded:', Object.keys(this.productsMetadata).length);
        } catch (error) {
            console.error('Error loading products metadata:', error);
        }
    }

    updateHeader() {
        // Translate title
        const titles = {
            de: 'Ergebnisse',
            en: 'Results'
        };
        document.getElementById('headerTitle').textContent = titles[this.currentLanguage];

        // Translate subtitle
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
            const noProductsText = {
                de: 'Keine Produkte gefunden',
                en: 'No products found'
            };
            track.innerHTML = `<div style="padding: 40px; text-align: center; color: #6A7282;">${noProductsText[this.currentLanguage]}</div>`;
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

        this.renderDots(sortedProducts.length);

        // Synchronize section heights across all cards so rows align horizontally
        requestAnimationFrame(() => {
            this.synchronizeSectionHeights();
            this.setupCarouselNav();
        });
    }

    renderDots(count) {
        const dotsEl = document.getElementById('carouselDots');
        if (!dotsEl) return;
        dotsEl.innerHTML = Array.from({ length: count }, (_, i) =>
            `<div class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`
        ).join('');
    }

    setupCarouselNav() {
        const container = document.getElementById('carouselContainer');
        const prevBtn   = document.getElementById('carouselPrev');
        const nextBtn   = document.getElementById('carouselNext');
        if (!container) return;

        const getCardWidth = () => {
            const card = container.querySelector('.product-card');
            return card ? card.offsetWidth + 2 : 305; // +2 for gap
        };

        const getCurrentIndex = () => {
            return Math.round(container.scrollLeft / getCardWidth());
        };

        const totalCards = container.querySelectorAll('.product-card').length;

        const updateNav = () => {
            const idx = getCurrentIndex();
            // Update dots
            document.querySelectorAll('.carousel-dot').forEach((d, i) =>
                d.classList.toggle('active', i === idx)
            );
            // Update arrow disabled states
            if (prevBtn) prevBtn.disabled = idx === 0;
            if (nextBtn) nextBtn.disabled = idx >= totalCards - 1;
        };

        container.addEventListener('scroll', updateNav, { passive: true });

        const scrollToIndex = (idx) => {
            const clamped = Math.max(0, Math.min(idx, totalCards - 1));
            container.scrollTo({ left: clamped * getCardWidth(), behavior: 'smooth' });
        };

        if (prevBtn) {
            prevBtn.disabled = true;
            prevBtn.addEventListener('click', () => scrollToIndex(getCurrentIndex() - 1));
        }
        if (nextBtn) {
            nextBtn.disabled = totalCards <= 1;
            nextBtn.addEventListener('click', () => scrollToIndex(getCurrentIndex() + 1));
        }

        // Dot click to jump directly
        document.querySelectorAll('.carousel-dot').forEach((dot, i) =>
            dot.addEventListener('click', () => scrollToIndex(i))
        );
    }

    synchronizeSectionHeights() {
        const sections = [
            '.product-image-container',
            '.product-thumbnails',
            '.product-meta',
            '.tab-container',
            '.purchase-section',
            '.recommendation-text',
            '.recommendation-box',
            '.price-history-section',
            '.produktdaten-content'
        ];
        sections.forEach(selector => {
            const els = document.querySelectorAll(`#carouselTrack .product-card ${selector}`);
            if (els.length < 2) return;
            els.forEach(el => { el.style.minHeight = ''; });
            const maxH = Math.max(...Array.from(els).map(el => el.offsetHeight));
            els.forEach(el => { el.style.minHeight = `${maxH}px`; });
        });

        // Sync visible section-body containers (accordion sections that are open)
        const openKeys = new Set();
        document.querySelectorAll('#carouselTrack .section-body[data-section]').forEach(el => {
            if (el.style.display === 'block') openKeys.add(el.dataset.section);
        });
        openKeys.forEach(key => {
            const els = document.querySelectorAll(`#carouselTrack .section-body[data-section="${key}"]`);
            if (els.length < 2) return;
            els.forEach(el => { el.style.minHeight = ''; });
            const maxH = Math.max(...Array.from(els).map(el => el.offsetHeight));
            els.forEach(el => { el.style.minHeight = `${maxH}px`; });
        });
        this.synchronizeSpecRows();
    }

    synchronizeSpecRows() {
        const allRows = document.querySelectorAll('#carouselTrack .product-card [data-spec-row]');
        const rowKeys = new Set();
        allRows.forEach(r => rowKeys.add(r.dataset.specRow));
        rowKeys.forEach(key => {
            const rows = document.querySelectorAll(`#carouselTrack .product-card [data-spec-row="${key}"]`);
            if (rows.length < 2) return;
            rows.forEach(r => { r.style.minHeight = ''; });
            const maxH = Math.max(...Array.from(rows).map(r => r.offsetHeight));
            rows.forEach(r => { r.style.minHeight = `${maxH}px`; });
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
        card.dataset.productId = match.product_id;

        const displayName = product.display_name?.[this.currentLanguage] || product.display_name?.de || product.id;
        const categoryArr = Array.isArray(product.category) ? product.category : [product.category];
        const category = categoryArr.map(c => this.formatCategoryLabel(c)).join(' · ');
        const imageUrl = product.image_url || '/images/products/placeholder.jpg';
        const imageUrls = product.image_urls || [imageUrl];
        const thumbnailsHtml = imageUrls.length > 1
            ? `<div class="product-thumbnails">${imageUrls.map((url, i) =>
                `<img src="${url}" class="product-thumb${i === 0 ? ' active' : ''}" alt="${displayName} ${i+1}" onerror="this.style.display='none'">`
              ).join('')}</div>`
            : '';
        const matchScore = Math.round(match.match_score * 100);

        // Translation strings
        const t = {
            reviews: { de: 'Bewertungen', en: 'Reviews' },
            recommendation: { de: 'Empfehlung', en: 'Recommendation' },
            specs: { de: 'Produktdaten', en: 'Product Data' },
            ourRecommendation: { de: 'Unsere Empfehlung', en: 'Our Recommendation' },
            strengths: { de: 'Stärken', en: 'Strengths' },
            weaknesses: { de: 'Schwächen', en: 'Weaknesses' },
            verifiedTests: { de: 'Neutral Verifizierte Tests zusammengefasst', en: 'Neutral verified tests summarized' },
            forumDiscussion: { de: 'Forum Diskussion und Review', en: 'Forum discussion and review' },
            orderAt:   { de: 'Bestellen für', en: 'Order for' }
        };

        const hasMultiple = imageUrls.length > 1;
        card.innerHTML = `
            <!-- 1. Product Image -->
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${displayName}" class="product-main-image" onerror="this.src='/images/products/placeholder.jpg'">
                ${hasMultiple ? `
                <button class="img-nav img-nav-prev" aria-label="Previous image">&#8249;</button>
                <button class="img-nav img-nav-next" aria-label="Next image">&#8250;</button>
                ` : ''}
                <button class="img-expand" aria-label="View full image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                </button>
                <button class="favorite-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            ${thumbnailsHtml}

            <!-- 2. Product Meta -->
            <div class="product-meta">
                <h2 class="product-name">${displayName}</h2>
                <p class="product-category">${category}</p>
                <div class="product-rating">
                    <span class="rating-stars"></span>
                    <span class="rating-number">—</span>
                    <span class="review-count"></span>
                </div>
            </div>

            <!-- 3. Tab Switcher -->
            <div class="tab-container">
                <button class="tab-button active" data-tab="empfehlung" data-card-index="${index}">${t.recommendation[this.currentLanguage]}</button>
                <button class="tab-button" data-tab="produktdaten" data-card-index="${index}">${t.specs[this.currentLanguage]}</button>
            </div>

            <!-- Tab Content: Empfehlung -->
            <div class="tab-content active" data-content="empfehlung" data-card-index="${index}">
                ${this.renderEmpfehlungTab(match, product, t)}
            </div>

            <!-- Tab Content: Produktdaten -->
            <div class="tab-content" data-content="produktdaten" data-card-index="${index}">
                ${this.renderProduktdatenTab(product)}
            </div>
        `;

        // Add tab switching functionality
        this.setupImageGallery(card);
        this.setupTabSwitching(card, index);
        this.setupPriceChartHover(card);

        return card;
    }

    _renderBuyButtons(product, t) {
        const lang = this.currentLanguage;
        const links = (product.buy_links || [])
            .filter(l => l.url)
            .sort((a, b) => {
                if (a.price == null && b.price == null) return 0;
                if (a.price == null) return 1;
                if (b.price == null) return -1;
                return a.price - b.price;
            })
            .slice(0, 3);

        if (!links.length) return `<span class="purchase-placeholder">${lang === 'de' ? 'Kauflinks folgen bald' : 'Buy links coming soon'}</span>`;

        const colors = ['purchase-button-1', 'purchase-button-2', 'purchase-button-3'];
        return links.map((l, i) => {
            const priceStr = l.price != null ? `${l.price.toLocaleString('de-DE')} €` : '';
            const line2 = priceStr ? `${t.orderAt[lang]} ${priceStr}` : l.shop;
            return `<a href="${l.url}" target="_blank" rel="noopener" class="purchase-button ${colors[i]}">
                ${l.shop}${priceStr ? `<br>${line2}` : ''}
            </a>`;
        }).join('');
    }

    renderEmpfehlungTab(match, product, t) {
        const displayName = product.display_name?.[this.currentLanguage] || product.display_name?.de || product.id;

        return `
            <!-- 4. Purchase Buttons -->
            <div class="purchase-section">
                <div class="purchase-buttons">
                    ${this._renderBuyButtons(product, t)}
                </div>
            </div>

            <!-- 5. Recommendation Box -->
            <div class="recommendation-box">
                <div class="recommendation-header">
                    <h3 class="recommendation-title">${t.ourRecommendation[this.currentLanguage]}</h3>
                    <span class="average-score ${Math.round(match.match_score * 100) >= 85 ? 'score-high' : Math.round(match.match_score * 100) >= 70 ? 'score-mid' : 'score-low'}">${Math.round(match.match_score * 100)}% Match</span>
                </div>

                <div class="recommendation-text">
                    ${match.reasoning ? `<p>${match.reasoning}</p>` : this.generateRecommendationText(match, product)}
                </div>

                <div class="recommendation-expand-row">
                    <button class="section-toggle recommendation-expand-btn" data-section="recommendation" title="${this.currentLanguage === 'de' ? 'Stärken & Schwächen anzeigen' : 'Show strengths & weaknesses'}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                </div>

                <div class="section-body" data-section="recommendation">
                    <div class="strengths-section">
                        <h4 class="section-title">${t.strengths[this.currentLanguage]}</h4>
                        <ul class="section-list">
                            ${(product.pros?.[this.currentLanguage] || product.pros?.en || []).map(s => `<li>+ ${s}</li>`).join('')}
                            ${match.dynamic_strength ? `<li>+ ${match.dynamic_strength}</li>` : ''}
                        </ul>
                    </div>

                    <div class="weaknesses-section">
                        <h4 class="section-title">${t.weaknesses[this.currentLanguage]}</h4>
                        <ul class="section-list">
                            ${(product.cons?.[this.currentLanguage] || product.cons?.en || []).map(w => `<li>- ${w}</li>`).join('')}
                            ${match.dynamic_weakness ? `<li>- ${match.dynamic_weakness}</li>` : ''}
                        </ul>
                    </div>
                </div>

                <!-- Product Feedback & Copy -->
                <div class="product-actions">
                    <button class="product-copy-btn" title="Empfehlung kopieren">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                    <div class="product-feedback">
                        <span class="product-feedback-label">${this.currentLanguage === 'de' ? 'War die Empfehlung hilfreich?' : 'Was this recommendation helpful?'}</span>
                        <button class="product-feedback-thumb" data-value="1" title="Passt gut">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                            </svg>
                        </button>
                        <button class="product-feedback-thumb" data-value="0" title="Passt nicht">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                            </svg>
                        </button>
                        <span class="product-feedback-sent" style="display:none">&#10003;</span>
                    </div>
                </div>
            </div>

            <!-- 6. Price History -->
            ${this.renderPriceHistorySection(product)}

            <!-- 7. Amazon Sentiment -->
            <div class="amazon-sentiment-box">
                ${this.renderSentimentWidget(null, match.product_id)}
            </div>

            <!-- 8. Reddit Community -->
            <div class="reddit-sentiment-box" data-product-id="${match.product_id}">
                ${this.renderRedditWidget(null, match.product_id)}
            </div>

            <!-- 9. Reviews Header + 10. Review Boxes -->
            <div class="acc-section-wrap">
                <div class="acc-section-header">
                    <span class="acc-section-title">${t.verifiedTests[this.currentLanguage]}</span>
                    <button class="section-toggle" data-section="reviews" title="${this.currentLanguage === 'de' ? 'Anzeigen' : 'Expand'}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                </div>
                <div class="section-body" data-section="reviews">
                    ${this.renderReviewBoxes(product)}
                </div>
            </div>

            <!-- 11. YouTube Video Reviews -->
            ${this.renderYoutubeSection(product)}

        `;
    }

    _renderStars(rating) {
        if (rating == null) return '';
        const full  = Math.floor(rating);
        const half  = rating - full >= 0.25 && rating - full < 0.75;
        const empty = 5 - full - (half ? 1 : 0);
        return (
            '★'.repeat(full) +
            (half ? '½' : '') +
            '☆'.repeat(empty)
        );
    }

    renderSentimentWidget(data, productId) {
        const lang = this.currentLanguage;
        const t = {
            title:       { de: 'Amazon Kundenmeinungen', en: 'Amazon Customer Reviews' },
            noData:      { de: 'Noch keine Amazon-Daten verfügbar', en: 'No Amazon data available yet' },
            positive:    { de: 'Positiv', en: 'Positive' },
            neutral:     { de: 'Neutral', en: 'Neutral' },
            negative:    { de: 'Negativ', en: 'Negative' },
            readAll:     { de: 'Alle Bewertungen bei Amazon.de lesen', en: 'Read all reviews on Amazon.de' },
            reviews:     { de: 'Bewertungen', en: 'Reviews' },
        };

        if (!data || !data.available) {
            return `
                <div class="sentiment-empty">
                    <span class="sentiment-empty-icon">⭐</span>
                    <span class="sentiment-empty-text">${t.noData[lang]}</span>
                </div>`;
        }

        const { amazon_rating, amazon_review_count, amazon_price, product_url, sentiment, top_positives, top_positives_en, top_negatives, top_negatives_en, summary, summary_en, last_updated: last_updated_raw } = data;
        const last_updated = last_updated_raw
            ? new Date(last_updated_raw).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
        const pos = sentiment?.positive_pct ?? 0;
        const neu = sentiment?.neutral_pct ?? 0;
        const neg = sentiment?.negative_pct ?? 0;

        // Pick localised text based on current language
        const activeSummary   = lang === 'en' && summary_en   ? summary_en   : summary;
        const activePositives = lang === 'en' && top_positives_en?.length ? top_positives_en : top_positives;
        const activeNegatives = lang === 'en' && top_negatives_en?.length ? top_negatives_en : top_negatives;

        const ratingStr  = amazon_rating != null ? amazon_rating.toFixed(1) : '—';
        const starsHtml  = amazon_rating != null
            ? `<span class="sentiment-stars">${this._renderStars(amazon_rating)}</span><span class="sentiment-rating-num">${ratingStr} / 5</span>`
            : '';
        const countStr  = amazon_review_count != null
            ? `${amazon_review_count.toLocaleString('de-DE')} ${t.reviews[lang]}`
            : '';

        // Use stored product_url first, then fall back to ASIN-derived URL
        const product = this.productsMetadata[productId];
        const metaUrl = product?.amazon_url || '';
        const asinMatch = metaUrl.match(/\/dp\/([A-Z0-9]{10})/);
        const amazonUrl = product_url
            || (asinMatch ? `https://www.amazon.de/product-reviews/${asinMatch[1]}` : 'https://www.amazon.de');

        const positivesHtml = (activePositives || []).map(p =>
            `<li class="sentiment-theme sentiment-theme-pos">+ ${p}</li>`
        ).join('');
        const negativesHtml = (activeNegatives || []).map(n =>
            `<li class="sentiment-theme sentiment-theme-neg">− ${n}</li>`
        ).join('');

        return `
            <div class="sentiment-header">
                <div class="sentiment-title-row">
                    <span class="sentiment-title">${t.title[lang]}</span>
                    <div class="section-header-right">
                        ${last_updated ? `<span class="sentiment-last-updated">${lang === 'de' ? 'Zuletzt aktualisiert' : 'Last updated'}: ${last_updated}</span>` : ''}
                        <button class="section-toggle" data-section="amazon" title="${lang === 'de' ? 'Anzeigen' : 'Expand'}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
                <div class="sentiment-score">
                    ${starsHtml}
                    ${countStr ? `<span class="sentiment-count">${countStr}</span>` : ''}
                </div>
            </div>
            <div class="section-body" data-section="amazon">
            ${activeSummary ? `<p class="sentiment-summary">${activeSummary}</p>` : ''}
            <div class="sentiment-bars">
                <div class="sentiment-bar-row">
                    <span class="sentiment-bar-label">${t.positive[lang]}</span>
                    <div class="sentiment-bar-track">
                        <div class="sentiment-bar-fill sentiment-bar-pos" style="width:${pos}%"></div>
                    </div>
                    <span class="sentiment-bar-pct">${pos}%</span>
                </div>
                <div class="sentiment-bar-row">
                    <span class="sentiment-bar-label">${t.neutral[lang]}</span>
                    <div class="sentiment-bar-track">
                        <div class="sentiment-bar-fill sentiment-bar-neu" style="width:${neu}%"></div>
                    </div>
                    <span class="sentiment-bar-pct">${neu}%</span>
                </div>
                <div class="sentiment-bar-row">
                    <span class="sentiment-bar-label">${t.negative[lang]}</span>
                    <div class="sentiment-bar-track">
                        <div class="sentiment-bar-fill sentiment-bar-neg" style="width:${neg}%"></div>
                    </div>
                    <span class="sentiment-bar-pct">${neg}%</span>
                </div>
            </div>
            ${(positivesHtml || negativesHtml) ? `
            <ul class="sentiment-themes">
                ${positivesHtml}
                ${negativesHtml}
            </ul>` : ''}
            <a href="${amazonUrl}" target="_blank" class="sentiment-amazon-link">
                ${countStr ? `${countStr} ` : ''}${t.readAll[lang]}
            </a>
            </div>`;
    }

    renderProduktdatenTab(product) {
        const specs = product.key_specs || {};
        const lang = this.currentLanguage;

        // Helper function to get translated value
        const getValue = (obj, fallback = '') => {
            if (!obj) return fallback;
            if (typeof obj === 'string') return obj;
            if (typeof obj === 'number') return obj.toString();
            if (obj[lang]) return obj[lang];
            if (obj.de) return obj.de;
            return fallback;
        };

        // Helper to render a spec row — always renders, shows — when no value
        const renderRow = (label, value) => {
            const display = (!value || value === 'null' || value === 'undefined') ? '—' : value;
            const rowKey = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            return `
                <div data-spec-row="${rowKey}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F1F5F9; min-height: 40px;">
                    <div style="font-size: 12px; color: #64748B; font-weight: 500; flex-shrink: 0; margin-right: 12px;">${label}</div>
                    <div style="font-size: 12px; color: #0F172A; font-weight: 600; text-align: right; max-width: 60%;">${display}</div>
                </div>
            `;
        };

        return `
            <div class="produktdaten-content" style="padding: 16px; background: white;">
                <!-- Header with manufacturer link -->
                ${product.manufacturer_link ? `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                            <div style="font-size: 13px; color: #64748B; font-weight: 500;">${lang === 'de' ? 'Hersteller' : 'Manufacturer'}</div>
                            <a href="${product.manufacturer_link.url || '#'}" target="_blank" style="font-size: 13px; color: #3B82F6; font-weight: 600; text-decoration: none;">
                                ${product.brand} (${getValue(product.manufacturer_link, 'Mehr Info')})
                            </a>
                        </div>
                    </div>
                ` : ''}

                <!-- Price -->
                ${renderRow(
                    lang === 'de' ? 'Preis' : 'Price',
                    product.price != null ? `€${product.price}` : ''
                )}

                <!-- Display -->
                ${renderRow(
                    'Display',
                    [
                        specs.display?.resolution,
                        getValue(specs.display?.type),
                        getValue(specs.display?.shape),
                        specs.display?.color_display ? (lang === 'de' ? 'Farbdisplay' : 'Color display') : '',
                        specs.display?.touchscreen ? 'Touchscreen' : '',
                        specs.display?.always_on ? (lang === 'de' ? 'immer an' : 'always on') : ''
                    ].filter(x => x).join(', ')
                )}

                <!-- OS -->
                ${renderRow(
                    'OS',
                    getValue(specs.os) || specs.os?.compatibility?.join(', ')
                )}

                <!-- Storage -->
                ${renderRow(
                    lang === 'de' ? 'Speicher' : 'Storage',
                    getValue(specs.storage)
                )}

                <!-- Glass Type -->
                ${renderRow(
                    lang === 'de' ? 'Glastype' : 'Glass type',
                    getValue(specs.materials?.glass_description)
                )}

                <!-- Case Material -->
                ${renderRow(
                    lang === 'de' ? 'Gehäuse' : 'Case',
                    specs.materials?.case_options ? specs.materials.case_options.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') : getValue(specs.materials)
                )}

                <!-- Strap -->
                ${renderRow(
                    lang === 'de' ? 'Armband' : 'Strap',
                    getValue(specs.strap)
                )}

                <!-- Weight -->
                ${renderRow(
                    lang === 'de' ? 'Gewicht' : 'Weight',
                    getValue(specs.weight)
                )}

                <!-- Battery -->
                ${renderRow(
                    lang === 'de' ? 'Akku' : 'Battery',
                    specs.battery_life?.typical_hours ? `${specs.battery_life.typical_hours}h (${lang === 'de' ? 'typisch' : 'typical'})` :
                    specs.battery_life?.typical_days ? `${specs.battery_life.typical_days} ${lang === 'de' ? 'Tage (typisch)' : 'days (typical)'}` :
                    getValue(specs.battery_life)
                )}

                <!-- Quick Charge -->
                ${renderRow(
                    lang === 'de' ? 'Schnellladen' : 'Quick charge',
                    getValue(specs.quick_charge)
                )}

                <!-- Pulse Measurement -->
                ${renderRow(
                    lang === 'de' ? 'Pulsmessung' : 'Pulse measurement',
                    getValue(specs.pulse_measurement)
                )}

                <!-- Sensors -->
                ${renderRow(
                    lang === 'de' ? 'Sensoren' : 'Sensors',
                    getValue(specs.sensors)
                )}

                <!-- Measurement Functions -->
                ${renderRow(
                    lang === 'de' ? 'Messfunk.' : 'Measurement func.',
                    getValue(specs.measurement_functions)
                )}

                <!-- Navigation -->
                ${renderRow(
                    'Navigation',
                    getValue(specs.navigation)
                )}

                <!-- Health Status -->
                ${renderRow(
                    'Health Status',
                    getValue(specs.health_status)
                )}

                <!-- Training -->
                ${renderRow(
                    'Training',
                    getValue(specs.training)
                )}

                <!-- Live Tracking -->
                ${renderRow(
                    'Live Tracking',
                    getValue(specs.live_tracking)
                )}

                <!-- Contactless Payment -->
                ${renderRow(
                    lang === 'de' ? 'Bargeldlos' : 'Contactless',
                    getValue(specs.contactless_payment)
                )}

                <!-- Water Resistance -->
                ${renderRow(
                    lang === 'de' ? 'Wasserdicht' : 'Water resistance',
                    getValue(specs.water_resistance)
                )}

                <!-- Connectivity -->
                ${renderRow(
                    lang === 'de' ? 'Konnektivität' : 'Connectivity',
                    getValue(specs.connectivity)
                )}
            </div>
        `;
    }

    generateRecommendationText(match, product) {
        const lang = this.currentLanguage;
        const summary = this.quizResults?.quiz_summary || {};

        const texts = {
            de: {
                intro: 'Basierend auf deinen Quiz-Antworten empfehlen wir dieses Produkt mit einem Match-Score von',
                useCasesLabel: 'Deine Anwendungsfälle',
                featuresLabel: 'Deine Prioritäten',
                budgetLabel: 'Dein Budget',
                specialLabel: 'Besondere Anforderung',
            },
            en: {
                intro: 'Based on your quiz answers, we recommend this product with a match score of',
                useCasesLabel: 'Your use cases',
                featuresLabel: 'Your priorities',
                budgetLabel: 'Your budget',
                specialLabel: 'Special requirement',
            }
        };

        const t = texts[lang];

        // Translate use case IDs to human-readable names
        const useCaseNames = (summary.use_cases || []).map(id => {
            const meta = this.useCasesMetadata?.[id];
            return meta?.name?.[lang] || meta?.name?.en || id.replace(/_/g, ' ');
        });

        // Translate top 3 feature IDs to human-readable names
        const featureIds = (summary.priorities?.length ? summary.priorities : summary.features) || [];
        const featureNames = featureIds.slice(0, 3).map(id => {
            const meta = this.featuresMetadata?.[id];
            return meta?.name?.[lang] || meta?.name?.en || id.replace(/_/g, ' ');
        });

        // Match reasons (only non-trivial ones, skip empty strings)
        const reasons = (match.match_reasons || []).filter(r => r && r.trim()).join('. ');

        let html = `<p>${t.intro} <strong>${Math.round(match.match_score * 100)}%</strong>.</p>`;

        if (useCaseNames.length) {
            html += `<p><strong>${t.useCasesLabel}:</strong> ${useCaseNames.join(', ')}</p>`;
        }
        if (featureNames.length) {
            html += `<p><strong>${t.featuresLabel}:</strong> ${featureNames.join(', ')}</p>`;
        }
        if (reasons) {
            html += `<p>${reasons}.</p>`;
        }

        const budgetMin = summary.budget_min;
        const budgetMax = summary.budget_max;
        if (budgetMin != null && budgetMax != null) {
            html += `<p><strong>${t.budgetLabel}:</strong> €${budgetMin}–€${budgetMax}</p>`;
        }

        if (summary.special_request) {
            html += `<p><strong>${t.specialLabel}:</strong> ${summary.special_request}</p>`;
        }

        return html;
    }

    generateStrengths(product) {
        const strengths = [];
        const specs = product.key_specs || {};

        const texts = {
            battery: { de: 'Sehr gute Akkulaufzeit', en: 'Excellent battery life' },
            water: { de: 'Wasserdicht und robust', en: 'Waterproof and durable' },
            display: { de: 'Helles, gut ablesbares Display', en: 'Bright, easy-to-read display' },
            sensors: { de: 'Umfangreiche Sensoren für Health-Tracking', en: 'Comprehensive health tracking sensors' },
            default1: { de: 'Gute Gesamtleistung', en: 'Good overall performance' },
            default2: { de: 'Zuverlässige Qualität', en: 'Reliable quality' }
        };

        if (specs.battery_life) {
            strengths.push(texts.battery[this.currentLanguage]);
        }
        if (specs.water_resistance) {
            strengths.push(texts.water[this.currentLanguage]);
        }
        if (specs.display) {
            strengths.push(texts.display[this.currentLanguage]);
        }
        if (specs.sensors) {
            strengths.push(texts.sensors[this.currentLanguage]);
        }

        return strengths.length > 0 ? strengths : [texts.default1[this.currentLanguage], texts.default2[this.currentLanguage]];
    }

    generateWeaknesses(product) {
        const weaknesses = [];
        const specs = product.key_specs || {};

        const texts = {
            applePrice: { de: 'Hoher Preis im Vergleich zur Konkurrenz', en: 'High price compared to competitors' },
            appleBattery: { de: 'Kurze Akkulaufzeit', en: 'Short battery life' },
            garminComplex: { de: 'Komplexe Bedienung für Einsteiger', en: 'Complex interface for beginners' },
            garminSize: { de: 'Große Bauform', en: 'Large form factor' },
            default: { de: 'Keine wesentlichen Schwächen', en: 'No significant weaknesses' }
        };

        // Generic weaknesses (would be customized per product in real app)
        if (product.brand === 'Apple') {
            weaknesses.push(texts.applePrice[this.currentLanguage]);
            weaknesses.push(texts.appleBattery[this.currentLanguage]);
        } else if (product.brand === 'Garmin') {
            weaknesses.push(texts.garminComplex[this.currentLanguage]);
            weaknesses.push(texts.garminSize[this.currentLanguage]);
        }

        return weaknesses.length > 0 ? weaknesses : [texts.default[this.currentLanguage]];
    }

    renderPriceHistorySection(product) {
        const lang = this.currentLanguage;
        const idealoUrl = product.idealo_url || null;
        const history = (product.price_history || []).filter(e => e.price != null);

        if (!history.length && !idealoUrl) return '';

        const t = {
            title:      { de: 'Preisverlauf', en: 'Price History' },
            idealoBtn:  { de: 'Auf Idealo.de ansehen', en: 'View on Idealo.de' },
            currentLbl: { de: 'Aktuell', en: 'Current' },
            noData:     { de: 'Noch keine Verlaufsdaten', en: 'No history data yet' }
        };

        // Price change badge (#4)
        let changeBadge = '';
        if (history.length >= 2) {
            const sortedH = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const first = sortedH[0].price;
            const last  = sortedH[sortedH.length - 1].price;
            const pct   = ((last - first) / first * 100);
            const isDown = pct <= 0;
            const arrow  = isDown ? '↓' : '↑';
            const pctStr = `${arrow} ${Math.abs(pct).toFixed(1).replace('.', ',')}%`;
            changeBadge = `<span class="price-change-badge ${isDown ? 'price-change-down' : 'price-change-up'}">${pctStr}</span>`;
        }

        const lastEntry = history.length
            ? [...history].sort((a, b) => new Date(a.date) - new Date(b.date)).at(-1)
            : null;
        const lastUpdated = lastEntry
            ? new Date(lastEntry.date).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

        const idealoLink = idealoUrl ? `
            <div class="price-history-idealo-wrap">
                <a href="${idealoUrl}" target="_blank" rel="noopener" class="price-history-idealo-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    ${t.idealoBtn[lang]}
                </a>
                ${lastUpdated ? `<span class="price-history-updated">${lang === 'de' ? 'Zuletzt aktualisiert' : 'Last updated'}: ${lastUpdated}</span>` : ''}
            </div>` : '';

        const chartHtml = history.length >= 2
            ? this._renderPriceChart(history, product.id, lang)
            : history.length === 1
                ? `<div class="price-history-single">
                       <span class="price-history-single-label">${t.currentLbl[lang]}</span>
                       <span class="price-history-single-value">${history[0].price.toLocaleString('de-DE')} €</span>
                   </div>`
                : `<p class="price-history-nodata">${t.noData[lang]}</p>`;

        return `
            <div class="price-history-section">
                <div class="price-history-header">
                    <div class="price-history-header-left">
                        <span class="price-history-title">${t.title[lang]}</span>
                        ${changeBadge}
                    </div>
                    <div class="section-header-right">
                        ${idealoLink}
                        <button class="section-toggle" data-section="price" title="${lang === 'de' ? 'Anzeigen' : 'Expand'}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
                <div class="section-body" data-section="price">
                    ${chartHtml}
                </div>
            </div>`;
    }

    // Catmull-Rom → cubic bezier smooth curve (#1)
    _smoothCurve(pts) {
        if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
        const t = 0.35;
        let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];
            const cp1x = p1.x + (p2.x - p0.x) * t;
            const cp1y = p1.y + (p2.y - p0.y) * t;
            const cp2x = p2.x - (p3.x - p1.x) * t;
            const cp2y = p2.y - (p3.y - p1.y) * t;
            d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
        }
        return d;
    }

    _renderPriceChart(history, productId, lang) {
        const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        const prices = sorted.map(e => e.price);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const range = maxP - minP || 1;

        const W = 300, H = 116;
        const PAD = { top: 14, right: 40, bottom: 28, left: 22 };
        const cW = W - PAD.left - PAD.right;
        const cH = H - PAD.top - PAD.bottom;
        const chartLeft   = PAD.left;
        const chartRight  = W - PAD.right;
        const chartTop    = PAD.top;
        const chartBottom = PAD.top + cH;

        const pts = sorted.map((e, i) => ({
            x: PAD.left + (sorted.length === 1 ? cW / 2 : (i / (sorted.length - 1)) * cW),
            y: PAD.top + cH - ((e.price - minP) / range) * cH,
            price: e.price,
            date: e.date,
            isMin: e.price === minP,
            isMax: e.price === maxP
        }));

        // Smooth paths (#1)
        const linePath = `M ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
        const areaPath = `M${pts[0].x.toFixed(1)},${chartBottom} L${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} L${pts[pts.length-1].x.toFixed(1)},${chartBottom} Z`;

        const fmtDate = d => new Date(d).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: '2-digit' });
        const last = pts[pts.length - 1];

        // Min/max price points (#5)
        const minPt = pts.find(p => p.isMin);

        // Y axis: min, mid, max
        const yTicks = [minP, Math.round((minP + maxP) / 2), maxP];
        const yLabels = yTicks.map(v => ({
            y: PAD.top + cH - ((v - minP) / range) * cH,
            label: `${v}€`
        }));

        // X axis: first + last
        const xLabels = [
            { x: pts[0].x, label: fmtDate(sorted[0].date) },
            { x: pts[pts.length - 1].x, label: fmtDate(sorted[sorted.length - 1].date) }
        ];

        const gradId = `pg_${productId}`;

        return `
        <svg class="price-chart-svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;cursor:crosshair">
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="#3B82F6" stop-opacity="0.28"/>
                    <stop offset="70%"  stop-color="#3B82F6" stop-opacity="0.06"/>
                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
                </linearGradient>
            </defs>

            <!-- Grid lines -->
            ${yLabels.map(l => `<line x1="${chartLeft}" y1="${l.y.toFixed(1)}" x2="${chartRight}" y2="${l.y.toFixed(1)}" stroke="#EFF2F6" stroke-width="1"/>`).join('')}

            <!-- Area + line -->
            <path d="${areaPath}" fill="url(#${gradId})"/>
            <path d="${linePath}" fill="none" stroke="#3B82F6" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round"/>

            <!-- Invisible data points for hover detection (no dots = #2) -->
            ${pts.map(p => `<circle class="chart-data-point" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="0" fill="none" data-x="${p.x.toFixed(1)}" data-y="${p.y.toFixed(1)}" data-price="${p.price}" data-date="${p.date}" data-ismin="${p.isMin}" data-ismax="${p.isMax}"/>`).join('')}


            <!-- Last point highlight -->
            <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="#3B82F6" stroke="#fff" stroke-width="1.5"/>

            <!-- Y axis labels -->
            ${yLabels.map(l => `<text x="${(chartLeft - 4).toFixed(1)}" y="${(l.y + 3.5).toFixed(1)}" text-anchor="end" font-size="7" fill="#C4CADB" font-family="Inter,sans-serif">${l.label}</text>`).join('')}
            <!-- X axis labels -->
            ${xLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="7" fill="#C4CADB" font-family="Inter,sans-serif">${l.label}</text>`).join('')}

            <!-- Current price callout -->
            <text x="${(last.x + 6).toFixed(1)}" y="${(last.y + 3.5).toFixed(1)}" font-size="9" fill="#3B82F6" font-weight="700" font-family="Inter,sans-serif">${last.price}€</text>

            <!-- Cursor group — smooth CSS transform (#7) -->
            <g class="chart-cursor-group" style="display:none;pointer-events:none">
                <line class="chart-crosshair" x1="0" x2="0" y1="${chartTop}" y2="${chartBottom}" stroke="#3B82F6" stroke-width="1" stroke-dasharray="3,2" opacity="0.45"/>
                <circle class="chart-hover-point" cx="0" r="3.5" fill="#3B82F6" stroke="#fff" stroke-width="1.5"/>
            </g>

            <!-- Tooltip group — positioned separately -->
            <g class="chart-tooltip-group" style="display:none;pointer-events:none">
                <rect class="chart-tooltip-bg" rx="5" fill="#1E293B" opacity="0.92"/>
                <text class="chart-tooltip-price" text-anchor="middle" font-size="9" fill="#fff" font-weight="700" font-family="Inter,sans-serif"/>
                <text class="chart-tooltip-date"  text-anchor="middle" font-size="7" fill="#94A3B8" font-family="Inter,sans-serif"/>
                <text class="chart-tooltip-badge" text-anchor="middle" font-size="7" font-weight="600" font-family="Inter,sans-serif"/>
            </g>

            <!-- Transparent overlay for mouse capture -->
            <rect class="chart-overlay" x="${chartLeft}" y="${chartTop}" width="${cW}" height="${cH}" fill="transparent"/>
        </svg>`;
    }

    renderReviewBoxes(product) {
        return `<div class="review-boxes-container" data-product-id="${product.id}"></div>`;
    }

    renderYoutubeSection(product) {
        const videos = product.youtube_videos;
        if (!videos || videos.length === 0) return '';
        const lang = this.currentLanguage;
        const heading = lang === 'de' ? 'Video Reviews' : 'Video Reviews';

        const cards = videos.map(v => `
            <div class="yt-video-card" data-video-id="${v.video_id}" role="button" tabindex="0" aria-label="Play: ${v.title}">
                <div class="yt-thumbnail-wrap">
                    <img class="yt-thumbnail" src="https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg" alt="${v.title}" loading="lazy">
                    <div class="yt-play-btn" aria-hidden="true">
                        <svg viewBox="0 0 68 48" width="48" height="34"><path class="yt-play-bg" d="M66.52 7.74A8.54 8.54 0 0 0 60.71 1.9C55.4.5 34 .5 34 .5S12.6.5 7.29 1.9A8.54 8.54 0 0 0 1.48 7.74C.1 13.08.1 24 .1 24s0 10.92 1.38 16.26a8.54 8.54 0 0 0 5.81 5.84C12.6 47.5 34 47.5 34 47.5s21.4 0 26.71-1.4a8.54 8.54 0 0 0 5.81-5.84C67.9 34.92 67.9 24 67.9 24s0-10.92-1.38-16.26z"/><path class="yt-play-arrow" d="M27 33.5 45 24 27 14.5z"/></svg>
                    </div>
                </div>
                <div class="yt-video-info">
                    <p class="yt-video-title">${v.title}</p>
                    <p class="yt-video-channel">${v.channel}</p>
                </div>
            </div>`).join('');

        return `
            <div class="youtube-section acc-section-wrap">
                <div class="acc-section-header">
                    <span class="acc-section-title">${heading}</span>
                    <button class="section-toggle" data-section="youtube" title="${lang === 'de' ? 'Anzeigen' : 'Expand'}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                </div>
                <div class="section-body" data-section="youtube">
                    <div class="youtube-cards-row">${cards}</div>
                </div>
            </div>`;
    }

    setupYoutubeModal() {
        // Inject modal HTML once
        if (!document.getElementById('yt-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="yt-modal" class="yt-modal-overlay" role="dialog" aria-modal="true" aria-label="Video player" hidden>
                    <div class="yt-modal-inner">
                        <button class="yt-modal-close" aria-label="Close video">&times;</button>
                        <div class="yt-modal-frame-wrap">
                            <iframe id="yt-modal-iframe" class="yt-modal-iframe"
                                frameborder="0"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                </div>`);
        }

        const modal = document.getElementById('yt-modal');
        const iframe = document.getElementById('yt-modal-iframe');

        const openModal = (videoId) => {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            modal.hidden = false;
            document.body.style.overflow = 'hidden';
        };

        const closeModal = () => {
            modal.hidden = true;
            iframe.src = '';
            document.body.style.overflow = '';
        };

        // Close on button or backdrop click
        modal.querySelector('.yt-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

        // Delegate clicks on video cards (cards are rendered later)
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.yt-video-card');
            if (card) openModal(card.dataset.videoId);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('.yt-video-card');
                if (card) { e.preventDefault(); openModal(card.dataset.videoId); }
            }
        });
    }

    async loadReviewsForAllCards() {
        if (!this.quizResults?.matched_products) return;
        const token = localStorage.getItem('verifyr_access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        for (const match of this.quizResults.matched_products) {
            try {
                const res = await fetch(`/products/${match.product_id}/reviews`, { headers });
                if (!res.ok) continue;
                const data = await res.json();
                this.updateCardReviews(match.product_id, data.reviews || []);
            } catch (e) {
                // Non-fatal
            }
        }
        requestAnimationFrame(() => this.synchronizeSectionHeights());
    }

    updateCardReviews(productId, reviews) {
        const container = document.querySelector(`.review-boxes-container[data-product-id="${productId}"]`);
        if (!container) return;
        const lang = this.currentLanguage;
        const linkLabel = lang === 'de' ? 'Vollständigen Test lesen' : 'Read full review';

        container.innerHTML = reviews.map(r => {
            const summary = (lang === 'en' && r.summary_en) ? r.summary_en : r.summary;
            const reviewDate = r.review_date
                ? new Date(r.review_date).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
            const hasPct = r.positive_pct != null;
            const pctHtml = hasPct ? `
                <span class="review-pct review-pct-pos">${r.positive_pct}%</span>
                <span class="review-pct review-pct-neu">${r.neutral_pct}%</span>
                <span class="review-pct review-pct-neg">${r.negative_pct}%</span>` : '';
            return `
            <div class="review-box">
                <div class="review-left">
                    <div class="review-logo">
                        ${r.source_name}
                        ${pctHtml}
                    </div>
                    ${summary ? `<p class="review-summary">${summary}</p>` : ''}
                    <div class="review-footer">
                        <a href="${r.source_url}" target="_blank" rel="noopener" class="review-link">${linkLabel} ↗</a>
                        ${reviewDate ? `<span class="review-date">${reviewDate}</span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    async loadRedditSentimentForAllCards() {
        if (!this.quizResults?.matched_products) return;
        const token = localStorage.getItem('verifyr_access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        for (const match of this.quizResults.matched_products) {
            try {
                const res = await fetch(`/products/${match.product_id}/reddit-sentiment`, { headers });
                if (!res.ok) continue;
                const data = await res.json();
                this.redditCache[match.product_id] = data;
                this.updateCardRedditSentiment(match.product_id, data);
            } catch (e) {
                // Non-fatal
            }
        }
        requestAnimationFrame(() => this.synchronizeSectionHeights());
    }

    updateCardRedditSentiment(productId, data) {
        const box = document.querySelector(`.reddit-sentiment-box[data-product-id="${productId}"]`);
        if (!box) return;
        box.innerHTML = this.renderRedditWidget(data, productId);
    }

    renderRedditWidget(data, productId) {
        const lang = this.currentLanguage;
        const t = {
            title:     { de: 'Reddit Community', en: 'Reddit Community' },
            noData:    { de: 'Noch keine Reddit-Daten verfügbar', en: 'No Reddit data available yet' },
            posts:     { de: 'Beiträge', en: 'posts' },
            positive:  { de: 'Positiv', en: 'Positive' },
            neutral:   { de: 'Neutral', en: 'Neutral' },
            negative:  { de: 'Negativ', en: 'Negative' },
            pros:      { de: 'Häufig gelobt', en: 'Frequently praised' },
            cons:      { de: 'Häufig kritisiert', en: 'Frequently criticized' },
            topPosts:  { de: 'Top Diskussionen', en: 'Top Discussions' },
            comments:  { de: 'Kommentare', en: 'comments' },
        };

        if (!data || !data.available) {
            return `
                <div class="sentiment-empty">
                    <span class="sentiment-empty-icon">🗨️</span>
                    <span class="sentiment-empty-text">${t.noData[lang]}</span>
                </div>`;
        }

        const s = data.sentiment || {};
        const pos = s.positive_pct ?? 0;
        const neu = s.neutral_pct ?? 0;
        const neg = s.negative_pct ?? 0;

        const summary = lang === 'en' && s.summary_en ? s.summary_en : s.summary;
        const pros    = lang === 'en' && s.pros_en?.length ? s.pros_en : (s.pros || []);
        const cons    = lang === 'en' && s.cons_en?.length ? s.cons_en : (s.cons || []);

        // Subreddit pills — use searched_subreddits (the known community subs) so pills
        // always show the dedicated communities, even if a sub had 0 posts.
        const pillSources = (data.searched_subreddits && data.searched_subreddits.length)
            ? data.searched_subreddits
            : (data.subreddits_found || []);
        const subredditPills = pillSources
            .map(sr => {
                const name = sr.startsWith('r/') ? sr : `r/${sr}`;
                const url = `https://www.reddit.com/${name}/`;
                return `<a href="${url}" target="_blank" rel="noopener" class="reddit-subreddit-pill">${name}</a>`;
            }).join('');

        // Top posts
        const topPostsHtml = (data.top_posts || []).slice(0, 4).map(p => `
            <a href="${p.url}" target="_blank" rel="noopener" class="reddit-post-link">
                <span class="reddit-post-sub">${p.subreddit}</span>
                <span class="reddit-post-title">${this._escapeHtml(p.title)}</span>
                <span class="reddit-post-meta">▲${p.score} · ${p.num_comments} ${t.comments[lang]}</span>
            </a>`).join('');

        const postCountBadge = data.post_count
            ? `<span class="reddit-post-count">${data.post_count} ${t.posts[lang]}</span>`
            : '';

        return `
            <div class="reddit-widget">
                <div class="reddit-widget-header">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="reddit-widget-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="#FF4500" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="10"/>
                                <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.06-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.82 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.55-1.58zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.65a3.59 3.59 0 01-2.85.77 3.59 3.59 0 01-2.85-.77.27.27 0 01.38-.38 3.08 3.08 0 002.47.6 3.08 3.08 0 002.47-.6.27.27 0 01.38.38zm-.17-1.65a1 1 0 111-1 1 1 0 01-1 1z" fill="white"/>
                            </svg>
                        </span>
                        <span class="reddit-widget-title">${t.title[lang]}</span>
                        ${postCountBadge}
                    </div>
                    <button class="section-toggle" data-section="reddit" title="${lang === 'de' ? 'Anzeigen' : 'Expand'}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                </div>
                <div class="section-body" data-section="reddit">
                ${subredditPills ? `<div class="reddit-subreddit-pills">${subredditPills}</div>` : ''}

                ${summary ? `<p class="reddit-summary">${summary}</p>` : ''}

                <div class="reddit-sentiment-bar">
                    <div class="reddit-bar-segment reddit-bar-pos" style="width:${pos}%" title="${t.positive[lang]}: ${pos}%"></div>
                    <div class="reddit-bar-segment reddit-bar-neu" style="width:${neu}%" title="${t.neutral[lang]}: ${neu}%"></div>
                    <div class="reddit-bar-segment reddit-bar-neg" style="width:${neg}%" title="${t.negative[lang]}: ${neg}%"></div>
                </div>
                <div class="reddit-sentiment-labels">
                    <span class="reddit-label-pos">${t.positive[lang]} ${pos}%</span>
                    <span class="reddit-label-neg">${t.negative[lang]} ${neg}%</span>
                </div>

                ${pros.length ? `
                <div class="reddit-pros-cons">
                    <div class="reddit-pros">
                        <span class="reddit-pros-label">${t.pros[lang]}</span>
                        <ul>${pros.map(p => `<li>${this._escapeHtml(p)}</li>`).join('')}</ul>
                    </div>
                    ${cons.length ? `
                    <div class="reddit-cons">
                        <span class="reddit-cons-label">${t.cons[lang]}</span>
                        <ul>${cons.map(c => `<li>${this._escapeHtml(c)}</li>`).join('')}</ul>
                    </div>` : ''}
                </div>` : ''}

                ${topPostsHtml ? `
                <div class="reddit-top-posts">
                    <span class="reddit-top-posts-label">${t.topPosts[lang]}</span>
                    ${topPostsHtml}
                </div>` : ''}
                </div>
            </div>`;
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    setupPriceChartHover(card) {
        const svg = card.querySelector('.price-chart-svg');
        if (!svg) return;

        const dataPointEls = svg.querySelectorAll('.chart-data-point');
        if (!dataPointEls.length) return;

        const points = Array.from(dataPointEls).map(el => ({
            x:     parseFloat(el.getAttribute('data-x')),
            y:     parseFloat(el.getAttribute('data-y')),
            price: parseFloat(el.getAttribute('data-price')),
            date:  el.getAttribute('data-date'),
            isMin: el.getAttribute('data-ismin') === 'true',
            isMax: el.getAttribute('data-ismax') === 'true'
        }));

        const cursorGroup  = svg.querySelector('.chart-cursor-group');
        const hoverPoint   = svg.querySelector('.chart-hover-point');
        const tooltipGroup = svg.querySelector('.chart-tooltip-group');
        const tooltipBg    = svg.querySelector('.chart-tooltip-bg');
        const tooltipPrice = svg.querySelector('.chart-tooltip-price');
        const tooltipDate  = svg.querySelector('.chart-tooltip-date');
        const tooltipBadge = svg.querySelector('.chart-tooltip-badge');
        const overlay      = svg.querySelector('.chart-overlay');

        const W = 300, PAD_LEFT = 22, PAD_TOP = 14, H = 116;
        const lang = this.currentLanguage;

        // Enable smooth CSS transform transition on cursor (#7)
        cursorGroup.style.transition = 'transform 0.08s cubic-bezier(0.4,0,0.2,1)';

        let lastNearest = null;

        overlay.addEventListener('mousemove', (e) => {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

            // Snap to nearest data point by X
            let nearest = points[0], minDist = Infinity;
            for (const p of points) {
                const d = Math.abs(p.x - svgPt.x);
                if (d < minDist) { minDist = d; nearest = p; }
            }
            if (nearest === lastNearest) return;
            lastNearest = nearest;

            // Show cursor — smooth translateX (#7)
            cursorGroup.style.display = '';
            cursorGroup.style.transform = `translateX(${nearest.x}px)`;
            hoverPoint.setAttribute('cy', nearest.y);

            // Tooltip content
            const priceText = nearest.price.toLocaleString('de-DE') + ' €';
            const dateText  = new Date(nearest.date).toLocaleDateString(
                lang === 'de' ? 'de-DE' : 'en-GB',
                { day: 'numeric', month: 'short', year: '2-digit' }
            );
            tooltipPrice.textContent = priceText;
            tooltipDate.textContent  = dateText;

            // Min/max badge (#8)
            let badgeText = '', badgeColor = '#10B981';
            if (nearest.isMin) {
                badgeText  = lang === 'de' ? '🏷 Tiefstpreis' : '🏷 Lowest price';
                badgeColor = '#10B981';
            } else if (nearest.isMax) {
                badgeText  = lang === 'de' ? '↑ Höchstpreis' : '↑ Highest price';
                badgeColor = '#F59E0B';
            }
            tooltipBadge.textContent = badgeText;
            tooltipBadge.setAttribute('fill', badgeColor);

            const hasBadge = !!badgeText;
            const ttW = hasBadge ? 70 : 54;
            const ttH = hasBadge ? 36 : 26;

            // Position tooltip within SVG bounds
            let ttX = nearest.x - ttW / 2;
            if (ttX < PAD_LEFT) ttX = PAD_LEFT;
            if (ttX + ttW > W - 8) ttX = W - 8 - ttW;
            let ttY = nearest.y - ttH - 7;
            if (ttY < PAD_TOP) ttY = nearest.y + 8;

            tooltipGroup.style.display = '';
            tooltipBg.setAttribute('x', ttX);
            tooltipBg.setAttribute('y', ttY);
            tooltipBg.setAttribute('width', ttW);
            tooltipBg.setAttribute('height', ttH);
            tooltipPrice.setAttribute('x', ttX + ttW / 2);
            tooltipPrice.setAttribute('y', ttY + 11);
            tooltipDate.setAttribute('x', ttX + ttW / 2);
            tooltipDate.setAttribute('y', ttY + 21);
            tooltipBadge.setAttribute('x', ttX + ttW / 2);
            tooltipBadge.setAttribute('y', ttY + 31);
        });

        overlay.addEventListener('mouseleave', () => {
            cursorGroup.style.display  = 'none';
            tooltipGroup.style.display = 'none';
            lastNearest = null;
        });
    }

    setupImageGallery(card) {
        const mainImg = card.querySelector('.product-main-image');
        if (!mainImg) return;

        const thumbs = Array.from(card.querySelectorAll('.product-thumb'));
        const urls = thumbs.length ? thumbs.map(t => t.src) : [mainImg.src];
        let current = 0;

        const goTo = (index) => {
            current = (index + urls.length) % urls.length;
            mainImg.src = urls[current];
            thumbs.forEach((t, i) => t.classList.toggle('active', i === current));
        };

        // Thumbnail clicks
        thumbs.forEach((thumb, i) => {
            thumb.addEventListener('click', () => goTo(i));
        });

        // Prev / Next arrows
        const prevBtn = card.querySelector('.img-nav-prev');
        const nextBtn = card.querySelector('.img-nav-next');
        if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

        // Expand / lightbox
        const expandBtn = card.querySelector('.img-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                this._openLightbox(urls, current, (i) => { current = i; goTo(i); });
            });
        }
    }

    _ensureLightbox() {
        if (document.getElementById('img-lightbox')) return;
        const lb = document.createElement('div');
        lb.id = 'img-lightbox';
        lb.innerHTML = `
            <div class="lb-backdrop"></div>
            <div class="lb-content">
                <button class="lb-close" aria-label="Close">&#10005;</button>
                <button class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>
                <img class="lb-img" src="" alt="">
                <button class="lb-nav lb-next" aria-label="Next">&#8250;</button>
                <div class="lb-dots"></div>
            </div>
        `;
        document.body.appendChild(lb);

        lb.querySelector('.lb-backdrop').addEventListener('click', () => lb.classList.remove('open'));
        lb.querySelector('.lb-close').addEventListener('click', () => lb.classList.remove('open'));
        document.addEventListener('keydown', (e) => {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') lb.classList.remove('open');
            if (e.key === 'ArrowLeft') lb.querySelector('.lb-prev').click();
            if (e.key === 'ArrowRight') lb.querySelector('.lb-next').click();
        });
    }

    _openLightbox(urls, startIndex, onNavigate) {
        this._ensureLightbox();
        const lb = document.getElementById('img-lightbox');
        const img = lb.querySelector('.lb-img');
        const dots = lb.querySelector('.lb-dots');
        let cur = startIndex;

        const render = () => {
            img.src = urls[cur];
            dots.innerHTML = urls.map((_, i) =>
                `<span class="lb-dot${i === cur ? ' active' : ''}"></span>`
            ).join('');
        };

        lb.querySelector('.lb-prev').onclick = () => { cur = (cur - 1 + urls.length) % urls.length; render(); onNavigate(cur); };
        lb.querySelector('.lb-next').onclick = () => { cur = (cur + 1) % urls.length; render(); onNavigate(cur); };

        render();
        lb.classList.add('open');
    }

    setupTabSwitching(card, cardIndex) {
        const tabButtons = card.querySelectorAll('.tab-button');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // Switch tabs on ALL cards simultaneously
                const allCards = document.querySelectorAll('.product-card');
                allCards.forEach((productCard, index) => {
                    const cardTabButtons = productCard.querySelectorAll('.tab-button');
                    const cardTabContents = productCard.querySelectorAll('.tab-content');

                    // Remove active from all tabs in this card
                    cardTabButtons.forEach(btn => btn.classList.remove('active'));
                    cardTabContents.forEach(content => content.classList.remove('active'));

                    // Add active to the matching tab
                    const matchingButton = productCard.querySelector(`.tab-button[data-tab="${tabName}"]`);
                    if (matchingButton) {
                        matchingButton.classList.add('active');
                    }

                    const targetContent = productCard.querySelector(`[data-content="${tabName}"][data-card-index="${index}"]`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                });

                // Sync spec row heights when Produktdaten tab becomes visible
                if (tabName === 'produktdaten') {
                    requestAnimationFrame(() => this.synchronizeSpecRows());
                }
            });
        });
    }

    formatLabel(key) {
        return key.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatCategoryLabel(key) {
        const labels = {
            smartwatch_fitness:   { de: 'Smartwatch & Fitnesstrackers', en: 'Smartwatch & Fitness Trackers' },
            recovery_sleep:       { de: 'Recovery & Sleep',             en: 'Recovery & Sleep' },
            heart_rate_monitors:  { de: 'Herzfrequenzmesser',           en: 'Heart Rate Monitors' },
            home_health:          { de: 'Heimgesundheit',               en: 'Home Health' },
            metabolic_monitors:   { de: 'Metabolische Monitore',        en: 'Metabolic Monitors' },
            womens_health:        { de: 'Frauen Health Tech',           en: "Women's Health Tech" },
        };
        const entry = labels[key];
        if (entry) return entry[this.currentLanguage] || entry.de;
        return this.formatLabel(key);
    }
}

// Language switching function
function switchLanguage(lang) {
    // Store preference
    localStorage.setItem('verifyr-lang', lang);

    // Update active state
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-lang') === lang) {
            option.classList.add('active');
        }
    });

    // Reload page to apply new language
    window.location.reload();
}

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

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ResultsController();

    // Update user display
    updateUserDisplay();

    // Show admin button if user is admin
    const isAdmin = localStorage.getItem('verifyr_is_admin') === 'true';
    if (isAdmin) {
        const adminBtn = document.querySelector('.admin-only');
        if (adminBtn) {
            adminBtn.style.display = 'flex';
        }
    }
});

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    // Hamburger menu toggle
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

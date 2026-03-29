/**
 * Verifyr Admin Dashboard - Frontend Logic
 *
 * Handles admin dashboard functionality including:
 * - Stats display
 * - User listing
 * - Conversation listing
 * - Authentication checks
 */

// Configuration - dynamically use current domain or localhost for development
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : window.location.origin;

// Authentication state
let supabaseClient = null;
let currentSession = null;
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

/**
 * Initialize admin dashboard
 */
async function init() {
    // Check authentication and admin status
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
        return; // Redirect will happen in checkAdminAuth
    }

    // Display admin email
    const adminEmail = document.getElementById('adminEmail');
    const email = localStorage.getItem('verifyr_user_email');
    if (adminEmail && email) {
        adminEmail.textContent = email;
    }

    // Update sidebar user display
    updateUserDisplay();

    // Load initial data
    loadStats();
    loadConversations();
}

/**
 * Clear authentication data from localStorage
 */
function clearAuthData() {
    localStorage.removeItem('verifyr_access_token');
    localStorage.removeItem('verifyr_user_id');
    localStorage.removeItem('verifyr_user_email');
    localStorage.removeItem('verifyr_is_admin');
}

/**
 * Check authentication and admin status
 */
async function checkAdminAuth() {
    try {
        // Load config from backend
        const configResponse = await fetch(`${API_BASE_URL}/config`);
        if (configResponse.ok) {
            const config = await configResponse.json();
            SUPABASE_URL = config.supabase_url;
            SUPABASE_ANON_KEY = config.supabase_anon_key;
        }

        // Initialize Supabase client
        if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Sync sign-out across tabs in real-time
            supabaseClient.auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT') {
                    clearAuthData();
                    window.location.href = '/auth.html';
                }
            });

            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session) {
                currentSession = session;
                localStorage.setItem('verifyr_access_token', session.access_token);

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

                if (!isAdmin) {
                    // Not an admin, redirect to chat
                    console.log('Not an admin, redirecting to chat...');
                    window.location.href = '/chat.html';
                    return false;
                }

                return true;
            }
        }

        // Check localStorage fallback
        const storedToken = localStorage.getItem('verifyr_access_token');
        const storedIsAdmin = localStorage.getItem('verifyr_is_admin');

        if (storedToken && storedIsAdmin === 'true') {
            // SECURITY: Validate token format before using
            const tokenParts = storedToken.split('.');
            if (tokenParts.length !== 3) {
                console.warn('Invalid token format');
                clearAuthData();
                window.location.href = '/auth.html';
                return false;
            }

            // Verify by calling admin endpoint (server-side validation)
            const testResponse = await fetch(`${API_BASE_URL}/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });

            if (testResponse.ok) {
                return true;
            } else if (testResponse.status === 403) {
                // Not admin
                window.location.href = '/chat.html';
                return false;
            }
        }

        // Not authenticated
        window.location.href = '/auth.html';
        return false;

    } catch (error) {
        console.error('Admin auth check error:', error);
        window.location.href = '/auth.html';
        return false;
    }
}

/**
 * Get access token for API calls
 */
function getAccessToken() {
    if (currentSession) {
        return currentSession.access_token;
    }
    return localStorage.getItem('verifyr_access_token');
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load stats');
        }

        const stats = await response.json();

        document.getElementById('statUsers').textContent = stats.unique_users || 0;
        document.getElementById('statConversations').textContent = stats.total_conversations || 0;
        document.getElementById('statMessages').textContent = stats.total_messages || 0;
        document.getElementById('statProducts').textContent = stats.products_available || 0;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Load conversations list
 */
async function loadConversations() {
    const container = document.getElementById('conversationsTableContainer');

    try {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading conversations...</p>
            </div>
        `;

        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }

        const data = await response.json();
        const conversations = data.conversations || [];

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No conversations found</p>
                </div>
            `;
            return;
        }

        let tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Conversation ID</th>
                        <th>User</th>
                        <th>Messages</th>
                        <th>Created</th>
                        <th>Updated</th>
                    </tr>
                </thead>
                <tbody>
        `;

        conversations.forEach(conv => {
            const userId = conv.user_id || 'anonymous';
            const userBadge = userId === 'anonymous'
                ? '<span class="badge badge-anonymous">Anonymous</span>'
                : `<span class="badge badge-user">${escapeHtml(conv.user_email || userId)}</span>`;

            tableHtml += `
                <tr>
                    <td class="user-id">${escapeHtml(conv.conversation_id)}</td>
                    <td>${userBadge}</td>
                    <td>${conv.message_count || 0}</td>
                    <td>${formatDate(conv.created_at)}</td>
                    <td>${formatDate(conv.updated_at)}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

    } catch (error) {
        console.error('Error loading conversations:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading conversations: ${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Load users list
 */
async function loadUsers() {
    const container = document.getElementById('usersTableContainer');

    try {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        `;

        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();
        const users = data.users || [];

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        let tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>${data.source === 'supabase' ? 'Created' : 'Conversations'}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const isAdmin = user.is_admin === true;
            const roleBadge = isAdmin
                ? '<span class="badge badge-admin">Admin</span>'
                : '<span class="badge badge-user">User</span>';

            const lastCol = data.source === 'supabase'
                ? formatDate(user.created_at)
                : (user.conversation_count || 0);

            tableHtml += `
                <tr>
                    <td class="user-id">${escapeHtml(user.id)}</td>
                    <td>${escapeHtml(user.email || '-')}</td>
                    <td>${roleBadge}</td>
                    <td>${lastCol}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading users: ${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Show tab
 */
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Load data for the tab
    if (tabName === 'conversations') {
        loadConversations();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'scraper') {
        loadScraperProducts();
    } else if (tabName === 'reddit') {
        loadRedditProducts();
    } else if (tabName === 'systemStatus') {
        loadSystemStatus();
    }
}

// ============================================================
// Web Scraper
// ============================================================

const _scraperProductMeta = {};

async function loadScraperProducts() {
    const select = document.getElementById('scraperProduct');
    if (!select) return;
    if (select.dataset.loaded === 'true') return;

    try {
        const token = localStorage.getItem('verifyr_access_token');
        const res = await fetch(`${API_BASE_URL}/products/metadata`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        // Also populate manual entry dropdown
        const manualSelect = document.getElementById('manualProduct');
        if (manualSelect) manualSelect.innerHTML = '<option value="">Select a product...</option>';

        select.innerHTML = '<option value="">Select a product...</option>';
        (data.products || []).forEach(p => {
            _scraperProductMeta[p.id] = p;
            const label = p.display_name?.de || p.display_name?.en || p.id;
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = label;
            select.appendChild(opt);
            // Mirror into manual entry dropdown
            if (manualSelect) {
                const mOpt = document.createElement('option');
                mOpt.value = p.id;
                mOpt.textContent = label;
                manualSelect.appendChild(mOpt);
            }
        });
        select.dataset.loaded = 'true';
    } catch (e) {
        select.innerHTML = '<option value="">Error loading products</option>';
    }
}

function _getAsinForProduct(productId) {
    const product = _scraperProductMeta[productId];
    const amazonUrl = product?.amazon_url || '';
    const match = amazonUrl.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
}

function onScraperProductChange() {
    const productId = document.getElementById('scraperProduct').value;
    const hintEl    = document.getElementById('scraperUrlHint');

    if (!productId) {
        document.getElementById('scraperUrl').value = '';
        if (hintEl) hintEl.textContent = 'Select a product — URL is auto-filled for Amazon products.';
        return;
    }

    _fillAmazonUrl();
    onScraperUrlChange();
}

function onScraperEngineChange() {
    // Re-fill Amazon URL when engine changes (review URL vs product page URL)
    const productId = document.getElementById('scraperProduct').value;
    if (productId && _getAsinForProduct(productId)) {
        _fillAmazonUrl();
    }
    _updateScraperPagesAndHint();
}

function _fillAmazonUrl() {
    const productId = document.getElementById('scraperProduct').value;
    const urlInput  = document.getElementById('scraperUrl');
    const hintEl    = document.getElementById('scraperUrlHint');
    const engine    = document.getElementById('scraperEngine')?.value || 'auto';

    const asin = _getAsinForProduct(productId);
    if (!asin) {
        urlInput.value = '';
        if (hintEl) hintEl.textContent = 'No amazon_url found — enter a URL manually.';
        return;
    }

    const usePlaywright = engine === 'playwright';
    if (usePlaywright) {
        // Product page: accessible without login, shows rating + top reviews
        urlInput.value = `https://www.amazon.de/dp/${asin}`;
        if (hintEl) hintEl.textContent = `ASIN ${asin} — product page (Playwright). Rating, specs & top reviews.`;
    } else {
        // Review page: Firecrawl (or auto)
        urlInput.value = `https://www.amazon.de/product-reviews/${asin}`;
        if (hintEl) hintEl.textContent = `ASIN ${asin} — review page (Firecrawl). 1 credit/page.`;
    }

    document.getElementById('scraperSource').value = 'Amazon.de';
}

function _scraperUsesFirecrawl() {
    const engine = document.getElementById('scraperEngine')?.value || 'auto';
    if (engine === 'firecrawl') return true;
    if (engine === 'playwright') return false;
    // auto: firecrawl only for amazon.de
    try {
        const url = document.getElementById('scraperUrl').value.trim();
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        return hostname === 'amazon.de' || hostname.endsWith('.amazon.de');
    } catch (_) { return false; }
}

function onScraperUrlChange() {
    const url = document.getElementById('scraperUrl').value.trim();
    const sourceInput = document.getElementById('scraperSource');
    const pagesField  = document.getElementById('scraperPagesField');
    const hintEl      = document.getElementById('scraperUrlHint');

    if (!url) return;

    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const isAmazon = hostname === 'amazon.de' || hostname.endsWith('.amazon.de');

        // Always auto-fill source name from domain
        const domainLabel = hostname.split('.').slice(-2).join('.');
        const capitalised = domainLabel.charAt(0).toUpperCase() + domainLabel.slice(1);
        sourceInput.value = isAmazon ? 'Amazon.de' : capitalised;

        // Update engine default for Amazon
        const engineSelect = document.getElementById('scraperEngine');
        if (engineSelect && engineSelect.value === 'auto') {
            // keep auto — just update the display
        }

        _updateScraperPagesAndHint();
    } catch (_) {
        // Invalid URL while typing — ignore
    }
}

function onScraperEngineChange() {
    _updateScraperPagesAndHint();
}

function _updateScraperPagesAndHint() {
    const pagesField = document.getElementById('scraperPagesField');
    const hintEl     = document.getElementById('scraperUrlHint');
    const usesFirecrawl = _scraperUsesFirecrawl();

    if (pagesField) pagesField.style.display = usesFirecrawl ? '' : 'none';

    if (hintEl) {
        hintEl.textContent = usesFirecrawl
            ? 'Scraper: Firecrawl (1 credit/page).'
            : 'Scraper: Playwright — headless Chromium, 0 credits.';
    }
}

async function handleScrape(event) {
    event.preventDefault();

    const url       = document.getElementById('scraperUrl').value.trim();
    const productId = document.getElementById('scraperProduct').value;
    const source    = document.getElementById('scraperSource').value.trim();
    const maxPages  = parseInt(document.getElementById('scraperPages').value);
    const force     = document.getElementById('scraperForce').checked;
    const scraper   = document.getElementById('scraperEngine')?.value || 'auto';

    const btn     = document.getElementById('scraperSubmitBtn');
    const msgEl   = document.getElementById('scraperMessage');
    const resultEl = document.getElementById('scraperResult');

    // Reset UI
    msgEl.className = 'form-message';
    msgEl.style.display = 'none';
    resultEl.style.display = 'none';
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const token = localStorage.getItem('verifyr_access_token');
        const res = await fetch(`${API_BASE_URL}/admin/ingest-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                url,
                product_id: productId,
                doc_type: 'review',
                source_name: source,
                max_pages: maxPages,
                force,
                scraper
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || `Error ${res.status}`);
        }

        // Show result card
        document.getElementById('scraperResultGrid').innerHTML = `
            <div class="scraper-result-item"><span>File saved</span>${data.file_saved}</div>
            <div class="scraper-result-item"><span>Scraper</span>${data.scraper_used}</div>
            <div class="scraper-result-item"><span>Word count</span>${data.word_count.toLocaleString('de-DE')}</div>
            <div class="scraper-result-item"><span>Credits used</span>${data.credits_used}</div>
            ${data.amazon_rating != null ? `<div class="scraper-result-item"><span>Amazon rating</span>⭐ ${data.amazon_rating}</div>` : ''}
            ${data.amazon_review_count != null ? `<div class="scraper-result-item"><span>Review count</span>${data.amazon_review_count.toLocaleString('de-DE')}</div>` : ''}
            <div class="scraper-result-item"><span>Language detected</span>${data.language_detected}</div>
        `;
        resultEl.style.display = 'block';

    } catch (e) {
        msgEl.textContent = e.message;
        msgEl.className = 'form-message error';
        msgEl.style.display = 'block';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function updateManualWordCount() {
    const text = document.getElementById('manualContent').value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const el = document.getElementById('manualContentCount');
    if (!el) return;
    el.textContent = `${words.toLocaleString('de-DE')} words`;
    el.style.color = words > 500 ? 'var(--warning, #f59e0b)' : 'var(--text-muted, #888)';
    el.title = words > 500 ? 'Only the first 500 words are used for sentiment analysis' : '';
}

function clearManualForm() {
    document.getElementById('manualIngestForm').reset();
    updateManualWordCount();
    document.getElementById('manualMessage').textContent = '';
    document.getElementById('manualResult').style.display = 'none';
}

async function handleManualIngest(event) {
    event.preventDefault();

    const productId    = document.getElementById('manualProduct').value;
    const source       = document.getElementById('manualSource').value.trim();
    const rating       = parseFloat(document.getElementById('manualRating').value) || null;
    const reviewCount  = parseInt(document.getElementById('manualReviewCount').value) || null;
    const price        = document.getElementById('manualPrice').value.trim() || null;
    const productUrl   = document.getElementById('manualProductUrl').value.trim() || null;
    const content      = document.getElementById('manualContent').value.trim();
    const force        = document.getElementById('manualForce').checked;

    const btn      = document.getElementById('manualSubmitBtn');
    const msgEl    = document.getElementById('manualMessage');
    const resultEl = document.getElementById('manualResult');

    msgEl.className = 'form-message';
    msgEl.style.display = 'none';
    resultEl.style.display = 'none';
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const token = localStorage.getItem('verifyr_access_token');
        const res = await fetch(`${API_BASE_URL}/admin/ingest-manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                product_id: productId,
                source_name: source,
                content,
                amazon_rating: rating,
                amazon_review_count: reviewCount,
                amazon_price: price,
                product_url: productUrl,
                force
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);

        const s = data.sentiment;
        document.getElementById('manualResultGrid').innerHTML = `
            <div class="scraper-result-item"><span>File saved</span>${data.file_saved}</div>
            <div class="scraper-result-item"><span>Word count</span>${data.word_count.toLocaleString('de-DE')}</div>
            <div class="scraper-result-item"><span>Language</span>${data.language_detected}</div>
            ${s ? `<div class="scraper-result-item"><span>Sentiment</span>${s.positive_pct}% positive · ${s.neutral_pct}% neutral · ${s.negative_pct}% negative</div>` : ''}
            ${s?.summary ? `<div class="scraper-result-item" style="grid-column:1/-1"><span>Summary</span>${s.summary}</div>` : ''}
        `;
        resultEl.style.display = 'block';

    } catch (e) {
        msgEl.textContent = e.message;
        msgEl.className = 'form-message error';
        msgEl.style.display = 'block';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}


// ============================================================
// Reddit Analysis
// ============================================================

const _redditProductMeta = {};

async function loadRedditProducts() {
    const select = document.getElementById('redditProduct');
    if (!select) return;
    if (select.dataset.loaded === 'true') return;

    try {
        const token = localStorage.getItem('verifyr_access_token');
        const res = await fetch(`${API_BASE_URL}/products/metadata`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();

        select.innerHTML = '<option value="">Select a product...</option>';
        (data.products || []).forEach(p => {
            _redditProductMeta[p.id] = p;
            const label = p.display_name?.en || p.display_name?.de || p.id;
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = label;
            select.appendChild(opt);
        });
        select.dataset.loaded = 'true';
    } catch (e) {
        select.innerHTML = '<option value="">Error loading products</option>';
    }
}

function onRedditProductChange() {
    const productId = document.getElementById('redditProduct').value;
    const searchInput = document.getElementById('redditSearchTerm');
    const hintEl = document.getElementById('redditSearchHint');

    if (!productId) {
        searchInput.value = '';
        if (hintEl) hintEl.textContent = 'Select a product to auto-fill the search term.';
        return;
    }

    const product = _redditProductMeta[productId];
    const name = product?.reddit_search_term
        || product?.display_name?.en
        || product?.display_name?.de
        || productId;
    searchInput.value = name;

    if (hintEl) {
        const subreddits = product?.reddit_subreddits || [];
        const hint = subreddits.length
            ? subreddits.map(s => `r/${s}`).join(', ')
            : _getSubredditHint(productId);
        hintEl.textContent = `Will search: ${hint}`;
    }
}

function _getSubredditHint(productId) {
    const pid = productId.toLowerCase();
    if (pid.includes('apple_watch')) return 'r/AppleWatch';
    if (pid.includes('garmin')) return 'r/Garmin';
    if (pid.includes('oura_ring')) return 'r/ouraring';
    if (pid.includes('whoop')) return 'r/whoop';
    if (pid.includes('ringconn')) return 'r/RingConn';
    if (pid.includes('amazfit')) return 'r/amazfit';
    return 'r/AppleWatch, r/Garmin, r/ouraring, r/whoop, r/RingConn, r/amazfit';
}

async function handleRedditScrape(event) {
    event.preventDefault();

    const productId = document.getElementById('redditProduct').value;
    const searchTerm = document.getElementById('redditSearchTerm').value.trim();
    const maxPosts = parseInt(document.getElementById('redditMaxPosts').value);

    const btn = document.getElementById('redditSubmitBtn');
    const msgEl = document.getElementById('redditMessage');
    const resultEl = document.getElementById('redditResult');

    msgEl.className = 'form-message';
    msgEl.style.display = 'none';
    resultEl.style.display = 'none';
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const token = localStorage.getItem('verifyr_access_token');
        const res = await fetch(`${API_BASE_URL}/admin/scrape-reddit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                product_id: productId,
                product_name: searchTerm,
                max_posts: maxPosts
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);

        document.getElementById('redditResultGrid').innerHTML = `
            <div class="scraper-result-item"><span>Product</span>${escapeHtml(productId)}</div>
            <div class="scraper-result-item"><span>Posts fetched</span>${data.post_count}</div>
            <div class="scraper-result-item" style="grid-column:1/-1"><span>Subreddits found</span>${data.subreddits_found.join(', ') || '—'}</div>
            ${data.sentiment_summary ? `<div class="scraper-result-item" style="grid-column:1/-1"><span>Sentiment summary</span>${escapeHtml(data.sentiment_summary)}</div>` : ''}
        `;
        resultEl.style.display = 'block';

    } catch (e) {
        msgEl.textContent = e.message;
        msgEl.className = 'form-message error';
        msgEl.style.display = 'block';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        // Clear localStorage
        localStorage.removeItem('verifyr_access_token');
        localStorage.removeItem('verifyr_user_id');
        localStorage.removeItem('verifyr_user_email');
        localStorage.removeItem('verifyr_is_admin');

        window.location.href = '/auth.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/auth.html';
    }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('show');
    }
}

/**
 * Update user email display and login/logout button (sidebar + mobile)
 * Admin page doesn't have language switcher, so we use English by default
 */
function updateUserDisplay() {
    const userEmail = localStorage.getItem('verifyr_user_email');

    // Sidebar elements
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    const sidebarAuthBtn = document.getElementById('sidebarAuthBtn');

    // Mobile elements
    const mobileUserEmail = document.getElementById('mobileUserEmail');
    const mobileAuthBtn = document.getElementById('mobileAuthBtn');

    if (userEmail) {
        // User is logged in - show email and logout button

        // Sidebar
        if (sidebarUserEmail) {
            sidebarUserEmail.textContent = userEmail;
            sidebarUserEmail.style.display = 'block';
        }
        if (sidebarAuthBtn) {
            sidebarAuthBtn.textContent = 'Logout';
            sidebarAuthBtn.onclick = handleLogout;
            sidebarAuthBtn.classList.remove('sidebar-login-btn');
            sidebarAuthBtn.classList.add('sidebar-logout-btn');
        }

        // Mobile
        if (mobileUserEmail) {
            mobileUserEmail.textContent = userEmail;
            mobileUserEmail.style.display = 'block';
        }
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = 'Logout';
            mobileAuthBtn.onclick = handleLogout;
            mobileAuthBtn.classList.remove('mobile-login-btn');
            mobileAuthBtn.classList.add('mobile-logout-btn');
        }
    } else {
        // User is not logged in - hide email, show login button

        // Sidebar
        if (sidebarUserEmail) {
            sidebarUserEmail.style.display = 'none';
        }
        if (sidebarAuthBtn) {
            sidebarAuthBtn.textContent = 'Login';
            sidebarAuthBtn.onclick = () => window.location.href = '/auth.html';
            sidebarAuthBtn.classList.remove('sidebar-logout-btn');
            sidebarAuthBtn.classList.add('sidebar-login-btn');
        }

        // Mobile
        if (mobileUserEmail) {
            mobileUserEmail.style.display = 'none';
        }
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = 'Login';
            mobileAuthBtn.onclick = () => window.location.href = '/auth.html';
            mobileAuthBtn.classList.remove('mobile-logout-btn');
            mobileAuthBtn.classList.add('mobile-login-btn');
        }
    }
}

/**
 * Format date for display
 */
function formatDate(isoString) {
    if (!isoString) return '-';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show invite user modal
 */
function showInviteUserModal() {
    const modal = document.getElementById('inviteUserModal');
    modal.classList.add('active');

    // Clear previous data
    document.getElementById('inviteEmail').value = '';
    const messageEl = document.getElementById('inviteMessage');
    messageEl.textContent = '';
    messageEl.className = 'form-message';
}

/**
 * Hide invite user modal
 */
function hideInviteUserModal() {
    const modal = document.getElementById('inviteUserModal');
    modal.classList.remove('active');
}

/**
 * Handle invite user form submission
 */
async function handleInviteUser(event) {
    event.preventDefault();

    const email = document.getElementById('inviteEmail').value.trim();
    const messageEl = document.getElementById('inviteMessage');
    const submitBtn = document.getElementById('inviteSubmitBtn');

    if (!email) {
        messageEl.textContent = 'Please enter a valid email address.';
        messageEl.className = 'form-message error';
        return;
    }

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/invite-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            messageEl.textContent = data.message || `Invitation sent to ${email}`;
            messageEl.className = 'form-message success';

            // Clear form
            document.getElementById('inviteEmail').value = '';

            // Refresh users list
            setTimeout(() => {
                loadUsers();
                hideInviteUserModal();
            }, 2000);

        } else if (response.status === 409) {
            // User already exists
            messageEl.textContent = data.detail || 'User already exists';
            messageEl.className = 'form-message error';
        } else {
            // Other error
            messageEl.textContent = data.detail || 'Failed to send invitation';
            messageEl.className = 'form-message error';
        }

    } catch (error) {
        console.error('Error inviting user:', error);
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'form-message error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// ============================================================
// System Status
// ============================================================

const STATUS_META = {
    server:    { label: 'VPS / Server'        },
    qdrant:    { label: 'Qdrant (Vector DB)'  },
    bm25:      { label: 'BM25 Index'          },
    supabase:  { label: 'Supabase (Auth/DB)'  },
    langfuse:  { label: 'Langfuse'            },
    posthog:   { label: 'PostHog Analytics'   },
    openai:    { label: 'OpenAI API'          },
    anthropic: { label: 'Anthropic API'       },
    google:    { label: 'Google AI API'       },
};

function renderStatusCards(data) {
    const grid = document.getElementById('statusGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(STATUS_META).map(([key, meta]) => {
        const svc = data[key] || { status: 'error', latency_ms: 0, message: 'No data' };
        const st = svc.status;
        const badgeLabel = st === 'ok' ? 'Connected' : st === 'unconfigured' ? 'Not configured' : 'Error';
        const latencyStr = svc.latency_ms > 0 ? `${svc.latency_ms} ms` : '';

        return `
            <div class="status-card">
                <div class="status-dot ${st}"></div>
                <div class="status-card-body">
                    <div class="status-card-name">${meta.label}</div>
                    <div class="status-card-badge ${st}">${badgeLabel}</div>
                    <div class="status-card-msg">${svc.message || ''}</div>
                    ${latencyStr ? `<div class="status-card-latency">⏱ ${latencyStr}</div>` : ''}
                </div>
            </div>`;
    }).join('');
}

function renderStatusSkeleton() {
    const grid = document.getElementById('statusGrid');
    if (!grid) return;
    grid.innerHTML = Object.values(STATUS_META).map(meta => `
        <div class="status-card">
            <div class="status-dot checking"></div>
            <div class="status-card-body">
                <div class="status-card-name">${meta.label}</div>
                <div class="status-card-badge checking">Checking…</div>
            </div>
        </div>`).join('');
}

async function loadSystemStatus() {
    renderStatusSkeleton();
    document.getElementById('statusLastChecked').textContent = '';

    try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/system-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        renderStatusCards(data);

        const now = new Date();
        document.getElementById('statusLastChecked').textContent =
            `Last checked: ${now.toLocaleTimeString()}`;

    } catch (error) {
        console.error('System status error:', error);
        const grid = document.getElementById('statusGrid');
        if (grid) grid.innerHTML = `<div style="padding:var(--spacing-xl);color:var(--gray);">Failed to load status: ${error.message}</div>`;
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobileMenu');
    const hamburgerBtn = document.querySelector('.hamburger-btn');

    if (mobileMenu && hamburgerBtn &&
        !mobileMenu.contains(e.target) &&
        !hamburgerBtn.contains(e.target)) {
        mobileMenu.classList.remove('show');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

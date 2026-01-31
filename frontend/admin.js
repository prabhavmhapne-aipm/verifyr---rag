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

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

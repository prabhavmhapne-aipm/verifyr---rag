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

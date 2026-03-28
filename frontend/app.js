/**
 * Verifyr Chat Interface - Frontend Logic
 *
 * Handles user interactions, API calls, and message display
 * Integrated with Verifyr design system
 * Includes Supabase authentication
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

// Langfuse feedback — track the last trace ID for feedback submission
let lastQueryId = null;

// Quiz label maps — mirrors frontend/quiz/data/categories.json, use-cases.json, features.json, budget.js
const QUIZ_CATEGORY_LABELS = {
    "smartwatch_fitness": { en: "Smartwatch & Fitness Trackers", de: "Smartwatch & Fitnesstrackers" },
    "recovery_sleep":     { en: "Recovery & Sleep",              de: "Recovery & Sleep" },
    "heart_rate_monitors":{ en: "Heart Rate Monitors",           de: "Herzfrequenzmesser" },
    "sport_earbuds":      { en: "Sport Earbuds",                 de: "Sport Earbuds" },
    "metabolic_monitors": { en: "Metabolic Monitors",            de: "Metabolische Monitore" },
    "womens_health":      { en: "Women's Health Tech",           de: "Frauen Health Tech" }
};

const QUIZ_USE_CASE_LABELS = {
    "lifestyle_fitness":      { en: "Lifestyle & Fitness",        de: "Lifestyle & Fitness" },
    "running_cycling":        { en: "Running & Cycling",          de: "Laufen & Fahrradfahren" },
    "hiking":                 { en: "Hiking",                     de: "Wandern" },
    "swimming":               { en: "Swimming",                   de: "Schwimmen" },
    "health_wellbeing":       { en: "Health & Wellbeing",         de: "Health & Wellbeing" },
    "competition_performance":{ en: "Competition & Performance",  de: "Wettkampf & Leistung" }
};

const QUIZ_FEATURE_LABELS = {
    "light_comfortable":    { en: "Light & Comfortable",          de: "Leicht & Komfortabel" },
    "long_battery":         { en: "Long Battery Life",            de: "Lange Akkulaufzeit" },
    "water_resistance":     { en: "Waterproof & Robust",          de: "Wasserdicht & Robust" },
    "gps_accuracy":         { en: "Precise GPS & Sensors",        de: "Präzise GPS & Sensoren" },
    "smartphone_independent":{ en: "Smartphone Independent",      de: "Smartphone unabhängig" },
    "app_ecosystem":        { en: "App Integration & Ecosystem",  de: "App Integration & Ecosystem" },
    "design_modern":        { en: "Digital, Smart & Modern",      de: "Digital, Smart & Modern" },
    "design_classic":       { en: "Analog, Smart & Classic",      de: "Analog, Smart & Klassich" },
    "with_display":         { en: "With Display",                 de: "Mit Display" },
    "no_display":           { en: "Without Display / Discreet",   de: "Ohne Display / Diskret" },
    "sleep_monitor":        { en: "Sleep Monitor",                de: "Sleep Monitor" },
    "stress_monitor":       { en: "Body / Stress Monitor",        de: "Body / Stress Monitor" },
    "ecg_hrv":              { en: "ECG / HRV Monitor",            de: "EKG / HRV Monitor" },
    "vo2_max":              { en: "VO2 Max Tracker",              de: "VO2 Max Tracker" }
};


/**
 * Reads verifyr_quiz_answers from localStorage and returns a
 * human-readable profile string in the current language, or null if no quiz data exists.
 */
function getQuizProfileString() {
    try {
        const raw = localStorage.getItem('verifyr_quiz_answers');
        if (!raw) return null;
        const qa = JSON.parse(raw);
        if (!qa || !qa.category) return null;

        const lang = currentLanguage || 'de';
        const resolve = (map, id) => (map[id] && map[id][lang]) || (map[id] && map[id]['en']) || id;

        const category = resolve(QUIZ_CATEGORY_LABELS, qa.category);
        const useCases = (qa.useCases || []).map(id => resolve(QUIZ_USE_CASE_LABELS, id)).join(', ');
        const features = (qa.features || []).map(id => resolve(QUIZ_FEATURE_LABELS, id)).join(', ');

        const parts = [`Category: ${category}`];
        if (useCases) parts.push(`Use Cases: ${useCases}`);
        if (qa.budget_min != null && qa.budget_max != null) parts.push(`Budget: €${qa.budget_min}–€${qa.budget_max}`);
        if (features) parts.push(`Feature Priorities: ${features}`);
        if (qa.special_request) parts.push(`Special Request: ${qa.special_request}`);

        return parts.join(' | ');
    } catch (e) {
        console.warn('Could not read quiz profile from localStorage:', e);
        return null;
    }
}

// Unified Translations - Single source of truth for all UI text
const TRANSLATIONS = {
    de: {
        // Header
        heroBadge: "Dein vertrauensvoller KI-Produktberater",
        logout: "Abmelden",

        // Sidebar
        menu: "Menu",
        model: "Model:",
        conversations: "Konversationen",
        newConversation: "+ Neue Konversation",

        // Chat
        welcomeMessage: "Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?",
        placeholder: "Frag nach Produkteigenschaften...",
        sendButton: "↑",

        // Quick Replies
        quickReplies: [
            { text: "Akkulaufzeit", query: "Wie ist der Akku-Vergleich?" },
            { text: "Beste zum Laufen", query: "Welche Uhr ist besser zum Laufen?" },
            { text: "Wasserdichtigkeit", query: "Vergleiche die Wasserdichtigkeit" },
            { text: "Hauptunterschiede", query: "Was sind die wichtigsten Unterschiede?" }
        ],

        // Footer
        inputNote: "Enter zum Senden",
        beta: "BETA - Verifyr nutzt KI und kann Fehler machen. Bitte überprüfe die Antworten."
    },
    en: {
        // Header
        heroBadge: "Your trusted AI Product Recommender",
        logout: "Logout",

        // Sidebar
        menu: "Menu",
        model: "Model:",
        conversations: "Conversations",
        newConversation: "+ New Conversation",

        // Chat
        welcomeMessage: "Hello! How can I help you? I'm happy to help with all questions about products. What would you like to know?",
        placeholder: "Ask about product features...",
        sendButton: "↑",

        // Quick Replies
        quickReplies: [
            { text: "Battery Life", query: "What is the battery life comparison?" },
            { text: "Best for Running", query: "Which watch is better for running?" },
            { text: "Waterproof Ratings", query: "Compare the waterproof ratings" },
            { text: "Key Differences", query: "What are the key differences?" }
        ],

        // Footer
        inputNote: "Press Enter to send",
        beta: "BETA - Verifyr uses AI and can make mistakes. Please double-check responses for accuracy."
    }
};

// DOM Elements
let chatInput;
let sendButton;
let chatMessages;
let quickReplies;
let modelSelector;
let inputNote;
let conversationSidebar;
let conversationsList;

// State
let isLoading = false;
let currentLanguage = localStorage.getItem('verifyr-lang') || 'de'; // Sync with global language
let selectedModel = 'gpt-5-mini'; // Default matches HTML, will be synced in init()

// Conversation Management State
let currentConversationId = null;
let conversations = {}; // Object mapping conversation_id -> conversation data
let conversationHistory = []; // Array of {role, content} for current conversation

/**
 * Initialize the chat interface
 */
async function init() {
    // Get DOM elements first (needed for all cases)
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    chatMessages = document.getElementById('chatMessages');
    quickReplies = document.getElementById('quickReplies');
    modelSelector = document.getElementById('modelSelector');
    inputNote = document.getElementById('inputNote');
    conversationSidebar = document.getElementById('conversationSidebar');
    conversationsList = document.getElementById('conversationsList');

    // Show Results nav button if quiz has been completed
    if (localStorage.getItem('verifyr_quiz_completed') === 'true') {
        const resultsBtn = document.getElementById('navResultsBtn');
        if (resultsBtn) resultsBtn.style.display = '';
        const mobileResultsBtn = document.getElementById('mobileNavResultsBtn');
        if (mobileResultsBtn) mobileResultsBtn.style.display = '';
    }

    // Check authentication (returns boolean)
    const isAuthenticated = await checkAuth();

    // Always show the page content
    document.body.classList.remove('auth-checking');

    if (!isAuthenticated) {
        // Show auth modal overlay
        showAuthModal();
        // Disable chat input and send button
        chatInput.disabled = true;
        sendButton.disabled = true;
        const placeholderText = currentLanguage === 'de'
            ? 'Bitte authentifizieren Sie sich, um den Chat zu nutzen'
            : 'Please authenticate to use chat';
        chatInput.placeholder = placeholderText;

        // Still show welcome message and basic UI
        displayWelcomeMessage();
        updateQuickReplies();
        switchLanguage(currentLanguage);

        return;
    }

    // Display user email
    const userEmailEl = document.getElementById('userEmail');
    const userEmail = localStorage.getItem('verifyr_user_email');
    if (userEmailEl && userEmail) {
        userEmailEl.textContent = userEmail;
    }

    // Show model selector only for admins
    const isAdmin = localStorage.getItem('verifyr_is_admin') === 'true';
    const modelSelectorSection = document.getElementById('sidebarModelSelectorSection');
    if (modelSelectorSection && isAdmin) {
        modelSelectorSection.style.display = '';
    }

    // Sync selectedModel with actual dropdown value
    updateModelNote();

    // Load conversations: localStorage first, then sync from server
    loadConversationsFromStorage();
    renderConversationsList();
    syncConversationsFromServer();

    // Check if we have an active conversation
    const activeConvId = localStorage.getItem('verifyr_active_conversation_id');
    if (activeConvId && conversations[activeConvId]) {
        loadConversation(activeConvId);
    } else {
        // No active conversation, show welcome message
        displayWelcomeMessage();
    }

    // Setup quick reply buttons
    updateQuickReplies();

    // Render conversation list in sidebar
    renderConversationsList();

    // Apply translations based on current language
    switchLanguage(currentLanguage);

    // Event listeners
    sendButton.addEventListener('click', handleSend);
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keypress', handleKeyPress);

    // Focus input
    chatInput.focus();
}

/**
 * Clear all authentication data from localStorage
 * Used when token is invalid or user logs out
 */
function clearAuthData() {
    localStorage.removeItem('verifyr_access_token');
    localStorage.removeItem('verifyr_user_id');
    localStorage.removeItem('verifyr_user_email');
    localStorage.removeItem('verifyr_is_admin');
}

/**
 * Check authentication status
 * Returns boolean instead of redirecting
 */
async function checkAuth() {
    try {
        // Load config from backend
        const configResponse = await fetch(`${API_BASE_URL}/config`);
        if (configResponse.ok) {
            const config = await configResponse.json();
            SUPABASE_URL = config.supabase_url;
            SUPABASE_ANON_KEY = config.supabase_anon_key;

        }

        // Initialize Supabase client if available
        if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Get current session
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session) {
                currentSession = session;
                // Update localStorage with current token
                localStorage.setItem('verifyr_access_token', session.access_token);
                localStorage.setItem('verifyr_user_id', session.user.id);
                localStorage.setItem('verifyr_user_email', session.user.email);
                return true;
            }
        }

        // Check if we have a stored token (fallback)
        // SECURITY: Always verify token with server, never trust client-side storage alone
        const storedToken = localStorage.getItem('verifyr_access_token');
        if (storedToken) {
            // Basic token format validation (JWT has 3 parts separated by dots)
            const tokenParts = storedToken.split('.');
            if (tokenParts.length !== 3) {
                console.warn('Invalid token format in localStorage');
                clearAuthData();
                return false;
            }

            // Verify token by making an authenticated API call
            // This ensures the token is valid on the server side
            try {
                const testResponse = await fetch(`${API_BASE_URL}/products`, {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`
                    }
                });
                if (testResponse.ok) {
                    return true;
                } else if (testResponse.status === 401) {
                    // Token expired or invalid - clear
                    console.log('Token invalid or expired');
                    clearAuthData();
                }
            } catch (err) {
                console.error('Token verification failed:', err);
            }
        }

        // Not authenticated
        return false;

    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

/**
 * Show auth modal overlay
 */
function showAuthModal() {
    const modal = new AuthModal({
        redirectTarget: 'chat',
        allowClose: false,
        defaultTab: 'waitlist',
        onAuthSuccess: (session) => {
            console.log('✅ Auth success, reloading chat page');
            window.location.reload();  // Reload to initialize chat properly
        }
    });
    modal.show();
}

/**
 * Get the current access token for API calls
 */
function getAccessToken() {
    if (currentSession) {
        return currentSession.access_token;
    }
    return localStorage.getItem('verifyr_access_token');
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        // Sign out from Supabase
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        // Clear localStorage
        localStorage.removeItem('verifyr_access_token');
        localStorage.removeItem('verifyr_user_id');
        localStorage.removeItem('verifyr_user_email');
        localStorage.removeItem('verifyr_is_admin');
        localStorage.removeItem('verifyr_active_conversation_id');
        localStorage.removeItem('verifyr_conversations');

        // Replace history and redirect to prevent back button
        window.history.replaceState(null, '', '/auth.html');
        window.location.replace('/auth.html');
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.history.replaceState(null, '', '/auth.html');
        window.location.replace('/auth.html');
    }
}

/**
 * Switch language - Uses unified TRANSLATIONS object
 */
function switchLanguage(lang) {
    currentLanguage = lang;
    window.currentLanguage = lang; // Also set global variable for consistency
    localStorage.setItem('verifyr-lang', lang);

    // Update active state on language buttons
    document.querySelectorAll('.lang-option').forEach(option => {
        if (option.getAttribute('data-lang') === lang) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });

    // Get translations for selected language
    const t = TRANSLATIONS[lang];

    // Update header
    const heroBadge = document.getElementById('heroBadge');
    if (heroBadge) heroBadge.textContent = t.heroBadge;

    // Update logout buttons (all variants)
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => btn.textContent = t.logout);

    const sidebarLogoutBtn = document.querySelector('.sidebar-logout-btn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.textContent = t.logout;

    const mobileLogoutBtn = document.querySelector('.mobile-logout-btn');
    if (mobileLogoutBtn) mobileLogoutBtn.textContent = t.logout;

    // Update sidebar
    const sidebarTitle = document.querySelector('.sidebar-header h2');
    if (sidebarTitle) sidebarTitle.textContent = t.menu;

    // Update model label
    const modelLabel = document.querySelector('label[for="sidebarModelSelector"]');
    if (modelLabel) modelLabel.textContent = t.model;

    // Update mobile model label
    const mobileModelLabel = document.querySelector('label[for="mobileModelSelector"]');
    if (mobileModelLabel) mobileModelLabel.textContent = t.model;

    // Update conversations section labels (use specific selector to avoid model label)
    const sidebarConversationsLabel = document.querySelector('.sidebar-conversations-header .sidebar-section-label');
    if (sidebarConversationsLabel) sidebarConversationsLabel.textContent = t.conversations;

    const mobileConversationsHeader = document.querySelector('.mobile-conversations-header h3');
    if (mobileConversationsHeader) mobileConversationsHeader.textContent = t.conversations;

    // Update new conversation buttons
    const sidebarNewConvBtn = document.querySelector('.sidebar-new-conversation-btn');
    if (sidebarNewConvBtn) sidebarNewConvBtn.textContent = '+';

    const mobileNewConvBtn = document.querySelector('.mobile-new-conversation-btn');
    if (mobileNewConvBtn) mobileNewConvBtn.textContent = '+';

    // Update chat input
    if (chatInput) chatInput.placeholder = t.placeholder;

    // Update send button
    const sendText = document.querySelector('.send-text');
    if (sendText) sendText.textContent = t.sendButton;

    // Update footer
    const footerText = document.querySelector('.chat-footer p');
    if (footerText) footerText.textContent = t.beta;

    // Update model note
    updateModelNote();

    // Update quick replies
    updateQuickReplies();

    // Clear and re-show welcome message if only the welcome message is present
    if (chatMessages && chatMessages.children.length > 0) {
        // Check if the only message is the welcome message (has class 'welcome-message')
        const firstMessage = chatMessages.children[0];
        if (firstMessage.classList.contains('welcome-message')) {
            // Check if there are no other messages (only welcome message)
            const hasUserMessages = Array.from(chatMessages.children).some(
                child => child.classList.contains('user-message')
            );
            if (!hasUserMessages) {
                chatMessages.innerHTML = '';
                displayWelcomeMessage();
            }
        }
    }
}

/**
 * Update quick reply buttons based on language
 */
function updateQuickReplies() {
    if (!quickReplies) return; // Make sure element exists

    const lang = currentLanguage; // Use module variable directly
    const t = TRANSLATIONS[lang];
    quickReplies.innerHTML = '';

    t.quickReplies.forEach(reply => {
        const button = document.createElement('button');
        button.className = 'quick-reply-btn';
        button.textContent = reply.text;
        button.onclick = () => {
            chatInput.value = reply.query;
            handleSend();
        };
        quickReplies.appendChild(button);
    });
}

/**
 * Update model note in input area
 */
function updateModelNote() {
    if (!modelSelector || !inputNote) return;
    selectedModel = modelSelector.value;

    // Track model selection to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'model_selected', {
            'event_category': 'user_preference',
            'model': selectedModel
        });
    }

    const lang = currentLanguage; // Use module variable directly
    const t = TRANSLATIONS[lang];
    const modelNames = {
        'claude-sonnet-4.5': 'Claude Sonnet 4.5',
        'claude-haiku-4.5': 'Claude Haiku 4.5',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-5.1': 'GPT-5.1',
        'gpt-5-mini': 'GPT-5 Mini',
        'gemini-2.5-flash': 'Gemini 2.5 Flash',
        'gemini-2.5-pro': 'Gemini 2.5 Pro'
    };
    inputNote.textContent = `${t.inputNote} • Powered by ${modelNames[selectedModel]}`;
}

/* ============================================================================
   Conversation Management Functions
   ============================================================================ */

/**
 * Load all conversations from localStorage
 */
function loadConversationsFromStorage() {
    try {
        const storedConversations = localStorage.getItem('verifyr_conversations');
        if (storedConversations) {
            conversations = JSON.parse(storedConversations);
        }
    } catch (error) {
        console.error('Error loading conversations from localStorage:', error);
        conversations = {};
    }
}

/**
 * Sync conversations from server — adds any server-side conversations
 * not present in localStorage (e.g. from another device/browser)
 */
async function syncConversationsFromServer() {
    const token = localStorage.getItem('verifyr_access_token');
    if (!token) return;

    try {
        const response = await fetch('/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        const serverConversations = data.conversations || [];

        let updated = false;
        for (const serverConv of serverConversations) {
            const id = serverConv.conversation_id;
            if (!conversations[id]) {
                // Not in localStorage — add as a stub (messages loaded on demand)
                conversations[id] = {
                    id,
                    title: serverConv.title || id,
                    messages: null,
                    createdAt: serverConv.created_at,
                    updatedAt: serverConv.updated_at,
                    isStub: true
                };
                updated = true;
            }
        }

        if (updated) renderConversationsList();

    } catch (err) {
        console.warn('Could not sync conversations from server:', err);
    }
}

/**
 * Save current conversation to localStorage
 */
function saveConversationToStorage() {
    if (!currentConversationId) return;

    try {
        const now = new Date().toISOString();

        // Update or create conversation
        if (!conversations[currentConversationId]) {
            // Get first user message as title
            const firstUserMsg = conversationHistory.find(msg => msg.role === 'user');
            const title = firstUserMsg ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '') : 'New Conversation';

            conversations[currentConversationId] = {
                id: currentConversationId,
                title: title,
                messages: [],
                createdAt: now,
                updatedAt: now
            };
        }

        // Update conversation data
        conversations[currentConversationId].messages = [...conversationHistory];
        conversations[currentConversationId].updatedAt = now;

        // Save to localStorage
        localStorage.setItem('verifyr_conversations', JSON.stringify(conversations));
        localStorage.setItem('verifyr_active_conversation_id', currentConversationId);

        // Re-render sidebar
        renderConversationsList();
    } catch (error) {
        console.error('Error saving conversation to localStorage:', error);
    }
}

/**
 * Create new conversation
 */
function createNewConversation() {
    // Clear current conversation
    currentConversationId = null;
    conversationHistory = [];
    chatMessages.innerHTML = '';

    // Track new conversation to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'new_conversation', {
            'event_category': 'chat_engagement'
        });
    }
    if (typeof posthog !== 'undefined') {
        posthog.capture('new_conversation');
    }

    // Show welcome message
    displayWelcomeMessage();

    // Show quick replies
    if (quickReplies) {
        quickReplies.style.display = 'flex';
    }

    // Clear active conversation ID from localStorage
    localStorage.removeItem('verifyr_active_conversation_id');

    // Re-render sidebar
    renderConversationsList();

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        conversationSidebar.classList.remove('active');
    }
}

/**
 * Load a conversation by ID — fetches from server if it's a stub
 */
async function loadConversation(conversationId) {
    if (!conversations[conversationId]) {
        console.error('Conversation not found:', conversationId);
        return;
    }

    const conversation = conversations[conversationId];

    // If stub (server-only, no local messages), fetch full conversation first
    if (conversation.isStub) {
        const token = localStorage.getItem('verifyr_access_token');
        try {
            const response = await fetch(`/conversations/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            conversation.messages = data.messages.map(m => ({ role: m.role, content: m.content }));
            conversation.isStub = false;

            // Persist to localStorage now that we have full data
            localStorage.setItem('verifyr_conversations', JSON.stringify(
                Object.fromEntries(Object.entries(conversations).filter(([, v]) => !v.isStub))
            ));
        } catch (err) {
            console.error('Failed to load conversation from server:', err);
            return;
        }
    }

    // Set as active conversation
    currentConversationId = conversationId;
    conversationHistory = [...conversation.messages];

    // Clear chat messages
    chatMessages.innerHTML = '';

    // Hide quick replies
    if (quickReplies) {
        quickReplies.style.display = 'none';
    }

    // Display all messages, restoring sources and metadata from saved state
    conversation.messages.forEach((msg, i) => {
        if (msg.role === 'user') {
            displayUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
            displayAssistantMessage(msg.content, msg.sources || [], msg.metadata || null);
            // Restore lastQueryId from the final assistant message for feedback
            if (i === conversation.messages.length - 1 && msg.metadata?.query_id) {
                lastQueryId = msg.metadata.query_id;
            }
        }
    });

    // Append feedback widget on the last assistant message if we have a trace ID
    if (lastQueryId) {
        const allMsgs = chatMessages.querySelectorAll('.assistant-message');
        const lastMsgDiv = allMsgs[allMsgs.length - 1] || null;
        appendChatFeedbackWidget(lastQueryId, lastMsgDiv);
    }

    // Save as active conversation
    localStorage.setItem('verifyr_active_conversation_id', conversationId);

    // Re-render sidebar to highlight active
    renderConversationsList();

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        conversationSidebar.classList.remove('active');
    }
}

/**
 * Render conversations list in sidebar
 */
function renderConversationsList() {
    if (!conversationsList) return;

    // Convert conversations object to array and sort by updatedAt
    const conversationsArray = Object.values(conversations);
    conversationsArray.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Clear list
    conversationsList.innerHTML = '';

    // Add each conversation
    conversationsArray.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        if (conv.id === currentConversationId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="conversation-item-content">
                <div class="conversation-title">${escapeHtml(conv.title)}</div>
                <div class="conversation-timestamp">${formatTimestamp(conv.updatedAt)}</div>
            </div>
            <button class="conversation-delete-btn" title="Delete conversation" onclick="deleteConversation(event, '${conv.id}')">×</button>
        `;

        item.querySelector('.conversation-item-content').addEventListener('click', () => loadConversation(conv.id));

        conversationsList.appendChild(item);
    });
}

/**
 * Delete a conversation from both localStorage and server
 */
async function deleteConversation(event, conversationId) {
    event.stopPropagation();

    // Remove from localStorage
    delete conversations[conversationId];
    localStorage.setItem('verifyr_conversations', JSON.stringify(conversations));

    // If it was the active conversation, start fresh
    if (currentConversationId === conversationId) {
        startNewConversation();
    } else {
        renderConversationsList();
    }

    // Delete from server (fire and forget — don't block UI)
    const token = localStorage.getItem('verifyr_access_token');
    if (token) {
        fetch(`/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.warn('Server delete failed:', err));
    }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const isOpen = conversationSidebar.classList.toggle('active');
    document.querySelector('.chat-container')?.classList.toggle('sidebar-open', isOpen);
}

/**
 * Format timestamp for conversation list
 */
function formatTimestamp(isoString) {
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

    // Otherwise show date
    return date.toLocaleDateString();
}

/**
 * Display welcome message based on current language
 */
function displayWelcomeMessage() {
    const lang = currentLanguage; // Use module variable directly
    const t = TRANSLATIONS[lang];
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message assistant-message welcome-message';
    welcomeDiv.innerHTML = `
        <div class="message-content">
            ${escapeHtml(t.welcomeMessage)}
        </div>
    `;
    chatMessages.appendChild(welcomeDiv);
}

/**
 * Handle input field changes
 */
function handleInputChange() {
    const value = chatInput.value.trim();
    sendButton.disabled = !value || isLoading;
}

/**
 * Handle Enter key press
 */
function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
            handleSend();
        }
    }
}

/**
 * Handle send button click
 */
async function handleSend() {
    const question = chatInput.value.trim();

    if (!question || isLoading) {
        return;
    }

    // Create new conversation ID if this is the first message
    if (!currentConversationId) {
        currentConversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Hide quick replies after first message
    if (quickReplies && chatMessages.children.length === 1) {
        quickReplies.style.display = 'none';
    }

    // Display user message
    displayUserMessage(question);

    // Track message sent to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'chat_message_sent', {
            'event_category': 'chat_engagement',
            'model': selectedModel,
            'language': window.currentLanguage || localStorage.getItem('verifyr-lang') || 'de'
        });
    }
    if (typeof posthog !== 'undefined') {
        posthog.capture('chat_message_sent', {
            model: selectedModel,
            language: window.currentLanguage || localStorage.getItem('verifyr-lang') || 'de',
            message_length: question.length
        });
    }

    // Add user message to conversation history
    conversationHistory.push({
        role: 'user',
        content: question
    });

    // Clear input
    chatInput.value = '';
    handleInputChange();

    // Show loading state
    setLoading(true);

    // Display loading indicator
    const loadingId = displayLoadingIndicator();

    try {
        // Get access token for authenticated API call
        const accessToken = getAccessToken();

        // Call API with selected model and conversation history
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                question,
                model: selectedModel,
                language: currentLanguage,
                conversation_history: conversationHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content })), // Strip sources/metadata — backend expects Dict[str, str]
                conversation_id: currentConversationId,
                quiz_profile: getQuizProfileString()
            })
        });

        // Remove loading indicator
        removeLoadingIndicator(loadingId);

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                console.log('Session expired, redirecting to login...');
                window.location.href = '/auth.html?tab=waitlist';
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add assistant response to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: data.answer,
            sources: data.sources || [],
            metadata: { query_id: data.query_id, model_used: data.model_used, response_time_ms: data.response_time_ms, chunks_retrieved: data.chunks_retrieved }
        });

        // Save conversation to localStorage
        saveConversationToStorage();

        // Track query ID for feedback (now equals the Langfuse trace_id)
        lastQueryId = data.query_id || null;

        // Remove feedback widget from previous last message (it's no longer the last)
        const prevFeedback = document.querySelector('.chat-feedback-widget');
        if (prevFeedback) prevFeedback.remove();

        // Display assistant response
        displayAssistantMessage(data.answer, data.sources, data);

    } catch (error) {
        console.error('Error:', error);
        removeLoadingIndicator(loadingId);
        displayError(`Sorry, I encountered an error: ${error.message}. Please try again.`);
    } finally {
        setLoading(false);
    }
}

/**
 * Display user message
 */
function displayUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            ${escapeHtml(text)}
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Display assistant message with sources
 */
function displayAssistantMessage(answer, sources, metadata) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';

    // Format answer (preserve line breaks)
    const formattedAnswer = escapeHtml(answer).replace(/\n/g, '<br>');

    // Build sources HTML
    let sourcesHtml = '';
    if (sources && sources.length > 0) {
        sourcesHtml = '<div class="message-sources">';
        sourcesHtml += '<div class="sources-title">Sources:</div>';
        sources.forEach((source) => {
            // Use citation_number if available, otherwise fall back to index
            const citationNum = source.citation_number !== undefined 
                ? source.citation_number 
                : (sources.indexOf(source) + 1);
            
            let sourceText = `[${citationNum}] ${escapeHtml(source.product)} • ${escapeHtml(source.doc_type)} • page ${source.page}`;
            
            // If source_url exists, make it clickable
            if (source.source_url) {
                sourceText = `
                    <a href="${escapeHtml(source.source_url)}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="source-link">
                        ${sourceText}
                        <span class="source-link-icon">🔗</span>
                    </a>
                    ${source.source_name ? `<span class="source-name">(${escapeHtml(source.source_name)})</span>` : ''}
                `;
            }
            
            sourcesHtml += `<div class="source-card">${sourceText}</div>`;
        });
        sourcesHtml += '</div>';
    }

    // Build metadata HTML (optional)
    let metadataHtml = '';
    if (metadata && metadata.model_used) {
        metadataHtml = `
            <div class="message-metadata">
                <span class="metadata-item">Model: ${escapeHtml(metadata.model_used)}</span>
                ${metadata.response_time_ms ? `<span class="metadata-item">Time: ${metadata.response_time_ms}ms</span>` : ''}
                ${metadata.chunks_retrieved ? `<span class="metadata-item">Chunks: ${metadata.chunks_retrieved}</span>` : ''}
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-content">
            ${formattedAnswer}
        </div>
        ${sourcesHtml}
        ${metadataHtml}
    `;

    chatMessages.appendChild(messageDiv);

    // Append feedback widget inside the message, before sources (only if we have a trace ID)
    if (lastQueryId) {
        appendChatFeedbackWidget(lastQueryId, messageDiv);
    }

    scrollToBottom();
}

/**
 * Append thumbs up/down feedback widget after the last assistant message.
 * Linked to the Langfuse trace via traceId.
 */
function appendChatFeedbackWidget(traceId, messageDiv) {
    const widget = document.createElement('div');
    widget.className = 'chat-feedback-widget';
    widget.dataset.traceId = traceId;
    const isDE = currentLanguage === 'de';
    widget.innerHTML = `
        <div class="feedback-row">
            <span class="feedback-label">${isDE ? 'War das hilfreich?' : 'Was this helpful?'}</span>
            <button class="feedback-copy-btn" title="${isDE ? 'Antwort kopieren' : 'Copy answer'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            </button>
            <button class="feedback-thumb feedback-thumb-up" title="${isDE ? 'Ja, hilfreich' : 'Yes, helpful'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
            </button>
            <button class="feedback-thumb feedback-thumb-down" title="${isDE ? 'Nein, nicht hilfreich' : 'No, not helpful'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                </svg>
            </button>
            <span class="feedback-sent" style="display:none">&#10003; ${isDE ? 'Danke!' : 'Thank you!'}</span>
        </div>
        <div class="feedback-comment-row" style="display:none">
            <textarea class="feedback-comment-input" placeholder="${isDE ? 'Was hätten wir besser machen können? (optional)' : 'What could we have done better? (optional)'}" rows="2"></textarea>
            <button class="feedback-comment-submit">${isDE ? 'Senden' : 'Send'}</button>
        </div>
    `;

    const thumbUp = widget.querySelector('.feedback-thumb-up');
    const thumbDown = widget.querySelector('.feedback-thumb-down');
    const sent = widget.querySelector('.feedback-sent');
    const commentRow = widget.querySelector('.feedback-comment-row');
    const commentInput = widget.querySelector('.feedback-comment-input');
    const commentSubmit = widget.querySelector('.feedback-comment-submit');
    const copyBtn = widget.querySelector('.feedback-copy-btn');

    function lockThumbs() {
        thumbUp.disabled = true;
        thumbDown.disabled = true;
        thumbUp.classList.add('feedback-submitted');
        thumbDown.classList.add('feedback-submitted');
    }

    function sendScore(value, comment) {
        sent.style.display = 'inline';
        if (!traceId) return;
        const token = localStorage.getItem('verifyr_access_token');
        fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ trace_id: traceId, name: 'chat_feedback', value, comment: comment || undefined })
        }).catch(e => console.warn('Feedback submission failed:', e));
    }

    thumbUp.addEventListener('click', () => {
        lockThumbs();
        sendScore(1);
    });

    thumbDown.addEventListener('click', () => {
        lockThumbs();
        commentRow.style.display = 'flex';
        commentInput.focus();
    });

    commentSubmit.addEventListener('click', () => {
        const comment = commentInput.value.trim();
        commentRow.style.display = 'none';
        sendScore(0, comment);
    });

    // Allow submitting with Ctrl+Enter
    commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commentSubmit.click();
    });

    // Copy answer text — linked to the same RAG query trace
    const copyOriginalHTML = copyBtn.innerHTML;
    copyBtn.addEventListener('click', () => {
        // Grab text from the preceding assistant message div
        const text = widget.closest('.assistant-message')?.querySelector('.message-content')?.innerText?.trim() || '';

        const onSuccess = () => {
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            copyBtn.style.color = '#16A34A';
            copyBtn.style.borderColor = '#16A34A';
            setTimeout(() => { copyBtn.innerHTML = copyOriginalHTML; copyBtn.style.color = ''; copyBtn.style.borderColor = ''; }, 2000);

            if (traceId) {
                const token = localStorage.getItem('verifyr_access_token');
                fetch(`${API_BASE_URL}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ trace_id: traceId, name: 'copy_chat_response', value: 1 })
                }).catch(() => {});
            }
        };

        const onFail = () => {
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
            } catch (_) { /* silent */ }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(onFail);
        } else {
            onFail();
        }
    });

    const sourcesEl = messageDiv ? messageDiv.querySelector('.message-sources') : null;
    if (messageDiv) {
        messageDiv.insertBefore(widget, sourcesEl);
    } else {
        chatMessages.appendChild(widget);
    }
}

/**
 * Display loading indicator
 */
function displayLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message assistant-message loading-message';
    loadingDiv.innerHTML = `
        <div class="message-content">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    return loadingId;
}

/**
 * Remove loading indicator
 */
function removeLoadingIndicator(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

/**
 * Display error message
 */
function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error-message';
    errorDiv.innerHTML = `
        <div class="message-content form-message error">
            ${escapeHtml(message)}
        </div>
    `;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

/**
 * Set loading state
 */
function setLoading(loading) {
    isLoading = loading;
    sendButton.disabled = loading || !chatInput.value.trim();
    chatInput.disabled = loading;

    const sendText = sendButton.querySelector('.send-text');
    const loadingSpinner = sendButton.querySelector('.loading');

    if (loading) {
        sendText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
    } else {
        sendText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
        chatInput.focus();
    }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Handle back button / page loaded from cache (bfcache)
window.addEventListener('pageshow', function(event) {
    // If page is loaded from cache (persisted), re-check auth
    if (event.persisted) {
        const token = localStorage.getItem('verifyr_access_token');
        if (!token) {
            // No token, redirect immediately
            window.location.replace('/auth.html?tab=waitlist');
        }
    }
});

// ============================================================================
// Mobile Hamburger Menu
// ============================================================================

// Hamburger menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.getElementById('chatMobileMenu');

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

    // Sync user email to mobile menu and sidebar
    const userEmail = document.getElementById('userEmail');
    const mobileUserEmail = document.getElementById('mobileUserEmail');
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');

    if (userEmail) {
        // Update mobile and sidebar user email whenever it changes
        const observer = new MutationObserver(() => {
            if (mobileUserEmail) mobileUserEmail.textContent = userEmail.textContent;
            if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail.textContent;
        });
        observer.observe(userEmail, { childList: true, characterData: true, subtree: true });

        // Initial sync
        if (mobileUserEmail) mobileUserEmail.textContent = userEmail.textContent;
        if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail.textContent;
    }

    // Sync model selectors (header, mobile, and sidebar)
    const modelSelector = document.getElementById('modelSelector');
    const mobileModelSelector = document.getElementById('mobileModelSelector');
    const sidebarModelSelector = document.getElementById('sidebarModelSelector');

    // Sync all selectors when any changes
    function syncAllSelectors(sourceValue) {
        if (modelSelector) modelSelector.value = sourceValue;
        if (mobileModelSelector) mobileModelSelector.value = sourceValue;
        if (sidebarModelSelector) sidebarModelSelector.value = sourceValue;
    }

    if (modelSelector) {
        modelSelector.addEventListener('change', function() {
            syncAllSelectors(this.value);
        });
    }

    if (mobileModelSelector) {
        mobileModelSelector.addEventListener('change', function() {
            syncAllSelectors(this.value);
            if (modelSelector) modelSelector.dispatchEvent(new Event('change'));
        });
    }

    if (sidebarModelSelector) {
        sidebarModelSelector.addEventListener('change', function() {
            syncAllSelectors(this.value);
            if (modelSelector) modelSelector.dispatchEvent(new Event('change'));
        });
    }
});

// Sync model selector helper function
function syncModelSelector(sourceSelect, targetId) {
    const targetSelect = document.getElementById(targetId);
    if (targetSelect) {
        targetSelect.value = sourceSelect.value;
        targetSelect.dispatchEvent(new Event('change'));
    }
}

// Close mobile menu helper
function closeMobileMenu() {
    const mobileMenu = document.getElementById('chatMobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.remove('show');
    }
}

// Sync conversation list to mobile menu
function syncConversationsToMobile() {
    const desktopList = document.getElementById('conversationsList');
    const mobileList = document.getElementById('mobileConversationsList');

    if (desktopList && mobileList) {
        // Clone the conversation items
        mobileList.innerHTML = desktopList.innerHTML;

        // Add click handlers to close menu when conversation is selected
        mobileList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', closeMobileMenu);
        });
    }
}

// Override the original renderConversations to also update mobile list
const originalRenderConversations = window.renderConversations;
if (originalRenderConversations) {
    window.renderConversations = function() {
        originalRenderConversations.apply(this, arguments);
        syncConversationsToMobile();
    };
}

// Initial sync on load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for conversations to load, then sync
    setTimeout(syncConversationsToMobile, 500);

    // Set up mutation observer to watch for conversation list changes
    const desktopList = document.getElementById('conversationsList');
    if (desktopList) {
        const observer = new MutationObserver(syncConversationsToMobile);
        observer.observe(desktopList, { childList: true, subtree: true });
    }
});

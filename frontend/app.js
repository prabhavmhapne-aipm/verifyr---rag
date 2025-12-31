/**
 * Verifyr Chat Interface - Frontend Logic
 *
 * Handles user interactions, API calls, and message display
 * Integrated with Verifyr design system
 */

// Configuration
const API_BASE_URL = 'http://localhost:8000';

// Translations
const TRANSLATIONS = {
    en: {
        welcomeMessage: "Hello! How can I help you? I'm happy to help with all questions about products. What would you like to know?",
        subtitle: "Ask me anything about Apple Watch Series 11 vs Garmin Forerunner 970",
        placeholder: "Ask about product features...",
        quickReplies: [
            { text: "Battery Life", query: "What is the battery life comparison?" },
            { text: "Best for Running", query: "Which watch is better for running?" },
            { text: "Waterproof Ratings", query: "Compare the waterproof ratings" },
            { text: "Key Differences", query: "What are the key differences?" }
        ],
        inputNote: "Press Enter to send"
    },
    de: {
        welcomeMessage: "Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?",
        subtitle: "Frag mich alles über Apple Watch Series 11 vs Garmin Forerunner 970",
        placeholder: "Frage nach Produktfunktionen...",
        quickReplies: [
            { text: "Akkulaufzeit", query: "Welche Uhr hat eine längere Akkulaufzeit?" },
            { text: "Beste fürs Laufen", query: "Welche Uhr ist besser zum Laufen?" },
            { text: "Wasserdichtigkeit", query: "Vergleiche die Wasserdichtigkeit" },
            { text: "Hauptunterschiede", query: "Was sind die Hauptunterschiede?" }
        ],
        inputNote: "Drücke Enter zum Senden"
    }
};

// DOM Elements
let chatInput;
let sendButton;
let chatMessages;
let quickReplies;
let modelSelector;
let chatSubtitle;
let inputNote;
let conversationSidebar;
let conversationsList;

// State
let isLoading = false;
let currentLanguage = 'en';
let selectedModel = 'gpt-4o-mini'; // Default matches HTML, will be synced in init()

// Conversation Management State
let currentConversationId = null;
let conversations = {}; // Object mapping conversation_id -> conversation data
let conversationHistory = []; // Array of {role, content} for current conversation

/**
 * Initialize the chat interface
 */
function init() {
    // Get DOM elements
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    chatMessages = document.getElementById('chatMessages');
    quickReplies = document.getElementById('quickReplies');
    modelSelector = document.getElementById('modelSelector');
    chatSubtitle = document.getElementById('chatSubtitle');
    inputNote = document.getElementById('inputNote');
    conversationSidebar = document.getElementById('conversationSidebar');
    conversationsList = document.getElementById('conversationsList');

    // Sync selectedModel with actual dropdown value
    updateModelNote();

    // Load conversations from localStorage
    loadConversationsFromStorage();

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

    // Event listeners
    sendButton.addEventListener('click', handleSend);
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keypress', handleKeyPress);

    // Focus input
    chatInput.focus();
}

/**
 * Switch language
 */
function switchLanguage(lang) {
    currentLanguage = lang;

    // Update active state on language buttons
    document.querySelectorAll('.lang-option').forEach(option => {
        if (option.getAttribute('data-lang') === lang) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });

    // Update UI text
    const t = TRANSLATIONS[lang];
    chatSubtitle.textContent = t.subtitle;
    chatInput.placeholder = t.placeholder;
    updateModelNote();

    // Update quick replies
    updateQuickReplies();

    // Clear and re-show welcome message if it's the first message
    if (chatMessages.children.length === 1) {
        chatMessages.innerHTML = '';
        displayWelcomeMessage();
    }
}

/**
 * Update quick reply buttons based on language
 */
function updateQuickReplies() {
    const t = TRANSLATIONS[currentLanguage];
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
    selectedModel = modelSelector.value;
    const t = TRANSLATIONS[currentLanguage];
    const modelNames = {
        'claude-sonnet-4.5': 'Claude Sonnet 4.5',
        'claude-3.5-haiku': 'Claude Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini'
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
 * Load a conversation by ID
 */
function loadConversation(conversationId) {
    if (!conversations[conversationId]) {
        console.error('Conversation not found:', conversationId);
        return;
    }

    const conversation = conversations[conversationId];

    // Set as active conversation
    currentConversationId = conversationId;
    conversationHistory = [...conversation.messages];

    // Clear chat messages
    chatMessages.innerHTML = '';

    // Hide quick replies
    if (quickReplies) {
        quickReplies.style.display = 'none';
    }

    // Display all messages
    conversation.messages.forEach(msg => {
        if (msg.role === 'user') {
            displayUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
            // For assistant messages, we might not have sources anymore, so display without them
            displayAssistantMessage(msg.content, [], null);
        }
    });

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
            <div class="conversation-title">${escapeHtml(conv.title)}</div>
            <div class="conversation-timestamp">${formatTimestamp(conv.updatedAt)}</div>
        `;

        item.onclick = () => loadConversation(conv.id);

        conversationsList.appendChild(item);
    });
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    conversationSidebar.classList.toggle('active');
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
    const t = TRANSLATIONS[currentLanguage];
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
        // Call API with selected model and conversation history
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                model: selectedModel,
                language: currentLanguage,
                conversation_history: conversationHistory.slice(0, -1), // Exclude current message (already sent as question)
                conversation_id: currentConversationId
            })
        });

        // Remove loading indicator
        removeLoadingIndicator(loadingId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add assistant response to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: data.answer
        });

        // Save conversation to localStorage
        saveConversationToStorage();

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
    scrollToBottom();
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

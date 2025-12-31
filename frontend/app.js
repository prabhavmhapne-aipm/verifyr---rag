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

// State
let isLoading = false;
let currentLanguage = 'en';
let selectedModel = 'gpt-4o-mini'; // Default matches HTML, will be synced in init()

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

    // Sync selectedModel with actual dropdown value
    updateModelNote();

    // Show welcome message
    displayWelcomeMessage();

    // Setup quick reply buttons
    updateQuickReplies();

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

    // Hide quick replies after first message
    if (quickReplies && chatMessages.children.length === 1) {
        quickReplies.style.display = 'none';
    }

    // Display user message
    displayUserMessage(question);

    // Clear input
    chatInput.value = '';
    handleInputChange();

    // Show loading state
    setLoading(true);

    // Display loading indicator
    const loadingId = displayLoadingIndicator();

    try {
        // Call API with selected model
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                model: selectedModel,
                language: currentLanguage
            })
        });

        // Remove loading indicator
        removeLoadingIndicator(loadingId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

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

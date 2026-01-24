# Frontend Feedback Integration Guide

## Overview
This guide shows how to add thumbs up/down feedback buttons to the chat interface.

## Step 1: Modify `app.js` - Add Feedback Buttons

### Modify `displayAssistantMessage` function (around line 500)

Replace the current function with:

```javascript
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
            const citationNum = source.citation_number !== undefined
                ? source.citation_number
                : (sources.indexOf(source) + 1);

            let sourceText = `[${citationNum}] ${escapeHtml(source.product)} • ${escapeHtml(source.doc_type)} • page ${source.page}`;

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

    // NEW: Build feedback buttons HTML
    const queryId = metadata?.query_id || `temp_${Date.now()}`;
    const feedbackHtml = `
        <div class="message-feedback" data-query-id="${queryId}">
            <button class="feedback-button feedback-positive"
                    data-feedback="1"
                    aria-label="Helpful">
                👍
            </button>
            <button class="feedback-button feedback-negative"
                    data-feedback="0"
                    aria-label="Not helpful">
                👎
            </button>
            <span class="feedback-status"></span>
        </div>
    `;

    messageDiv.innerHTML = `
        <div class="message-content">
            ${formattedAnswer}
        </div>
        ${sourcesHtml}
        ${metadataHtml}
        ${feedbackHtml}
    `;

    // Attach event listeners to feedback buttons
    const feedbackButtons = messageDiv.querySelectorAll('.feedback-button');
    feedbackButtons.forEach(button => {
        button.addEventListener('click', handleFeedback);
    });

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}
```

### Add Feedback Handler Function (add at end of file)

```javascript
/**
 * Handle user feedback submission
 */
async function handleFeedback(event) {
    const button = event.currentTarget;
    const feedbackDiv = button.closest('.message-feedback');
    const queryId = feedbackDiv.dataset.queryId;
    const feedbackValue = parseInt(button.dataset.feedback);
    const statusSpan = feedbackDiv.querySelector('.feedback-status');

    // Disable buttons to prevent double submission
    const allButtons = feedbackDiv.querySelectorAll('.feedback-button');
    allButtons.forEach(btn => btn.disabled = true);

    // Show loading state
    statusSpan.textContent = '...';
    statusSpan.className = 'feedback-status loading';

    try {
        // Send feedback to backend
        const response = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_id: queryId,
                score: feedbackValue,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            // Show success message
            const feedbackText = feedbackValue === 1 ? 'Thanks! 👍' : 'Thanks for the feedback 👎';
            statusSpan.textContent = feedbackText;
            statusSpan.className = 'feedback-status success';

            // Highlight selected button
            button.classList.add('selected');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        statusSpan.textContent = 'Failed to send';
        statusSpan.className = 'feedback-status error';

        // Re-enable buttons on error
        allButtons.forEach(btn => btn.disabled = false);
    }
}
```

## Step 2: Add CSS Styles to `styles.css`

Add these styles at the end of your `styles.css`:

```css
/* ===================================================================
   FEEDBACK BUTTONS
   =================================================================== */

.message-feedback {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border-light, #E5E7EB);
}

.feedback-button {
    background: transparent;
    border: 1px solid var(--color-border, #D1D5DB);
    border-radius: 8px;
    padding: 0.25rem 0.5rem;
    font-size: 1.125rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.feedback-button:hover:not(:disabled) {
    background: var(--color-bg-subtle, #F9FAFB);
    border-color: var(--color-border-hover, #9CA3AF);
    transform: scale(1.1);
}

.feedback-button:active:not(:disabled) {
    transform: scale(0.95);
}

.feedback-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.feedback-button.selected {
    background: var(--color-primary-light, #DBEAFE);
    border-color: var(--color-primary, #3B82F6);
}

.feedback-button.feedback-positive.selected {
    background: #D1FAE5;
    border-color: #10B981;
}

.feedback-button.feedback-negative.selected {
    background: #FEE2E2;
    border-color: #EF4444;
}

.feedback-status {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #6B7280);
    margin-left: 0.5rem;
}

.feedback-status.success {
    color: #10B981;
}

.feedback-status.error {
    color: #EF4444;
}

.feedback-status.loading {
    color: var(--color-primary, #3B82F6);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .feedback-button {
        min-width: 2.25rem;
        height: 2.25rem;
        font-size: 1rem;
    }
}
```

## Step 3: Backend Implementation

See `backend_feedback_endpoint.md` for backend implementation.

## Testing

1. Start the backend:
   ```
   .\manage_server.ps1 -Action start
   ```

2. Open frontend: `http://localhost:8000/frontend/`

3. Ask a question

4. Click 👍 or 👎 on the response

5. Verify:
   - Button shows "selected" state
   - Status shows "Thanks! 👍" or "Thanks for the feedback 👎"
   - Check Langfuse dashboard for the score

## UI/UX Notes

- Feedback buttons appear ONLY on assistant messages (not user messages)
- Buttons are disabled after submission to prevent double-clicking
- Visual feedback shows which button was selected
- Status message confirms submission
- Works on mobile (responsive design)

# QA Chatbot - User Story Backlog

## Pre-Kauf Support

_User stories will be added here..._

## Post-Kauf Support

_User stories will be added here..._

## Core Functionality

### 2.1.1: Q&A Chat öffnen / Open Q&A Chat

**German:**
Um Fragen zu Produkten stellen zu können. Als Nutzer mit offenen Fragen möchte ich ein Chat-Icon sehen, das ich jederzeit antippen kann, damit ich sofort Produkt Fragen stellen kann wenn ich unsicher bin.

**English:**
To be able to ask questions about products. As a user with open questions, I want to see a chat icon that I can tap at any time, so that I can immediately ask product questions when I'm uncertain.

**Acceptance Criteria:**
- Chat-Icon (💬) wird in Bottom-Navigation angezeigt / Chat icon (💬) is displayed in bottom navigation
- Icon ist durchgängig verfügbar (auf allen Screens nach Onboarding) / Icon is continuously available (on all screens after onboarding)
- Tap öffnet Chat als Modal-Overlay / Tap opens chat as modal overlay
- Begrüßungs-Message: "Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?" / Welcome message: "Hello! How can I help you? I'm happy to help with all questions about products. What would you like to know?"
- "X" Button zum Schließen oben rechts / "X" button to close in top right

---

### 2.1.2: Quick-Reply Häufige Frage klicken / Click Quick-Reply Common Question

**German:**
Um häufige Fragen schnell zu stellen ohne tippen zu müssen. Als Nutzer mit einer typischen Produkt Frage möchte ich anklickbare "Häufige Fragen" Buttons sehen, damit ich mit einem Tap meine Frage stellen kann.

**English:**
To quickly ask common questions without having to type. As a user with a typical product question, I want to see clickable "Frequently Asked Questions" buttons, so that I can ask my question with one tap.

**Acceptance Criteria:**
- 3-5 Quick-Reply Buttons werden im Chat angezeigt / 3-5 quick-reply buttons are displayed in the chat:
  - "Wie lange hält der Akku bei der Apple Watch Series 11?" / "How long does the battery last on the Apple Watch Series 11?"
  - "Wie misst Schlaf, Stress und Erholung besser?" / "Which measures sleep, stress and recovery better?"
  - "Welche Uhr passt besser zu mir?" / "Which watch fits me better?"
  - "Kann ich mit der Uhr sicher schwimmen, saunieren, und duschen?" / "Can I safely swim, sauna, and shower with the watch?"
- Buttons sind prominent (nicht nur Text) / Buttons are prominent (not just text)
- Tap auf Button sendet Frage automatisch / Tap on button automatically sends question
- System generiert Antwort nach Klick / System generates answer after click

---

### 2.1.3: Quellen-Angabe unter Antwort sehen / See Source Citation Under Answer

**German:**
Um Vertrauen in die Bot-Antwort zu haben. Als skeptischer Nutzer möchte ich unter jeder Antwort eine Quellen-Angabe sehen, damit ich weiß, dass die Antwort auf echten Daten basiert.

**English:**
To have trust in the bot's answer. As a skeptical user, I want to see a source citation under each answer, so that I know the answer is based on real data.

**Acceptance Criteria:**
- Quellen-Angabe wird unter jeder Bot-Antwort angezeigt / Source citation is displayed under each bot answer
- Format: "Quelle: [Name der Quelle]" / Format: "Source: [Name of source]"
- Beispiele / Examples:
  - "Quelle: Produktvergleich - Verifyr Health Guide" / "Source: Product Comparison - Verifyr Health Guide"
  - "Quelle: Garmin Forerunner 970 Handbuch" / "Source: Garmin Forerunner 970 Manual"
- Bei mehreren Quellen: max. 3 angezeigt / For multiple sources: max. 3 displayed
- Quellen sind klickbar (falls Link verfügbar) / Sources are clickable (if link available)

---

### 2.1.4: Antwort in Layman-Terms verstehen / Understand Answer in Layman Terms

**German:**
Um technische Antworten auch ohne Expertenwissen zu verstehen. Als durchschnittlicher Nutzer ohne Tech-Background möchte ich Antworten in einfacher Sprache erhalten, damit ich die Information wirklich verstehe.

**English:**
To understand technical answers even without expert knowledge. As an average user without a tech background, I want to receive answers in simple language, so that I truly understand the information.

**Acceptance Criteria:**
- Bot-Antworten sind in einfacher Sprache (kein Tech-Jargon) / Bot answers are in simple language (no tech jargon)
- Länge: 2-4 Sätze (prägnant) / Length: 2-4 sentences (concise)
- Beispiel-Antwort zu "Was ist HRV?" / Example answer to "What is HRV?":
  - "HRV ist ein Gesundheitswert, der kleine Schwankungen zwischen deinen Herzschlägen misst und zeigt, wie erholt oder gestresst dein Körper ist..." / "HRV is a health metric that measures small variations between your heartbeats and shows how recovered or stressed your body is..."
- Antwort erscheint innerhalb von max. 60 Sekunden / Answer appears within max. 60 seconds
- Loading-Indicator während Generierung / Loading indicator during generation

---

### 2.1.5: Eigene Frage als Freitext eingeben / Enter Own Question as Free Text

**German:**
Um individuelle Fragen zu stellen, die nicht in den Quick-Reply-Buttons enthalten sind. Als Nutzer mit spezifischen Fragen möchte ich eine Texteingabe sehen, in der ich meine eigene Frage tippen kann, damit ich genau die Information erhalte, die ich brauche.

**English:**
To ask individual questions that are not included in the quick-reply buttons. As a user with specific questions, I want to see a text input where I can type my own question, so that I get exactly the information I need.

**Acceptance Criteria:**
- Texteingabefeld wird im Chat angezeigt / Text input field is displayed in the chat
- Eingabefeld ist immer sichtbar (am unteren Rand des Chat-Fensters) / Input field is always visible (at the bottom of the chat window)
- Placeholder-Text: "Stelle deine Frage..." (DE) / "Ask your question..." (EN)
- Senden-Button (oder Enter-Taste) sendet die Frage / Send button (or Enter key) sends the question
- Leere Nachrichten können nicht gesendet werden / Empty messages cannot be sent
- Nach dem Senden wird die Frage im Chat angezeigt / After sending, the question is displayed in the chat
- Eingabefeld wird nach dem Senden geleert / Input field is cleared after sending
- Maximale Zeichenanzahl: 500 Zeichen / Maximum character count: 500 characters
- Zeichenzähler wird angezeigt (optional) / Character counter is displayed (optional)

---

### 2.1.6: Follow-up Frage stellen / Ask Follow-up Question

**German:**
Um in derselben Konversation nachzufragen und weitere Details zu erfahren. Als Nutzer mit weiteren Fragen möchte ich direkt nach einer Bot-Antwort eine neue Frage stellen können, damit ich ohne Kontextverlust weiterfragen kann.

**English:**
To ask follow-up questions in the same conversation and get more details. As a user with additional questions, I want to be able to ask a new question directly after a bot answer, so that I can ask follow-up questions without losing context.

**Acceptance Criteria:**
- Nach jeder Bot-Antwort kann eine neue Frage gestellt werden / After each bot answer, a new question can be asked
- Bot behält den Kontext der vorherigen Fragen und Antworten / Bot retains context of previous questions and answers
- Follow-up-Fragen können sowohl über Texteingabe als auch über Quick-Reply-Buttons gestellt werden / Follow-up questions can be asked via text input or quick-reply buttons
- Bot versteht Referenzen auf vorherige Antworten (z.B. "Was meinst du damit?" / "Kannst du das genauer erklären?") / Bot understands references to previous answers (e.g., "What do you mean by that?" / "Can you explain that in more detail?")
- Konversation bleibt in derselben Chat-Session / Conversation remains in the same chat session
- Keine Begrenzung der Anzahl an Follow-up-Fragen / No limit on the number of follow-up questions

---

### 2.1.7: Chat-Verlauf sehen / See Chat History

**German:**
Um meine bisherigen Fragen und Antworten nachvollziehen zu können. Als Nutzer möchte ich den gesamten Chat-Verlauf in der aktuellen Session sehen, damit ich nachvollziehen kann, was bereits besprochen wurde.

**English:**
To be able to review my previous questions and answers. As a user, I want to see the entire chat history in the current session, so that I can review what has already been discussed.

**Acceptance Criteria:**
- Alle Fragen und Antworten werden im Chat-Verlauf angezeigt / All questions and answers are displayed in the chat history
- Verlauf wird chronologisch angezeigt (älteste Nachricht oben, neueste unten) / History is displayed chronologically (oldest message at top, newest at bottom)
- Nutzer-Fragen sind visuell von Bot-Antworten unterscheidbar (z.B. unterschiedliche Farben/Positionen) / User questions are visually distinguishable from bot answers (e.g., different colors/positions)
- Chat-Verlauf bleibt während der gesamten Session sichtbar / Chat history remains visible throughout the entire session
- Automatisches Scrollen zur neuesten Nachricht nach jeder Antwort / Automatic scrolling to newest message after each answer
- Manuelles Scrollen durch den Verlauf ist möglich / Manual scrolling through history is possible
- Verlauf wird beim Schließen des Chats nicht gelöscht (bleibt in Session) / History is not deleted when closing the chat (remains in session)
- Beim erneuten Öffnen des Chats wird der Verlauf wieder angezeigt / When reopening the chat, the history is displayed again

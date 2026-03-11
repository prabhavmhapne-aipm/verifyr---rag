/**
 * Budget & Special Request Screen
 * Reads quiz answers, adds budget range + special request, then goes to loading.html
 */

// ── Language ──
const lang = localStorage.getItem('verifyr-lang') || 'de';

const texts = {
    de: {
        title:          'Wir sind gleich da...',
        subtitle:       'Optional',
        budgetCard:     'Was ist dein Budget?',
        priceRange:     'Preis Range',
        specialCard:    'Haben wir alles gefragt?',
        inputLabel:     'Besondere Anforderungen',
        placeholder:    'Hier beschreiben...',
        cta:            'Produkte Empfehlen',
        showResults:    'Ergebnisse anzeigen',
        back:           'Zurück',
        logout:         'Abmelden',
        login:          'Anmelden',
    },
    en: {
        title:          'Almost there...',
        subtitle:       'Optional',
        budgetCard:     'What is your budget?',
        priceRange:     'Price Range',
        specialCard:    'Did we ask everything?',
        inputLabel:     'Special requirements',
        placeholder:    'Describe here...',
        cta:            'Recommend Products',
        showResults:    'Show Results',
        back:           'Back',
        logout:         'Logout',
        login:          'Login',
    }
};

const t = texts[lang] || texts.de;

// ── Apply translations ──
function applyTexts() {
    document.getElementById('budgetTitle').textContent      = t.title;
    document.getElementById('budgetSubtitle').textContent   = t.subtitle;
    document.getElementById('budgetCardLabel').textContent  = t.budgetCard;
    document.getElementById('priceRangeLabel').textContent  = t.priceRange;
    document.getElementById('specialCardLabel').textContent = t.specialCard;
    document.getElementById('backBtnText').textContent      = t.back;

    const hasResults = localStorage.getItem('verifyr_quiz_completed') === 'true';
    document.getElementById('ctaText').textContent = hasResults ? t.showResults : t.cta;

    const textarea = document.getElementById('specialRequest');
    if (textarea) textarea.placeholder = t.placeholder;

    const label = document.getElementById('specialRequestLabel');
    if (label) label.textContent = t.inputLabel;
}

// ── Dual range slider ──
const sliderMin  = document.getElementById('sliderMin');
const sliderMax  = document.getElementById('sliderMax');
const rangeFill  = document.getElementById('rangeFill');
const rangeLabel = document.getElementById('priceRangeValue');

function updateSlider() {
    const min   = parseInt(sliderMin.value);
    const max   = parseInt(sliderMax.value);
    const total = parseInt(sliderMin.max);

    // Prevent handles crossing
    if (min >= max) {
        if (this === sliderMin) sliderMin.value = max - parseInt(sliderMin.step);
        else                    sliderMax.value = min + parseInt(sliderMax.step);
    }

    const lo = parseInt(sliderMin.value);
    const hi = parseInt(sliderMax.value);

    const leftPct  = (lo / total) * 100;
    const rightPct = (hi / total) * 100;

    rangeFill.style.left  = leftPct + '%';
    rangeFill.style.width = (rightPct - leftPct) + '%';

    rangeLabel.textContent = `${lo}–${hi}€`;

    // Persist immediately so navigating back restores the position
    const qa = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
    qa.budget_min = lo;
    qa.budget_max = hi;
    localStorage.setItem('verifyr_quiz_answers', JSON.stringify(qa));
}

sliderMin.addEventListener('input', updateSlider);
sliderMax.addEventListener('input', updateSlider);

// Restore saved budget from previous visit
const _saved = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
if (_saved.budget_min != null) sliderMin.value = _saved.budget_min;
if (_saved.budget_max != null) sliderMax.value = _saved.budget_max;

// Set initial fill on load
updateSlider.call(sliderMin);

// Restore saved special request
if (_saved.special_request) {
    document.getElementById('specialRequest').value = _saved.special_request;
}

// ── Textarea: auto-grow + character counter ──
const textarea    = document.getElementById('specialRequest');
const charCount   = document.getElementById('charCount');
const charCounter = document.querySelector('.budget-char-counter');

textarea.addEventListener('input', () => {
    // Auto-grow
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // Counter
    const len = textarea.value.length;
    charCount.textContent = len;
    charCounter.classList.toggle('near-limit', len >= 80 && len < 100);
    charCounter.classList.toggle('at-limit',   len >= 100);

    // Persist immediately
    const qa = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
    qa.special_request = textarea.value.trim() || null;
    localStorage.setItem('verifyr_quiz_answers', JSON.stringify(qa));
});

// ── Reset icons (bottom nav + top subtitle) ──
function doReset() {
    const qa = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
    delete qa.budget_min;
    delete qa.budget_max;
    delete qa.special_request;
    localStorage.setItem('verifyr_quiz_answers', JSON.stringify(qa));
    localStorage.removeItem('verifyr_quiz_completed');
    sliderMin.value = 300;
    sliderMax.value = 800;
    document.getElementById('specialRequest').value = '';
    updateSlider.call(sliderMin);
    document.getElementById('ctaText').textContent = t.cta;
}
document.getElementById('resetBtn').addEventListener('click', doReset);
document.getElementById('resetBtnTop').addEventListener('click', doReset);

// ── Submit ──
document.getElementById('recommendBtn').addEventListener('click', handleSubmit);
document.getElementById('nextBtnArrow').addEventListener('click', handleSubmit);

function handleSubmit() {
    // If results already exist, go straight to them
    if (localStorage.getItem('verifyr_quiz_completed') === 'true') {
        window.location.href = '/quiz/results.html';
        return;
    }

    const minBudget   = parseInt(sliderMin.value);
    const maxBudget   = parseInt(sliderMax.value);
    const specialNote = (document.getElementById('specialRequest').value || '').trim();

    // Auth gate — require login before burning LLM API credits
    const token = localStorage.getItem('verifyr_access_token');
    if (!token) {
        // Save progress first so it's restored after login
        const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
        quizAnswers.budget_min      = minBudget;
        quizAnswers.budget_max      = maxBudget;
        quizAnswers.special_request = specialNote || null;
        localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));
        window.location.href = '/auth.html?redirect=/quiz/budget.html';
        return;
    }

    // Merge into existing quiz answers
    const quizAnswers = JSON.parse(localStorage.getItem('verifyr_quiz_answers') || '{}');
    quizAnswers.budget_min      = minBudget;
    quizAnswers.budget_max      = maxBudget;
    quizAnswers.special_request = specialNote || null;
    localStorage.setItem('verifyr_quiz_answers', JSON.stringify(quizAnswers));

    console.log('✅ Budget & special request saved:', { minBudget, maxBudget, specialNote });

    if (typeof gtag !== 'undefined') {
        gtag('event', 'quiz_budget_set', {
            'event_category': 'quiz_funnel',
            'budget_min': minBudget,
            'budget_max': maxBudget,
            'has_special_request': !!specialNote
        });
    }

    window.location.href = '/quiz/loading.html';
}

// ── Auth / user display ──
function updateUserDisplay() {
    const userEmail  = localStorage.getItem('verifyr_user_email');
    const logoutText = t.logout;
    const loginText  = t.login;

    const mobileEmail     = document.getElementById('mobileUserEmail');
    const mobileBtn       = document.querySelector('.mobile-logout-btn');
    const sidebarEmail    = document.getElementById('sidebarUserEmail');
    const sidebarAuthBtn  = document.getElementById('sidebarAuthBtn');

    if (userEmail) {
        if (mobileEmail) mobileEmail.textContent = userEmail;
        if (mobileBtn)   { mobileBtn.textContent = logoutText; mobileBtn.onclick = handleLogout; }
        if (sidebarEmail)   sidebarEmail.textContent = userEmail;
        if (sidebarAuthBtn) { sidebarAuthBtn.textContent = logoutText; sidebarAuthBtn.onclick = handleLogout; sidebarAuthBtn.className = 'sidebar-logout-btn'; }
    } else {
        if (mobileBtn)      { mobileBtn.textContent = loginText; mobileBtn.onclick = () => window.location.href = '/auth.html'; }
        if (sidebarAuthBtn) { sidebarAuthBtn.textContent = loginText; sidebarAuthBtn.onclick = () => window.location.href = '/auth.html'; sidebarAuthBtn.className = 'sidebar-login-btn'; }
    }
}

async function handleLogout() {
    try {
        const supabaseClient = window.supabaseClient;
        if (supabaseClient) await supabaseClient.auth.signOut();
    } catch(e) { /* ignore */ }
    ['verifyr_access_token','verifyr_user_id','verifyr_user_email','verifyr_is_admin'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
}

function toggleSidebar() {
    const sidebar = document.getElementById('quizSidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

// ── Language switcher ──
function switchLanguage(newLang) {
    localStorage.setItem('verifyr-lang', newLang);
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-lang') === newLang);
    });
    window.location.reload();
}

// ── Language active state ──
function initLanguage() {
    const saved = localStorage.getItem('verifyr-lang') || 'de';
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-lang') === saved);
    });
}

// ── Hamburger (mobile menu) ──
function initMobileMenu() {
    const hamburger  = document.querySelector('.hamburger-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!hamburger || !mobileMenu) return;
    hamburger.addEventListener('click', () => mobileMenu.classList.toggle('show'));
    document.addEventListener('click', e => {
        if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.remove('show');
        }
    });
}

// Apply texts immediately (script is at bottom of body, DOM is ready) to avoid language flicker
applyTexts();

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    updateUserDisplay();
    initLanguage();
    initMobileMenu();
});

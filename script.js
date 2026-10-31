// ============================================================================
// FRESHMART - COMPLETE E-COMMERCE SCRIPT (ALL FUNCTIONS PRESERVED & UPGRADED)
// ============================================================================

let appInitialized = false;
let sliderIntervalsStarted = false;
window.modalStack = [];
window.authLocked = false;

// --- SAVED ACCOUNTS HELPER (For 1-Tap Login on Switch Account Page) ---
function getSavedAccounts() {
    let list = safeGetStorage('freshmart_saved_accounts', []);
    if (!Array.isArray(list)) list = [];
    // Ensure current authenticated profile is always in saved accounts
    const prof = safeGetStorage('freshmart_profile', { name: 'Sahil Sharma', phone: '7988300872', email: 'sahil@freshmart.com' });
    if (prof && prof.name && prof.name !== 'Guest User') {
        const cleanPhone = String(prof.phone || '7988300872').replace(/\D/g, '').slice(-10) || '7988300872';
        const cleanEmail = prof.email || 'sahil@freshmart.com';
        const exists = list.some(a => (a.phone && a.phone === cleanPhone) || (a.email && a.email.toLowerCase() === cleanEmail.toLowerCase()));
        if (!exists) {
            list.unshift({
                name: prof.name,
                phone: cleanPhone,
                email: cleanEmail
            });
        }
    }
    // Also merge any registered local users
    const localUsers = safeGetStorage('freshmart_local_users', []);
    if (Array.isArray(localUsers)) {
        localUsers.forEach(u => {
            if (u && u.name) {
                const p = String(u.mobile || u.phone || '').replace(/\D/g, '').slice(-10);
                const em = u.email || '';
                const ex = list.some(a => (p && a.phone === p) || (em && a.email && a.email.toLowerCase() === em.toLowerCase()));
                if (!ex) {
                    list.push({ name: u.name, phone: p || '7988300872', email: em || 'user@freshmart.com' });
                }
            }
        });
    }
    if (list.length === 0) {
        list.push({ name: 'Sahil Sharma', phone: '7988300872', email: 'sahil@freshmart.com' });
    }
    safeSetStorage('freshmart_saved_accounts', list);
    return list;
}

function saveAccountToHistory(userObj) {
    if (!userObj || !userObj.name || userObj.name === 'Guest User') return;
    let list = getSavedAccounts();
    const cleanPhone = String(userObj.mobile || userObj.phone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = (userObj.email || '').trim();
    list = list.filter(a => {
        const samePhone = cleanPhone && a.phone === cleanPhone;
        const sameEmail = cleanEmail && a.email && a.email.toLowerCase() === cleanEmail.toLowerCase();
        return !(samePhone || sameEmail);
    });
    list.unshift({
        name: userObj.name.trim(),
        phone: cleanPhone || '7988300872',
        email: cleanEmail || 'sahil@freshmart.com'
    });
    safeSetStorage('freshmart_saved_accounts', list.slice(0, 6));
}

window.renderSavedAccountsList = function() {
    const container = document.getElementById('saved-accounts-list');
    const wrapper = document.getElementById('saved-accounts-section');
    if (!container || !wrapper) return;
    const accounts = getSavedAccounts();
    if (accounts.length === 0) {
        wrapper.classList.add('hidden');
        return;
    }
    wrapper.classList.remove('hidden');
    const currentPhone = String(AppState.profile?.phone || '').replace(/\D/g, '').slice(-10);
    container.innerHTML = accounts.map((acc, idx) => {
        const parts = (acc.name || 'User').trim().split(/\s+/).filter(Boolean);
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : (acc.name || 'FM').substring(0, 2).toUpperCase();
        const isCurrent = AppState.isAuthenticated && currentPhone && acc.phone === currentPhone;
        const formattedPhone = acc.phone && acc.phone.length === 10
            ? `+91 ${acc.phone.slice(0, 5)} ${acc.phone.slice(5)}`
            : (acc.phone || '');
        return `
        <button type="button" onclick="quickLoginSavedAccount(${idx})" class="w-full text-left p-3 rounded-2xl border ${isCurrent ? 'border-primary-400 bg-primary-50/60' : 'border-gray-200 bg-gray-50/80 hover:border-primary-400 hover:bg-primary-50/30'} transition flex items-center justify-between gap-3 group card-dark border-dark">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                    ${initials}
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs sm:text-sm font-extrabold text-gray-900 truncate title-dark">${acc.name}</span>
                        ${isCurrent ? `<span class="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Current</span>` : ''}
                    </div>
                    <div class="text-[10px] sm:text-[11px] font-bold text-gray-500 truncate subtitle-dark">${formattedPhone}${acc.email ? ' • ' + acc.email : ''}</div>
                </div>
            </div>
            <span class="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold bg-primary-600 text-white px-3 py-1.5 rounded-full shadow-sm group-hover:bg-primary-700 transition">
                Login <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </span>
        </button>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.quickLoginSavedAccount = function(idx) {
    const accounts = getSavedAccounts();
    const chosen = accounts[idx];
    if (!chosen) return;
    AppState.isAuthenticated = true;
    AppState.profile = {
        name: chosen.name,
        phone: chosen.phone,
        email: chosen.email || 'sahil@freshmart.com'
    };
    safeSetStorage('freshmart_token', 'session-' + Date.now());
    safeSetStorage('freshmart_user', {
        name: chosen.name,
        mobile: chosen.phone,
        email: chosen.email || 'sahil@freshmart.com'
    });
    saveAccountToHistory(chosen);
    saveState();
    unlockAndExitAuthModal();
    showPremiumAlert('Logged In', `Welcome back, ${chosen.name}!`, 'check-circle');
};

window.openSwitchAccount = function(event) {
    if (event) event.preventDefault();
    window.authLocked = true;
    // Close other open modals so Switch Account jumps directly to the Login screen
    document.querySelectorAll('.full-screen-modal.open').forEach(modal => {
        if (modal.id !== 'auth-modal') {
            modal.classList.remove('open');
            modal.style.pointerEvents = 'none';
        }
    });
    window.modalStack = [];
    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) bottomNav.classList.add('hidden');
    const floatCart = document.getElementById('mobile-floating-cart');
    if (floatCart) floatCart.classList.add('hidden');
    renderSavedAccountsList();
    openModal('auth-modal');
};

function unlockAndExitAuthModal() {
    window.authLocked = false;
    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) bottomNav.classList.remove('hidden');
    closeAllFullPages();
    updateGlobalUI();
}

// Safe LocalStorage Helpers (Prevents SecurityError in restricted iframes/modes)
function safeGetStorage(key, fallbackVal = null) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallbackVal;
        return JSON.parse(raw);
    } catch (e) {
        return fallbackVal;
    }
}

function safeGetRawStorage(key, fallbackVal = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw !== null ? raw : fallbackVal;
    } catch (e) {
        return fallbackVal;
    }
}

function safeSetStorage(key, val) {
    try {
        if (typeof val === 'string') localStorage.setItem(key, val);
        else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
        console.warn('Storage write skipped:', e);
    }
}

function safeRemoveStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('Storage remove skipped:', e);
    }
}

// --- API & BACKEND CONFIGURATION (No hardcoded secret keys in frontend) ---
const API_BASE_URL = window.FRESHMART_API_BASE_URL || (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '5000'
        ? '/api/auth'
        : 'http://localhost:5000/api/auth'
);

const EMAILJS_USER_ID = window.FRESHMART_EMAILJS_PUBLIC_KEY || "K6cs_matxXu2begVg";
const EMAILJS_SERVICE_ID = window.FRESHMART_EMAILJS_SERVICE_ID || "service_57rcqvv";
const EMAILJS_TEMPLATE_ID = window.FRESHMART_EMAILJS_TEMPLATE_ID || "template_uayc7bw";

if (typeof emailjs !== 'undefined' && EMAILJS_USER_ID) {
    try {
        emailjs.init(EMAILJS_USER_ID);
    } catch (e) {
        console.warn("EmailJS init warning:", e);
    }
}

async function sendEmailViaEmailJS(templateParams) {
    if (typeof emailjs !== 'undefined' && EMAILJS_USER_ID && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
        try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_USER_ID);
            return { sent: true, method: 'sdk' };
        } catch (err) {
            console.warn('EmailJS SDK warning:', err);
        }
    }
    try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_USER_ID,
                template_params: templateParams
            })
        });
        if (res.ok) return { sent: true, method: 'rest' };
    } catch (e) {
        console.warn('EmailJS REST warning:', e);
    }
    return { sent: false };
}

// --- SVG FALLBACK GENERATOR FOR PRODUCT IMAGES ---
window.getProductFallbackSVG = function(name, brand) {
    const cleanName = (name || 'FreshMart').replace(/["'<>]/g, '');
    const cleanBrand = (brand || 'FRESH').replace(/["'<>]/g, '').toUpperCase();
    const shortTitle = cleanName.length > 20 ? cleanName.substring(0, 18) + '...' : cleanName;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ecfdf5"/>
                <stop offset="100%" stop-color="#d1fae5"/>
            </linearGradient>
        </defs>
        <rect width="400" height="400" rx="40" fill="url(#bg)"/>
        <circle cx="200" cy="155" r="64" fill="#ffffff" opacity="0.9"/>
        <path d="M172 150 L228 150 L220 190 L180 190 Z" fill="#10b981"/>
        <rect x="166" y="140" width="68" height="12" rx="6" fill="#059669"/>
        <path d="M182 140 L192 120 M218 140 L208 120" stroke="#047857" stroke-width="5" stroke-linecap="round"/>
        <text x="200" y="258" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="800" fill="#059669" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="200" y="290" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#111827" text-anchor="middle">${shortTitle}</text>
        <text x="200" y="325" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#6b7280" text-anchor="middle">FreshMart Verified</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

// --- STEP-BY-STEP BACK NAVIGATION ENGINE & FULL-PAGE CONTROLLER ---
function syncMobileNavHighlight() {
    const topModal = window.modalStack.length > 0 ? window.modalStack[window.modalStack.length - 1] : null;
    const map = {
        'home': topModal === null,
        'category': topModal === 'category-full-modal',
        'cart': topModal === 'cart-drawer',
        'settings': topModal === 'settings-modal'
    };
    ['home', 'category', 'cart', 'settings'].forEach(key => {
        const btn = document.getElementById(`mob-nav-${key}`);
        const circle = document.getElementById(`mob-nav-${key}-circle`);
        if (btn && circle) {
            if (map[key]) {
                btn.classList.add('text-primary-600');
                btn.classList.remove('text-gray-500');
                circle.classList.add('bg-primary-50', 'text-primary-600', 'shadow-inner');
            } else {
                btn.classList.remove('text-primary-600');
                btn.classList.add('text-gray-500');
                circle.classList.remove('bg-primary-50', 'text-primary-600', 'shadow-inner');
            }
        }
    });
}

window.openModal = function(modalId, fromPopState = false) {
    const el = document.getElementById(modalId);
    if (!el) return;

    // Populate modal-specific dynamic data before showing
    if (modalId === 'cart-drawer') updateGlobalUI();
    if (modalId === 'wishlist-modal') updateGlobalUI();
    if (modalId === 'settings-modal') {
        updateGlobalUI();
        loadNotifications();
    }
    if (modalId === 'notification-modal') loadNotifications();
    if (modalId === 'orders-modal') loadOrders();
    if (modalId === 'edit-profile-modal') loadProfileData();
    if (modalId === 'address-modal') loadAddressData();
    if (modalId === 'appearance-modal') syncAppearanceModal();
    if (modalId === 'payment-methods-modal') syncPaymentModal();
    if (modalId === 'language-modal') syncLanguageModal();
    if (modalId === 'category-full-modal') renderSidebars();
    if (modalId === 'auth-modal') {
        window.authLocked = true;
        const bottomNav = document.getElementById('mobile-bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden');
        const floatCart = document.getElementById('mobile-floating-cart');
        if (floatCart) floatCart.classList.add('hidden');
        renderSavedAccountsList();
    }

    // Update stack so Back goes 1 step back instead of jumping to Home
    const existingIdx = window.modalStack.indexOf(modalId);
    if (existingIdx !== -1) {
        window.modalStack.splice(existingIdx, 1);
    }
    window.modalStack.push(modalId);

    // Ensure z-index layering follows stack order
    window.modalStack.forEach((id, idx) => {
        const m = document.getElementById(id);
        if (m) {
            m.style.zIndex = String(10000 + idx * 10);
        }
    });

    el.classList.remove('hidden');
    el.style.pointerEvents = 'auto';
    el.classList.add('open');
    el.scrollTop = 0;
    document.body.classList.add('no-scroll');

    if (!fromPopState) {
        try {
            history.pushState({ stack: [...window.modalStack], modalId: modalId }, '', `#${modalId}`);
        } catch (e) {}
    }

    syncMobileNavHighlight();
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeModal = function(modalId, fromPopState = false) {
    if (modalId === 'auth-modal' && window.authLocked) {
        if (fromPopState) {
            try { history.pushState({ stack: ['auth-modal'], modalId: 'auth-modal' }, '', '#auth-modal'); } catch (e) {}
        }
        return;
    }
    const el = document.getElementById(modalId);
    if (!el) return;

    if (el.classList.contains('open')) {
        el.classList.remove('open');
        el.style.pointerEvents = 'none';
    }

    const idx = window.modalStack.indexOf(modalId);
    if (idx !== -1) {
        window.modalStack.splice(idx, 1);
    }

    if (window.modalStack.length === 0) {
        document.body.classList.remove('no-scroll');
        if (!fromPopState) {
            try {
                history.replaceState({ stack: [] }, '', window.location.pathname + window.location.search);
            } catch (e) {}
        }
    } else {
        const prevId = window.modalStack[window.modalStack.length - 1];
        const prevEl = document.getElementById(prevId);
        if (prevEl) {
            prevEl.classList.remove('hidden');
            prevEl.classList.add('open');
            prevEl.style.pointerEvents = 'auto';
        }
        if (!fromPopState) {
            try {
                history.replaceState({ stack: [...window.modalStack], modalId: prevId }, '', `#${prevId}`);
            } catch (e) {}
        }
    }

    syncMobileNavHighlight();
};

// Goes strictly 1 step back in the page stack!
window.goBackOneStep = function() {
    if (window.authLocked) return;
    if (window.modalStack.length > 0) {
        const currentTop = window.modalStack[window.modalStack.length - 1];
        closeModal(currentTop);
    } else {
        closeAllFullPages();
    }
};

window.closeAllFullPages = function() {
    if (window.authLocked) return;
    window.modalStack = [];
    document.querySelectorAll('.full-screen-modal.open').forEach(modal => {
        modal.classList.remove('open');
        modal.style.pointerEvents = 'none';
    });
    document.body.classList.remove('no-scroll');
    try {
        history.replaceState({ stack: [] }, '', window.location.pathname + window.location.search);
    } catch (e) {}
    syncMobileNavHighlight();
};

window.addEventListener('popstate', (event) => {
    if (window.authLocked) {
        try {
            history.pushState({ stack: ['auth-modal'], modalId: 'auth-modal' }, '', '#auth-modal');
        } catch (e) {}
        return;
    }
    if (window.modalStack.length > 0) {
        const topModalId = window.modalStack[window.modalStack.length - 1];
        closeModal(topModalId, true);
    }
});

// Close topmost modal on Escape key & close dropdowns when clicking outside
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const alertPopup = document.getElementById('premium-alert-popup');
        if (alertPopup && alertPopup.classList.contains('open')) {
            closePremiumAlert();
            return;
        }
        closeCategoryDropdown();
        if (window.modalStack.length > 0) {
            goBackOneStep();
        }
    }
});

document.addEventListener('click', (e) => {
    const searchBox = document.getElementById('search-results-container');
    const desktopInput = document.getElementById('desktop-search');
    if (searchBox && !searchBox.classList.contains('hidden')) {
        if (!searchBox.contains(e.target) && e.target !== desktopInput) {
            searchBox.classList.add('hidden');
        }
    }

    const mobSearchBox = document.getElementById('mobile-search-results-container');
    const mobInput = document.getElementById('mobile-search');
    if (mobSearchBox && !mobSearchBox.classList.contains('hidden')) {
        if (!mobSearchBox.contains(e.target) && e.target !== mobInput) {
            mobSearchBox.classList.add('hidden');
        }
    }

    const catDropdown = document.getElementById('desktop-category-dropdown');
    const catWrapper = document.getElementById('all-products-dropdown-wrapper');
    if (catDropdown && catDropdown.classList.contains('open')) {
        if (catWrapper && !catWrapper.contains(e.target)) {
            closeCategoryDropdown();
        }
    }
});

// Backward compatibility functions
window.openSubModal = function(subId) {
    openModal(subId);
};
window.closeSubModal = function(subId) {
    closeModal(subId);
};

window.smartBack = function(fallbackUrl = 'index.html') {
    if (window.modalStack && window.modalStack.length > 0) {
        goBackOneStep();
    } else if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = fallbackUrl;
    }
};

window.toggleFSModal = function(id) { 
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) closeModal(id);
    else openModal(id);
};

// --- IN-APP TERMS & POLICY PAGES DATA & VIEWER (With Watermark Background & 1-Step Back) ---
const POLICY_DATA = {
    delivery: {
        badge: 'EXPRESS SHIPPING',
        title: 'Delivery Policy',
        subtitle: 'Fast, reliable doorstep delivery of your everyday essentials.',
        file: 'delivery.html',
        sections: [
            { title: '1. Express Local Delivery', body: 'Orders within our service area are delivered rapidly to your doorstep with a flat ₹20 delivery partner fee.' },
            { title: '2. Live Order Coordination', body: 'Once your WhatsApp order is placed, our dispatch team confirms your address and dispatches your basket immediately.' },
            { title: '3. Accurate Address Details', body: 'Please provide your complete House/Flat number, Street, Landmark, and 10-digit mobile number for smooth handover.' },
            { title: '4. Delivery Assistance', body: 'If your order is delayed or you need live delivery help, reach out to our support team on WhatsApp at +91 7988300872.' }
        ]
    },
    terms: {
        badge: 'STORE AGREEMENT',
        title: 'Terms & Conditions',
        subtitle: 'Clear and transparent guidelines for shopping on FreshMart.',
        file: 'terms.html',
        sections: [
            { title: '1. Acceptance of Terms', body: 'By accessing and placing orders on FreshMart, you agree to abide by these Terms & Conditions and our store policies.' },
            { title: '2. Product Availability & Pricing', body: 'All items and pack sizes are subject to stock availability. Prices shown include applicable taxes unless stated otherwise.' },
            { title: '3. Authentic Daily Essentials', body: 'We guarantee 100% genuine, fresh-batch groceries, snacks, beverages, and household essentials sourced from trusted brands.' },
            { title: '4. User Account Responsibility', body: 'Please keep your account credentials and OTP verification codes confidential for safe and uninterrupted shopping.' }
        ]
    },
    privacy: {
        badge: 'DATA PROTECTION',
        title: 'Privacy Policy',
        subtitle: 'How we protect your personal details, phone number, and delivery address.',
        file: 'privacy.html',
        sections: [
            { title: '1. Information We Collect', body: 'We collect only essential details required to fulfill your order: your name, 10-digit mobile number, email, and delivery address.' },
            { title: '2. How Your Data Is Used', body: 'Your information is used strictly for order processing, doorstep delivery coordination, and customer support.' },
            { title: '3. Zero Third-Party Selling', body: 'FreshMart never sells, rents, or trades your personal contact information to external marketers.' },
            { title: '4. Local & Encrypted Storage', body: 'Your cart, wishlist, and address preferences are stored securely so you enjoy a fast, seamless checkout every time.' }
        ]
    },
    refund: {
        badge: 'HASSLE-FREE RETURNS',
        title: 'Refund Policy',
        subtitle: 'Quick resolution for damaged, missing, or incorrect items.',
        file: 'refund.html',
        sections: [
            { title: '1. Doorstep Quality Check', body: 'You can inspect your grocery items at the time of delivery. If any item is damaged or expired, return it immediately to our delivery partner.' },
            { title: '2. Reporting an Issue', body: 'For packaged defects noticed after delivery, contact us on WhatsApp within 24 hours with your Order ID and item photo.' },
            { title: '3. Instant Replacement or Refund', body: 'Approved claims are resolved via free doorstep replacement or instant refund via UPI / cash adjustment.' }
        ]
    },
    cancellation: {
        badge: 'ORDER FLEXIBILITY',
        title: 'Cancellation Policy',
        subtitle: 'Simple rules for modifying or cancelling your FreshMart order.',
        file: 'cancellation.html',
        sections: [
            { title: '1. Before Dispatch Cancellation', body: 'You may cancel or modify your order free of charge before our dispatch team packs and sends out your basket.' },
            { title: '2. How to Cancel Quickly', body: 'Simply reply on WhatsApp with your Order ID (#FM-XXXX) or call +91 7988300872 to request immediate cancellation.' },
            { title: '3. Post-Dispatch Policy', body: 'Once the delivery partner has reached your location, please coordinate with support for any urgent adjustments.' }
        ]
    },
    security: {
        badge: 'SAFE SHOPPING',
        title: 'Security Policy',
        subtitle: 'Protecting your account, OTP verification, and doorstep payments.',
        file: 'security-policy.html',
        sections: [
            { title: '1. Secure OTP & Password Access', body: 'Accounts are safeguarded with 4-digit OTP verification and password protection.' },
            { title: '2. Safe Doorstep Payments', body: 'Pay comfortably at your doorstep via Cash on Delivery (COD), verified UPI QR, or Card on Delivery.' },
            { title: '3. Never Share Sensitive Codes', body: 'FreshMart support will never ask for your bank PIN or personal passwords.' }
        ]
    },
    about: {
        badge: 'OUR STORY',
        title: 'About FreshMart',
        subtitle: 'Your neighborhood daily needs store built for speed, freshness, and trust.',
        file: 'about.html',
        sections: [
            { title: '1. Who We Are', body: 'FreshMart brings your everyday kitchen staples, atta, basmati rice, cold drinks, snacks, and personal care items straight to your door.' },
            { title: '2. Quality & Best Prices', body: 'Every item is checked for freshness and offered at honest everyday savings below MRP.' },
            { title: '3. 1-Click WhatsApp Convenience', body: 'No complicated checkouts — add items to your cart and place your order on WhatsApp in seconds.' }
        ]
    },
    help: {
        badge: '24/7 CUSTOMER CARE',
        title: 'Help & Support',
        subtitle: 'We are here to help with your orders, delivery, and account questions.',
        file: 'help-support.html',
        sections: [
            { title: '1. WhatsApp Live Support', body: 'Message us anytime on WhatsApp at +91 7988300872 with your Order ID for fast assistance.' },
            { title: '2. Direct Phone Support', body: 'Call our store helpline at +91 7988300872 for urgent delivery updates or address changes.' },
            { title: '3. Common Questions', body: 'You can manage your delivery address, switch payment methods (COD/UPI/Card), and reorder past baskets directly from Settings.' }
        ]
    },
    cookies: {
        badge: 'COOKIE TRANSPARENCY',
        title: 'Cookie Policy',
        subtitle: 'How FreshMart uses essential, preference, analytics, and marketing cookies.',
        file: 'cookie-policy.html',
        sections: [
            { title: '1. Essential Technologies (Always Active)', body: 'Strictly necessary for cart items, wishlist storage, page navigation, and security verification.' },
            { title: '2. Preference Cookies', body: 'Remember your optional interface choices such as Light/Dark appearance and preferred language.' },
            { title: '3. Analytics & Marketing Cookies (Consent Gated)', body: 'Optional analytics and promotional cookies remain blocked by default until you explicitly enable them on our dedicated Cookie Settings page.' }
        ]
    },
    legal: {
        badge: 'LEGAL NOTICE',
        title: 'Legal Information',
        subtitle: 'Official store compliance, consumer rights, and policy directory.',
        file: 'legal.html',
        sections: [
            { title: '1. Store Ownership & Trademarks', body: 'FreshMart and its logo, design, and catalog are operated in compliance with applicable consumer e-commerce standards.' },
            { title: '2. Consumer Protection', body: 'All MRP, pack weight, and brand details are displayed transparently on every product page.' },
            { title: '3. Policy Directory', body: 'Use the links below to switch between Terms, Privacy, Refund, Delivery, Cancellation, and Security policies.' }
        ]
    }
};

window.openPolicyPage = function(policyKey, event) {
    const data = POLICY_DATA[policyKey] || POLICY_DATA.delivery;
    if (!window.FRESHMART_SINGLE_FILE_PREVIEW && data && data.file) {
        if (event) event.preventDefault();
        window.location.href = data.file;
        return;
    }
    if (event) event.preventDefault();
    const headerTitle = document.getElementById('policy-viewer-header-title');
    const bodyEl = document.getElementById('policy-viewer-body');
    if (!bodyEl) return;

    if (headerTitle) headerTitle.innerText = data.title;

    const otherKeys = Object.keys(POLICY_DATA).filter(k => k !== policyKey);

    bodyEl.innerHTML = `
        <div class="bg-white/90 backdrop-blur-md rounded-[2rem] border border-gray-200/80 p-5 sm:p-8 shadow-lg card-dark border-dark">
            <span class="inline-block px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest mb-3">
                ${data.badge}
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2 title-dark">${data.title}</h1>
            <p class="text-xs sm:text-sm font-medium text-gray-500 leading-relaxed mb-6 subtitle-dark">${data.subtitle}</p>

            <div class="space-y-3.5">
                ${data.sections.map(sec => `
                    <div class="p-4 sm:p-5 rounded-2xl bg-white/95 border border-gray-100 shadow-sm card-dark border-dark">
                        <h3 class="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5 title-dark">${sec.title}</h3>
                        <p class="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed subtitle-dark">${sec.body}</p>
                    </div>
                `).join('')}
            </div>

            <div class="mt-6 pt-5 border-t border-gray-100 border-dark">
                <div class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Quick Switch Policy Pages</div>
                <div class="flex flex-wrap gap-2">
                    ${otherKeys.map(k => `
                        <button type="button" onclick="openPolicyPage('${k}')" class="btn-3d px-3.5 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 text-xs font-extrabold transition">
                            ${POLICY_DATA[k].title}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    openModal('policy-viewer-modal');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// --- PRODUCT DETAILS PAGE QUANTITY ---
window.currentModalQty = 1;

window.changeModalQty = function(change) {
    window.currentModalQty += change;
    if (window.currentModalQty < 1) window.currentModalQty = 1;
    const display = document.getElementById('modal-qty-display');
    if (display) display.innerText = window.currentModalQty;
    
    const selectedVariant = document.querySelector('input[name="variant"]:checked');
    if (selectedVariant) {
        const pId = selectedVariant.getAttribute('data-pid');
        updateModalPrice(selectedVariant.value, pId);
    }
};

// --- PRESERVED DATABASE WITH 20 PRODUCTS ---
const defaultProducts = [
    { id: 1, name: "Bisleri Packaged Drinking Water", brand: "Bisleri", category: "c1", description: "Pure drinking water with essential minerals and double ozonisation protection.", image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80", rating: 4.8, reviews: 156, sales: 1200, variants: [{ vId: '1a', size: "1 L", price: 20, originalPrice: 20, stock: 50 }, { vId: '1b', size: "5 L", price: 65, originalPrice: 75, stock: 15 }] },
    { id: 2, name: "Aashirvaad Shudh Chakki Atta", brand: "ITC", category: "c3", description: "100% whole wheat grain atta for soft, fluffy rotis every day.", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80", rating: 4.9, reviews: 342, sales: 800, variants: [{ vId: '2a', size: "5 kg", price: 210, originalPrice: 240, stock: 30 }, { vId: '2b', size: "10 kg", price: 410, originalPrice: 460, stock: 20 }] },
    { id: 3, name: "Haldiram's Aloo Bhujia", brand: "Haldiram", category: "c2", description: "Crispy and spicy authentic potato & gram flour namkeen snack.", image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281298?w=400&q=80", rating: 4.5, reviews: 89, sales: 500, variants: [{ vId: '3a', size: "400 g", price: 95, originalPrice: 100, stock: 100 }, { vId: '3b', size: "1 kg", price: 215, originalPrice: 240, stock: 45 }] },
    { id: 4, name: "Maggi 2-Minute Noodles", brand: "Nestle", category: "c3", description: "Instant masala noodles with signature spice tastemaker for quick meals.", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80", rating: 4.7, reviews: 500, sales: 2000, variants: [{ vId: '4a', size: "70 g", price: 14, originalPrice: 14, stock: 200 }, { vId: '4b', size: "420 g (Pack of 6)", price: 80, originalPrice: 84, stock: 90 }] },
    { id: 5, name: "Coca Cola Soft Drink", brand: "Coca Cola", category: "c1", description: "Original taste refreshing sparkling cold beverage.", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80", rating: 4.6, reviews: 210, sales: 1500, variants: [{ vId: '5a', size: "750 ml", price: 40, originalPrice: 40, stock: 50 }, { vId: '5b', size: "2 L", price: 90, originalPrice: 100, stock: 35 }] },
    { id: 6, name: "Lays Classic Salted", brand: "Lays", category: "c2", description: "Crispy farm-grown potato chips lightly seasoned with classic salt.", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80", rating: 4.5, reviews: 320, sales: 1800, variants: [{ vId: '6a', size: "50 g", price: 20, originalPrice: 20, stock: 100 }, { vId: '6b', size: "115 g", price: 45, originalPrice: 50, stock: 60 }] },
    { id: 7, name: "Tata Salt Vacuum Evaporated", brand: "Tata", category: "c3", description: "Desh ka Namak — hygienic iodised vacuum evaporated salt.", image: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80", rating: 4.9, reviews: 800, sales: 5000, variants: [{ vId: '7a', size: "1 kg", price: 25, originalPrice: 28, stock: 200 }] },
    { id: 8, name: "Dettol Original Soap", brand: "Dettol", category: "c4", description: "Trusted germ protection bathing bar for daily skin hygiene.", image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=80", rating: 4.8, reviews: 450, sales: 2200, variants: [{ vId: '8a', size: "125 g", price: 45, originalPrice: 50, stock: 80 }, { vId: '8b', size: "4 x 125 g", price: 165, originalPrice: 190, stock: 40 }] },
    { id: 9, name: "India Gate Basmati Rice", brand: "India Gate", category: "c3", description: "Aged premium long-grain aromatic basmati rice.", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80", rating: 4.7, reviews: 120, sales: 600, variants: [{ vId: '9a', size: "1 kg", price: 110, originalPrice: 130, stock: 40 }, { vId: '9b', size: "5 kg", price: 520, originalPrice: 610, stock: 25 }] },
    { id: 10, name: "Fortune Sunflower Oil", brand: "Fortune", category: "c3", description: "Light, healthy refined sunflower oil enriched with vitamins.", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80", rating: 4.6, reviews: 300, sales: 900, variants: [{ vId: '10a', size: "1 L", price: 140, originalPrice: 155, stock: 60 }] },
    { id: 11, name: "MDH Garam Masala", brand: "MDH", category: "c3", description: "Authentic aromatic blend of roasted Indian whole spices.", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80", rating: 4.8, reviews: 250, sales: 700, variants: [{ vId: '11a', size: "100 g", price: 75, originalPrice: 80, stock: 90 }] },
    { id: 12, name: "Taj Mahal Tea", brand: "Brooke Bond", category: "c3", description: "Rich, aromatic, and flavorful finest Assam tea leaves.", image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&q=80", rating: 4.7, reviews: 400, sales: 1100, variants: [{ vId: '12a', size: "250 g", price: 150, originalPrice: 165, stock: 50 }, { vId: '12b', size: "500 g", price: 290, originalPrice: 320, stock: 30 }] },
    { id: 13, name: "Nescafe Classic Coffee", brand: "Nescafe", category: "c3", description: "100% pure roasted instant coffee for a rich morning aroma.", image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400&q=80", rating: 4.8, reviews: 600, sales: 1300, variants: [{ vId: '13a', size: "50 g", price: 160, originalPrice: 170, stock: 45 }] },
    { id: 14, name: "Colgate MaxFresh", brand: "Colgate", category: "c4", description: "Peppermint ice toothpaste with cooling crystals for fresh breath.", image: "https://images.unsplash.com/photo-1559591937-abc368006c77?w=400&q=80", rating: 4.5, reviews: 350, sales: 1400, variants: [{ vId: '14a', size: "150 g", price: 90, originalPrice: 105, stock: 70 }] },
    { id: 15, name: "Surf Excel Easy Wash", brand: "Surf Excel", category: "c5", description: "Superfine detergent powder for tough stain removal in one wash.", image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&q=80", rating: 4.7, reviews: 420, sales: 1600, variants: [{ vId: '15a', size: "1 kg", price: 120, originalPrice: 130, stock: 85 }] },
    { id: 16, name: "Vim Dishwash Bar", brand: "Vim", category: "c5", description: "Power of 100 lemons dishwashing bar for sparkling utensils.", image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80", rating: 4.6, reviews: 290, sales: 1900, variants: [{ vId: '16a', size: "300 g", price: 30, originalPrice: 30, stock: 150 }] },
    { id: 17, name: "Harpic Power Plus", brand: "Harpic", category: "c5", description: "10x max clean disinfectant toilet cleaner liquid.", image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80", rating: 4.8, reviews: 510, sales: 1250, variants: [{ vId: '17a', size: "500 ml", price: 95, originalPrice: 100, stock: 60 }] },
    { id: 18, name: "Amul Butter", brand: "Amul", category: "c3", description: "Utterly butterly delicious pasteurized table butter.", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80", rating: 4.9, reviews: 900, sales: 3000, variants: [{ vId: '18a', size: "100 g", price: 54, originalPrice: 54, stock: 110 }, { vId: '18b', size: "500 g", price: 265, originalPrice: 275, stock: 50 }] },
    { id: 19, name: "Parle-G Gold", brand: "Parle", category: "c2", description: "Rich, crunchy family pack glucose biscuits.", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80", rating: 4.5, reviews: 850, sales: 4000, variants: [{ vId: '19a', size: "1 kg", price: 100, originalPrice: 110, stock: 200 }] },
    { id: 20, name: "Real Fruit Juice", brand: "Real", category: "c1", description: "Healthy mixed fruit beverage with no added preservatives.", image: "https://images.unsplash.com/photo-1622597467836-f382490b4d4b?w=400&q=80", rating: 4.6, reviews: 230, sales: 850, variants: [{ vId: '20a', size: "1 L", price: 115, originalPrice: 125, stock: 40 }] }
];

function loadInitialProducts() {
    const stored = safeGetStorage('freshmart_products', null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
        safeSetStorage('freshmart_products', defaultProducts);
        return defaultProducts;
    }
    const brokenUrls = [
        'photo-1523362628745-0c100150b504',
        'photo-1599507593499-a3f7d1d94260',
        'photo-1627484297686-29177bdce8ce',
        'photo-1559592476-eb4270bc56a7',
        'photo-1584820927498-cafe2c1eb769',
        'photo-1585421514738-01798e348b17',
        'photo-1584432810601-6c7f27d2362b',
        'photo-1588195538326-c5b1e9f80a1b'
    ];
    let updated = false;
    stored.forEach(item => {
        const def = defaultProducts.find(d => d.id == item.id);
        if (def) {
            if (!item.image || brokenUrls.some(b => item.image.includes(b))) {
                item.image = def.image;
                updated = true;
            }
            if (def.variants && def.variants.length > 1 && (!item.variants || item.variants.length === 1)) {
                item.variants = def.variants;
                updated = true;
            }
        }
    });
    if (updated) safeSetStorage('freshmart_products', stored);
    return stored;
}

const DB = {
    settings: { whatsappNumber: "917988300872", deliveryFee: 20 },
    categories: [
        { id: 'c1', name: 'Water & Drinks', icon: '🥤', count: 24 },
        { id: 'c2', name: 'Snacks', icon: '🍿', count: 38 },
        { id: 'c3', name: 'Grocery', icon: '🛒', count: 56 },
        { id: 'c4', name: 'Personal Care', icon: '🧴', count: 21 },
        { id: 'c5', name: 'Household', icon: '🧹', count: 15 }
    ],
    products: loadInitialProducts()
};

function loadInitialProfile() {
    const saved = safeGetStorage('freshmart_profile', null);
    if (saved && saved.name && saved.name !== 'Guest User') return saved;
    return { name: 'Sahil Sharma', phone: '7988300872', email: 'sahil@freshmart.com' };
}

let AppState = {
    cart: safeGetStorage('freshmart_cart', []),
    wishlist: safeGetStorage('freshmart_wishlist', []),
    address: safeGetStorage('freshmart_addr', null),
    profile: loadInitialProfile(),
    theme: safeGetRawStorage('freshmart_theme', 'Light'),
    language: safeGetRawStorage('freshmart_lang', 'English'),
    paymentMethod: safeGetRawStorage('freshmart_payment', 'Cash on Delivery'),
    activeCategory: 'all',
    isAuthenticated: true
};

function saveState() {
    safeSetStorage('freshmart_cart', AppState.cart);
    safeSetStorage('freshmart_wishlist', AppState.wishlist);
    safeSetStorage('freshmart_addr', AppState.address);
    safeSetStorage('freshmart_profile', AppState.profile);
    safeSetStorage('freshmart_theme', AppState.theme);
    safeSetStorage('freshmart_lang', AppState.language);
    safeSetStorage('freshmart_payment', AppState.paymentMethod);
    updateGlobalUI();
}

// --- DYNAMIC POPUP INJECTOR ---
function injectGlobalComponents() {
    if (!document.getElementById('premium-alert-popup')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="premium-alert-popup" class="premium-popup-overlay fixed inset-0 bg-black/60 z-[10100] flex items-center justify-center p-4 backdrop-blur-md">
            <div class="premium-popup-box bg-white rounded-[2.5rem] w-full max-w-xs md:max-w-sm p-8 shadow-2xl flex flex-col items-center text-center relative border border-gray-100 card-dark border-dark">
                <div id="alert-icon-container" class="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 mt-2 shadow-inner"><i data-lucide="check-circle" id="alert-icon" class="w-8 h-8"></i></div>
                <h3 id="alert-title" class="text-xl font-extrabold text-gray-900 mb-2 tracking-tight title-dark">Success</h3>
                <p id="alert-message" class="text-xs text-gray-500 mb-6 font-bold px-2 subtitle-dark"></p>
                <div class="w-full"><button type="button" onclick="closePremiumAlert()" class="btn-3d w-full bg-gray-900 text-white font-extrabold py-3.5 rounded-full hover:bg-black transition shadow-xl text-xs uppercase tracking-widest">OK</button></div>
            </div>
        </div>`);
    }
}

window.showPremiumAlert = function(title, message, iconType = 'check-circle') {
    injectGlobalComponents();
    const popup = document.getElementById('premium-alert-popup');
    if (!popup) return;
    const titleEl = document.getElementById('alert-title');
    const msgEl = document.getElementById('alert-message');
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;

    const iconContainer = document.getElementById('alert-icon-container');
    const iconEl = document.getElementById('alert-icon');
    if (iconContainer && iconEl) {
        if (iconType === 'check-circle') {
            iconContainer.className = 'w-14 h-14 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3.5 mt-1 shadow-inner';
        } else if (iconType === 'alert-circle' || iconType === 'error') {
            iconType = 'alert-circle';
            iconContainer.className = 'w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3.5 mt-1 shadow-inner';
        } else {
            iconContainer.className = 'w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-3.5 mt-1 shadow-inner';
        }
        iconEl.setAttribute('data-lucide', iconType);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    popup.classList.remove('hidden');
    popup.classList.add('open');
};

window.closePremiumAlert = function() {
    const p = document.getElementById('premium-alert-popup');
    if (p) {
        p.classList.remove('open');
        p.classList.add('hidden');
    }
};

function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    renderSidebars();
    renderCategoryDropdown();
    renderProducts(DB.products, 'products-container');
    loadNotifications();
    updateGlobalUI();
    setupSwipeGestures();
    startAutoSliders();
    if (AppState.address) {
        const el = document.getElementById('selected-address-text');
        if (el) el.innerText = `${AppState.address.type || 'Home'}: ${AppState.address.name}, ${AppState.address.full}`;
    }
}

window.scrollToProducts = function() {
    const el = document.getElementById('products-section');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
};

function startAutoSliders() {
    if (sliderIntervalsStarted) return;
    sliderIntervalsStarted = true;
    setInterval(() => { slideSliderInfinite('why-shop-slider'); }, 2500);
    setInterval(() => { slideSliderInfinite('reviews-slider'); }, 2500);
}

window.slideSliderInfinite = function(sliderId) {
    const slider = document.getElementById(sliderId);
    if (!slider || slider.children.length === 0) return;
    const cardWidth = slider.firstElementChild.offsetWidth + 16;
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
    if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
        setTimeout(() => {
            if (slider.firstElementChild) {
                slider.appendChild(slider.firstElementChild);
                slider.scrollLeft -= cardWidth;
            }
        }, 300);
    }
};

window.slideSlider = function(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider || !slider.firstElementChild) return;
    slider.scrollBy({ left: direction * (slider.firstElementChild.offsetWidth + 16), behavior: 'smooth' });
};

// --- DESKTOP / LAPTOP "ALL PRODUCTS ▾" DROPDOWN MENU ---
window.toggleCategoryDropdown = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('desktop-category-dropdown');
    const arrow = document.getElementById('category-dropdown-arrow');
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    if (isOpen) {
        closeCategoryDropdown();
    } else {
        renderCategoryDropdown();
        menu.classList.add('open');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
};

window.closeCategoryDropdown = function() {
    const menu = document.getElementById('desktop-category-dropdown');
    const arrow = document.getElementById('category-dropdown-arrow');
    if (menu) menu.classList.remove('open');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
};

function renderCategoryDropdown() {
    const listEl = document.getElementById('dropdown-categories-list');
    if (!listEl) return;
    const isAll = AppState.activeCategory === 'all';
    let html = `
        <button type="button" onclick="filterByCategory('all'); closeCategoryDropdown();" class="w-full flex items-center justify-between p-3 rounded-2xl transition text-left ${isAll ? 'bg-primary-50 text-primary-700 font-extrabold' : 'hover:bg-gray-50 text-gray-700 font-bold card-dark title-dark'}">
            <div class="flex items-center gap-3">
                <span class="text-lg">🛍️</span>
                <span class="text-sm">All Products</span>
            </div>
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${isAll ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 input-dark'}">${DB.products.length}</span>
        </button>
    `;
    DB.categories.forEach(cat => {
        const isAct = AppState.activeCategory === cat.id;
        const count = DB.products.filter(p => p.category === cat.id).length;
        html += `
        <button type="button" onclick="filterByCategory('${cat.id}'); closeCategoryDropdown();" class="w-full flex items-center justify-between p-3 rounded-2xl transition text-left ${isAct ? 'bg-primary-50 text-primary-700 font-extrabold' : 'hover:bg-gray-50 text-gray-700 font-bold card-dark title-dark'}">
            <div class="flex items-center gap-3">
                <span class="text-lg">${cat.icon}</span>
                <span class="text-sm">${cat.name}</span>
            </div>
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${isAct ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 input-dark'}">${count}</span>
        </button>`;
    });
    listEl.innerHTML = html;
}

function renderSidebars() {
    const deskContainer = document.getElementById('desktop-sidebar-categories');
    const mobContainer = document.getElementById('fs-categories-container');
    const activeAll = AppState.activeCategory === 'all';
    let html = `
        <div onclick="filterByCategory('all')" class="card-3d bg-white rounded-3xl p-5 text-center cursor-pointer hover:border-primary-500 border ${activeAll ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/40' : 'border-gray-100'} shadow-sm transition active:scale-95 card-dark border-dark">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center text-3xl mb-3 shadow-inner">🛍️</div>
            <h3 class="font-extrabold text-sm text-gray-900 title-dark">All Products</h3>
            <p class="text-[11px] font-bold text-primary-600 mt-1">${DB.products.length} Items</p>
        </div>`;
    DB.categories.forEach(cat => {
        const isAct = AppState.activeCategory === cat.id;
        const count = DB.products.filter(p => p.category === cat.id).length;
        html += `
        <div onclick="filterByCategory('${cat.id}')" class="card-3d bg-white rounded-3xl p-5 text-center cursor-pointer hover:border-primary-500 border ${isAct ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/40' : 'border-gray-100'} shadow-sm transition active:scale-95 card-dark border-dark">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-3 shadow-inner input-dark">${cat.icon}</div>
            <h3 class="font-extrabold text-sm text-gray-900 title-dark">${cat.name}</h3>
            <p class="text-[11px] font-bold text-gray-400 mt-1">${count} Items</p>
        </div>`;
    });
    if (deskContainer) deskContainer.innerHTML = html;
    if (mobContainer) mobContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.filterByCategory = function(catId) {
    AppState.activeCategory = catId;
    closeModal('category-full-modal');
    closeCategoryDropdown();
    const title = document.getElementById('grid-title');
    const iconEl = document.getElementById('grid-title-icon');
    const mobTitle = document.getElementById('mobile-grid-title');
    const mobIcon = document.getElementById('mobile-grid-icon');
    const mobResetBtn = document.getElementById('mobile-reset-filter-btn');

    if (catId === 'all') {
        if (title) title.innerText = "All Products";
        if (iconEl) iconEl.innerText = "🛍️";
        if (mobTitle) mobTitle.innerText = "Fresh Picks for You";
        if (mobIcon) mobIcon.innerText = "✨";
        if (mobResetBtn) mobResetBtn.classList.add('hidden');
        renderProducts(DB.products, 'products-container');
    } else {
        const cat = DB.categories.find(c => c.id === catId);
        const filtered = DB.products.filter(p => p.category === catId);
        if (title) title.innerText = cat ? cat.name : "Filtered Products";
        if (iconEl) iconEl.innerText = cat ? cat.icon : "🛍️";
        if (mobTitle) mobTitle.innerText = cat ? cat.name : "Filtered Products";
        if (mobIcon) mobIcon.innerText = cat ? cat.icon : "🛍️";
        if (mobResetBtn) mobResetBtn.classList.remove('hidden');
        renderProducts(filtered, 'products-container');
    }
    renderSidebars();
    renderCategoryDropdown();
};

function createProductCard(product) {
    const defaultVariant = product.variants && product.variants.length > 0
        ? product.variants[0]
        : { vId: product.id + 'a', size: 'Standard', price: 0, originalPrice: 0, stock: 10 };
    const isWished = AppState.wishlist.includes(product.id);
    const discount = defaultVariant.originalPrice > defaultVariant.price
        ? Math.round(((defaultVariant.originalPrice - defaultVariant.price) / defaultVariant.originalPrice) * 100)
        : 0;
    const inCartQty = AppState.cart
        .filter(c => c.pId == product.id)
        .reduce((sum, item) => sum + item.qty, 0);
    const fallbackSrc = getProductFallbackSVG(product.name, product.brand);

    return `
        <div class="product-card rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-3.5 flex flex-col relative group card-dark border-dark cursor-pointer select-none" onclick="openProductFS(${product.id})">
            <button type="button" onclick="event.stopPropagation(); toggleWishlist(${product.id}, event)" title="Save to Wishlist" class="btn-3d absolute top-2.5 right-2.5 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/95 backdrop-blur shadow-sm flex items-center justify-center hover:bg-red-50 transition ${isWished ? 'text-red-500' : 'text-gray-400'}">
                <i data-lucide="heart" class="w-4 h-4 ${isWished ? 'fill-current text-red-500' : ''}"></i>
            </button>
            <div class="relative w-full h-28 sm:h-32 md:h-40 mb-2.5 overflow-hidden bg-slate-50 rounded-2xl flex items-center justify-center border border-gray-100 p-2 input-dark">
                ${discount > 0 ? `<div class="absolute top-2 left-2 bg-primary-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-sm z-10 tracking-wider">${discount}% OFF</div>` : ''}
                <img src="${product.image}" onerror="this.onerror=null; this.src='${fallbackSrc}';" alt="${product.name}" class="max-h-full max-w-full object-contain">
            </div>
            <div class="flex-1 flex flex-col">
                <span class="text-[9px] md:text-[10px] text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-full font-extrabold mb-1.5 w-max tracking-wider uppercase">${product.brand}</span>
                <h3 class="font-extrabold text-gray-900 text-xs sm:text-sm leading-snug mb-2 line-clamp-2 title-dark" style="min-height: 2.25rem;">${product.name}</h3>
                <div class="flex justify-between items-center mt-auto">
                    <span class="text-[10px] md:text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold input-dark">${defaultVariant.size}</span>
                    <span class="text-[10px] flex items-center text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded-full"><i data-lucide="star" class="w-3 h-3 fill-current mr-0.5"></i> ${product.rating || 4.8}</span>
                </div>
                <div class="mt-2.5 pt-2.5 flex items-center justify-between border-t border-gray-100 border-dark">
                    <div class="flex flex-col">
                        <span class="text-sm sm:text-base md:text-lg font-black text-gray-900 leading-none tracking-tight title-dark">₹${defaultVariant.price}</span>
                        ${defaultVariant.originalPrice > defaultVariant.price ? `<span class="text-[10px] text-gray-400 line-through mt-0.5 font-bold">₹${defaultVariant.originalPrice}</span>` : '<span class="text-[10px] opacity-0">-</span>'}
                    </div>
                    <button type="button" onclick="event.stopPropagation(); addVariantToCartFast(${product.id})" title="Add to Cart" class="btn-3d relative w-9 h-9 md:w-10 md:h-10 rounded-full ${inCartQty > 0 ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white'} flex items-center justify-center transition-colors shadow-sm">
                        <i data-lucide="plus" class="w-4 h-4 md:w-5 md:h-5"></i>
                        ${inCartQty > 0 ? `<span class="absolute -top-1 -right-1 bg-gray-900 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">${inCartQty}</span>` : ''}
                    </button>
                </div>
            </div>
        </div>`;
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const countBadge = document.getElementById('product-count-badge');
    if (countBadge && containerId === 'products-container') {
        countBadge.innerText = `${productList.length} ${productList.length === 1 ? 'Item' : 'Items'}`;
    }
    if (productList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm card-dark border-dark">
                <div class="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 input-dark">
                    <i data-lucide="search-x" class="w-7 h-7"></i>
                </div>
                <p class="text-gray-700 text-sm md:text-base font-extrabold title-dark">No matching products found</p>
                <p class="text-gray-400 text-xs font-bold mt-1 mb-4">Try clearing your search or switching categories.</p>
                <button type="button" onclick="clearSearchInput(); filterByCategory('all');" class="btn-3d bg-primary-600 text-white px-6 py-2.5 rounded-full text-xs font-extrabold shadow-md">Reset Filters</button>
            </div>`;
    } else {
        container.innerHTML = productList.map(p => createProductCard(p)).join('');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- DEDICATED FULL-SCREEN PRODUCT DETAILS PAGE (Point 11: Clean, Compact & Fresh on Mobile & Laptop) ---
window.openProductFS = function(productId) {
    const p = DB.products.find(x => x.id == productId);
    if (!p) return;
    const isWished = AppState.wishlist.includes(p.id);
    const modalContent = document.getElementById('product-modal-content');
    if (!modalContent) return;

    window.currentModalQty = 1;
    const defaultVar = p.variants[0];
    const discount = defaultVar.originalPrice > defaultVar.price
        ? Math.round(((defaultVar.originalPrice - defaultVar.price) / defaultVar.originalPrice) * 100)
        : 0;
    const catObj = DB.categories.find(c => c.id === p.category);
    const fallbackSrc = getProductFallbackSVG(p.name, p.brand);

    const variantHTML = p.variants.map((v, index) => `
        <label class="cursor-pointer">
            <input type="radio" name="variant" data-pid="${p.id}" value="${v.vId}" class="peer sr-only variant-radio" ${index === 0 ? 'checked' : ''} onchange="updateModalPrice('${v.vId}', ${p.id})">
            <div class="px-3.5 py-2 md:px-4 md:py-2.5 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-700 transition shadow-sm hover:border-primary-400 bg-white input-dark">
                <div>${v.size}</div>
                <div class="text-[11px] font-black text-primary-600 mt-0.5">₹${v.price} ${v.originalPrice > v.price ? `<span class="text-[9px] text-gray-400 line-through ml-0.5">₹${v.originalPrice}</span>` : ''}</div>
            </div>
        </label>
    `).join('');

    const qtyControls = `
        <div class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 w-max shadow-inner input-dark">
            <button type="button" onclick="changeModalQty(-1)" class="text-gray-600 hover:text-red-500 font-bold active:scale-90 transition p-1"><i data-lucide="minus" class="w-4 h-4"></i></button>
            <span id="modal-qty-display" class="text-sm md:text-base font-black w-6 text-center title-dark">${window.currentModalQty}</span>
            <button type="button" onclick="changeModalQty(1)" class="text-gray-600 hover:text-green-600 font-bold active:scale-90 transition p-1"><i data-lucide="plus" class="w-4 h-4"></i></button>
        </div>
    `;

    const related = DB.products.filter(item => item.category === p.category && item.id != p.id).slice(0, 4);
    const relatedHTML = related.length > 0 ? `
        <div class="mt-6 md:mt-8 pt-6 border-t border-gray-200/80 border-dark">
            <div class="flex items-center justify-between mb-3.5">
                <h3 class="text-sm md:text-lg font-extrabold text-gray-900 title-dark">More in ${catObj ? catObj.name : 'Store'}</h3>
                <button type="button" onclick="closeModal('product-modal'); filterByCategory('${p.category}');" class="text-xs font-extrabold text-primary-600 hover:underline">View All →</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${related.map(r => `
                    <div onclick="openProductFS(${r.id})" class="product-card p-3 rounded-2xl border border-gray-100 bg-white cursor-pointer transition flex flex-col items-center text-center card-dark border-dark">
                        <div class="w-full h-20 sm:h-24 bg-slate-50 rounded-xl flex items-center justify-center p-2 mb-2 input-dark">
                            <img src="${r.image}" onerror="this.onerror=null; this.src='${getProductFallbackSVG(r.name, r.brand)}';" class="max-h-full max-w-full object-contain">
                        </div>
                        <div class="text-xs font-extrabold text-gray-900 line-clamp-1 title-dark">${r.name}</div>
                        <div class="text-[10px] font-bold text-gray-400 mt-0.5">${r.variants[0].size}</div>
                        <div class="text-xs font-black text-primary-600 mt-1">₹${r.variants[0].price}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    modalContent.innerHTML = `
        <!-- Main Compact & Fresh Product Card (Optimized for Mobile & Laptop) -->
        <div class="bg-white rounded-[1.75rem] md:rounded-[2.25rem] border border-gray-100 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 card-dark border-dark">
            <!-- Left / Top Image Showcase (Compact on Mobile) -->
            <div class="md:col-span-5 p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center relative bg-gradient-to-b from-slate-50/80 to-white border-b md:border-b-0 md:border-r border-gray-100 card-dark border-dark">
                <button type="button" onclick="toggleWishlistModalBtn(${p.id}, this)" class="btn-3d absolute top-3.5 right-3.5 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-red-50 transition shadow-sm ${isWished ? 'text-red-500' : 'text-gray-400'}">
                    <i data-lucide="heart" class="w-4 h-4 md:w-5 md:h-5 ${isWished ? 'fill-current text-red-500' : ''}"></i>
                </button>
                ${discount > 0 ? `<div class="self-start mb-1 bg-primary-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm tracking-wider uppercase">${discount}% OFF</div>` : ''}
                <div class="w-full h-44 sm:h-52 md:h-64 flex items-center justify-center p-2">
                    <img src="${p.image}" onerror="this.onerror=null; this.src='${fallbackSrc}';" alt="${p.name}" class="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-500 hover:scale-105">
                </div>
                <div class="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-gray-100 text-center border-dark">
                    <div class="p-2 rounded-xl bg-slate-50 input-dark">
                        <div class="text-[9px] font-extrabold text-primary-600 uppercase">100% Genuine</div>
                        <div class="text-[9px] text-gray-500 font-bold subtitle-dark">Fresh Batch</div>
                    </div>
                    <div class="p-2 rounded-xl bg-slate-50 input-dark">
                        <div class="text-[9px] font-extrabold text-primary-600 uppercase">Fast Drop</div>
                        <div class="text-[9px] text-gray-500 font-bold subtitle-dark">Doorstep</div>
                    </div>
                    <div class="p-2 rounded-xl bg-slate-50 input-dark">
                        <div class="text-[9px] font-extrabold text-primary-600 uppercase">Easy Pay</div>
                        <div class="text-[9px] text-gray-500 font-bold subtitle-dark">COD / UPI</div>
                    </div>
                </div>
            </div>

            <!-- Right / Bottom Details & Actions -->
            <div class="md:col-span-7 p-4 sm:p-6 md:p-8 flex flex-col">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] md:text-[10px] font-black text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-primary-100">${p.brand}</span>
                        ${catObj ? `<span class="text-[9px] md:text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full input-dark">${catObj.icon} ${catObj.name}</span>` : ''}
                    </div>
                    <span class="flex items-center text-yellow-700 bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-100 text-[11px] font-extrabold">
                        <i data-lucide="star" class="w-3 h-3 fill-current mr-1 text-yellow-500"></i> ${p.rating || 4.8} <span class="text-gray-400 font-semibold ml-1">(${p.reviews || 100})</span>
                    </span>
                </div>
                
                <h1 class="text-base sm:text-lg md:text-2xl font-black text-gray-900 leading-snug mb-1.5 title-dark">${p.name}</h1>
                
                <p class="text-xs md:text-sm text-gray-500 font-medium leading-relaxed mb-4 subtitle-dark">${p.description || 'Premium quality daily essential carefully sourced for your household needs.'}</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Select Pack Size</h3>
                        <div class="flex flex-wrap gap-2">${variantHTML}</div>
                    </div>
                    <div>
                        <h3 class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Quantity</h3>
                        ${qtyControls}
                    </div>
                </div>

                <!-- Clean Responsive Action Bar (Single-Line Non-Wrapping Buttons on Mobile & Desktop) -->
                <div class="mt-auto pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-dark">
                    <div class="flex items-center justify-between sm:block">
                        <span class="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total Payable</span>
                        <div id="modal-price-display" class="text-2xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight title-dark">₹${defaultVar.price}</div>
                    </div>
                    <div class="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
                        <button type="button" id="modal-add-btn" onclick="addVariantToCart(${p.id})" class="btn-3d whitespace-nowrap w-full sm:w-auto bg-primary-600 text-white h-12 px-5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-primary-500/25 hover:bg-primary-700 transition inline-flex items-center justify-center gap-2">
                            <i data-lucide="shopping-bag" class="w-4 h-4 flex-shrink-0"></i>
                            <span>Add to Cart</span>
                        </button>
                        <button type="button" onclick="buyNowProduct(${p.id})" class="btn-3d whitespace-nowrap w-full sm:w-auto bg-gray-900 text-white h-12 px-5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-md hover:bg-black transition inline-flex items-center justify-center gap-1.5">
                            <span>Buy Now</span>
                            <i data-lucide="arrow-right" class="w-4 h-4 flex-shrink-0"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        ${relatedHTML}
    `;
    updateModalPrice(defaultVar.vId, p.id);
    openModal('product-modal');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.updateModalPrice = function(vId, pId) {
    const p = DB.products.find(x => x.id == pId);
    if (!p) return;
    const v = p.variants.find(x => x.vId === vId) || p.variants[0];
    const display = document.getElementById('modal-price-display');
    if (display && v) {
        const total = v.price * window.currentModalQty;
        const origTotal = v.originalPrice * window.currentModalQty;
        display.innerHTML = `₹${total}` + (origTotal > total ? ` <span class="text-xs text-gray-400 line-through font-bold ml-1">₹${origTotal}</span>` : '');
    }
};

window.addVariantToCart = function(pId) {
    const selectedRadio = document.querySelector('input[name="variant"]:checked');
    const p = DB.products.find(x => x.id == pId);
    if (!p) return;
    const v = selectedRadio ? (p.variants.find(x => x.vId === selectedRadio.value) || p.variants[0]) : p.variants[0];
    
    const existing = AppState.cart.find(c => c.vId === v.vId);
    if (existing) existing.qty += window.currentModalQty;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: window.currentModalQty });
    
    saveState(); 
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
    showPremiumAlert('Added to Cart', `${window.currentModalQty}x ${p.name} (${v.size}) added to your cart.`, 'check-circle'); 
};

window.buyNowProduct = function(pId) {
    const selectedRadio = document.querySelector('input[name="variant"]:checked');
    const p = DB.products.find(x => x.id == pId);
    if (!p) return;
    const v = selectedRadio ? (p.variants.find(x => x.vId === selectedRadio.value) || p.variants[0]) : p.variants[0];

    const existing = AppState.cart.find(c => c.vId === v.vId);
    if (existing) existing.qty += window.currentModalQty;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: window.currentModalQty });

    saveState();
    openModal('cart-drawer');
};

window.addVariantToCartFast = function(pId) {
    const p = DB.products.find(x => x.id == pId);
    if (!p) return;
    const v = p.variants[0];
    const existing = AppState.cart.find(c => c.vId === v.vId);
    if (existing) existing.qty += 1;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: 1 });
    saveState();
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
    showPremiumAlert('Added to Cart', `${p.name} (${v.size}) has been added to your cart.`, 'check-circle'); 
};

window.clearEntireCart = function() {
    AppState.cart = [];
    saveState();
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
    showPremiumAlert('Cart Cleared', 'All items have been removed from your cart.', 'info');
};

window.updateGlobalUI = function() {
    const totalQty = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
    const totalAmt = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const headTotal = document.getElementById('header-cart-total');
    if (headTotal) headTotal.innerText = `₹${totalAmt}`;

    const prodPageCartTotal = document.getElementById('product-page-cart-total');
    if (prodPageCartTotal) prodPageCartTotal.innerText = `₹${totalAmt}`;

    const headCount = document.getElementById('header-cart-count');
    if (headCount) {
        if (totalQty > 0) {
            headCount.innerText = totalQty;
            headCount.classList.remove('hidden');
        } else {
            headCount.classList.add('hidden');
        }
    }

    // Mobile Floating Cart Bar
    const mobFloatCart = document.getElementById('mobile-floating-cart');
    const mobFloatQty = document.getElementById('mobile-float-qty');
    const mobFloatTotal = document.getElementById('mobile-float-total');
    if (mobFloatCart) {
        if (totalQty > 0) {
            mobFloatCart.classList.remove('hidden');
            if (mobFloatQty) mobFloatQty.innerText = `${totalQty}`;
            if (mobFloatTotal) mobFloatTotal.innerText = `₹${totalAmt}`;
        } else {
            mobFloatCart.classList.add('hidden');
        }
    }

    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        if (totalQty > 0) clearCartBtn.classList.remove('hidden');
        else clearCartBtn.classList.add('hidden');
    }
    
    const dot = document.getElementById('settings-dot');
    const navDot = document.getElementById('nav-cart-badge');
    const settingsCartCount = document.getElementById('settings-cart-count');
    
    if (settingsCartCount) {
        settingsCartCount.innerText = totalQty;
    }

    if (totalQty > 0) {
        if (navDot) { navDot.innerText = totalQty; navDot.classList.remove('hidden'); navDot.classList.add('flex'); }
    } else {
        if (navDot) { navDot.classList.add('hidden'); navDot.classList.remove('flex'); }
    }

    const wishCount = AppState.wishlist.length;
    const settingsWishCount = document.getElementById('settings-wishlist-count');
    if (settingsWishCount) {
        if (wishCount > 0) {
            settingsWishCount.innerText = `${wishCount} Saved`;
            settingsWishCount.classList.remove('hidden');
        } else {
            settingsWishCount.classList.add('hidden');
        }
    }
    
    const cartContainer = document.getElementById('cart-items');
    if (cartContainer) {
        if (AppState.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="bg-white rounded-[1.75rem] border border-gray-100 p-10 text-center flex flex-col items-center shadow-sm card-dark border-dark">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4 shadow-inner input-dark"><i data-lucide="shopping-cart" class="w-10 h-10"></i></div>
                    <h3 class="text-lg font-extrabold text-gray-900 mb-1.5 title-dark">Your cart is empty</h3>
                    <p class="text-xs sm:text-sm font-medium text-gray-500 mb-6 subtitle-dark">Add your everyday essentials and enjoy fast doorstep delivery.</p>
                    <button type="button" onclick="closeAllFullPages(); scrollToProducts();" class="btn-3d bg-primary-600 text-white px-7 py-3 rounded-full font-extrabold shadow-lg shadow-primary-500/30 text-xs sm:text-sm">Browse Store</button>
                </div>`;
        } else {
            cartContainer.innerHTML = AppState.cart.map(item => {
                const fallbackSrc = getProductFallbackSVG(item.name, 'FreshMart');
                return `
                <div class="flex items-center gap-3.5 bg-white p-3.5 md:p-4 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition card-dark border-dark">
                    <img src="${item.image}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="w-16 h-16 md:w-20 md:h-20 object-contain bg-slate-50 rounded-xl border border-gray-100 p-1.5 cursor-pointer input-dark" onclick="openProductFS(${item.pId});">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 truncate title-dark cursor-pointer hover:text-primary-600" onclick="openProductFS(${item.pId});">${item.name}</h4>
                        <div class="text-[10px] md:text-[11px] text-gray-500 font-bold mt-0.5 bg-gray-50 px-2.5 py-0.5 rounded-full w-max border border-gray-100 input-dark">${item.size} • ₹${item.price} each</div>
                        <div class="flex justify-between items-center mt-2.5">
                            <span class="text-primary-600 font-black text-sm md:text-lg">₹${item.price * item.qty}</span>
                            <div class="flex gap-2 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 items-center shadow-inner input-dark">
                                <button type="button" onclick="updateCartQty('${item.vId}', -1)" class="btn-3d text-gray-500 hover:text-red-500 font-bold p-1"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
                                <span class="text-xs md:text-sm font-black w-5 text-center title-dark">${item.qty}</span>
                                <button type="button" onclick="updateCartQty('${item.vId}', 1)" class="btn-3d text-gray-500 hover:text-primary-600 font-bold p-1"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
        const cartFooter = document.getElementById('cart-footer');
        if (cartFooter) cartFooter.style.display = AppState.cart.length === 0 ? 'none' : 'block';
    }
    const cartSub = document.getElementById('cart-subtotal');
    if (cartSub) cartSub.innerText = `₹${totalAmt}`;
    const cartTot = document.getElementById('cart-total');
    if (cartTot) cartTot.innerText = `₹${totalAmt > 0 ? totalAmt + DB.settings.deliveryFee : 0}`;
    
    const cartPayMode = document.getElementById('cart-payment-mode');
    if (cartPayMode) cartPayMode.innerText = AppState.paymentMethod || 'Cash on Delivery';

    const settingsPayBadge = document.getElementById('settings-payment-badge');
    if (settingsPayBadge) {
        settingsPayBadge.innerText = (AppState.paymentMethod || '').includes('UPI') ? 'UPI' : ((AppState.paymentMethod || '').includes('Card') ? 'Card' : 'COD');
    }

    const langStatus = document.getElementById('lang-status');
    if (langStatus) langStatus.innerText = AppState.language || 'English';

    const addrText = document.getElementById('selected-address-text');
    if (addrText) {
        if (AppState.address && AppState.address.name) {
            addrText.innerText = `${AppState.address.type || 'Home'}: ${AppState.address.name} (${AppState.address.phone}) - ${AppState.address.full}`;
        } else {
            addrText.innerText = 'No address selected (Click Change to add address)';
        }
    }

    const wishContainer = document.getElementById('wishlist-container');
    if (wishContainer) {
        const wishProducts = DB.products.filter(p => AppState.wishlist.includes(p.id));
        if (wishProducts.length === 0) {
            wishContainer.innerHTML = `
                <div class="bg-white rounded-[1.75rem] border border-gray-100 p-10 text-center flex flex-col items-center shadow-sm card-dark border-dark">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4 shadow-inner input-dark"><i data-lucide="heart" class="w-10 h-10"></i></div>
                    <h3 class="text-lg font-extrabold text-gray-900 mb-1.5 title-dark">Wishlist is empty</h3>
                    <p class="text-xs sm:text-sm font-medium text-gray-500 mb-6 subtitle-dark">Tap the heart icon on any product to save it here.</p>
                    <button type="button" onclick="closeAllFullPages(); scrollToProducts();" class="btn-3d bg-primary-600 text-white px-7 py-3 rounded-full font-extrabold shadow-lg shadow-primary-500/30 text-xs sm:text-sm">Explore Products</button>
                </div>`;
        } else {
            wishContainer.innerHTML = wishProducts.map(p => {
                const fallbackSrc = getProductFallbackSVG(p.name, p.brand);
                return `
                <div class="flex items-center gap-3.5 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm card-dark border-dark">
                    <img src="${p.image}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="w-14 h-14 rounded-xl bg-gray-50 object-contain border border-gray-100 p-1 cursor-pointer input-dark" onclick="openProductFS(${p.id});">
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="openProductFS(${p.id});">
                        <div class="text-xs sm:text-sm font-extrabold text-gray-900 truncate title-dark">${p.name}</div>
                        <div class="text-[11px] text-gray-400 font-bold">${p.variants[0].size}</div>
                        <div class="text-primary-600 text-xs sm:text-sm font-black mt-0.5">₹${p.variants[0].price}</div>
                    </div>
                    <button type="button" onclick="moveWishToCart(${p.id})" class="btn-3d px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs rounded-full shadow-sm whitespace-nowrap">Move to Cart</button>
                    <button type="button" onclick="toggleWishlist(${p.id}, event)" class="btn-3d w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;
            }).join('');
        }
    }
    
    const safeName = (AppState.profile && AppState.profile.name) ? AppState.profile.name : 'Sahil Sharma';
    const parts = safeName.trim().split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : safeName.substring(0, 2).toUpperCase();
    const profName = document.getElementById('profile-name-display');
    const profPhone = document.getElementById('profile-phone-display');
    const profInit = document.getElementById('profile-initials');
    const verifiedBadge = document.getElementById('profile-verified-badge');
    const authLink = document.getElementById('settings-auth-link');
    const themeStatus = document.getElementById('theme-status');
    
    if (profName) profName.innerText = safeName;
    if (profPhone) {
        const rawPhone = (AppState.profile && AppState.profile.phone) ? String(AppState.profile.phone).replace(/\D/g, '') : '';
        if (rawPhone.length === 10) {
            profPhone.innerText = `+91 ${rawPhone.substring(0, 5)} ${rawPhone.substring(5)}`;
        } else {
            profPhone.innerText = AppState.profile?.phone || '+91 79883 00872';
        }
    }
    if (profInit) profInit.innerText = initials || 'SM';
    if (verifiedBadge) verifiedBadge.innerText = AppState.isAuthenticated ? 'Verified' : 'Guest';
    if (authLink) authLink.innerText = AppState.isAuthenticated ? 'Switch Account' : 'Login / Sign Up';
    if (themeStatus) themeStatus.innerText = AppState.theme || 'Light';

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.moveWishToCart = function(pId) {
    window.addVariantToCartFast(pId);
    const index = AppState.wishlist.indexOf(pId);
    if (index !== -1) AppState.wishlist.splice(index, 1);
    saveState();
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
    showPremiumAlert('Moved to Cart', "Item successfully moved from Wishlist to Cart.");
};

window.updateCartQty = function(vId, change) { 
    const item = AppState.cart.find(c => c.vId === vId); 
    if (!item) return; 
    item.qty += change; 
    if (item.qty <= 0) AppState.cart = AppState.cart.filter(c => c.vId !== vId); 
    saveState(); 
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
};

window.toggleWishlist = function(pId, event) { 
    if (event) { event.stopPropagation(); event.preventDefault(); } 
    const index = AppState.wishlist.indexOf(pId); 
    if (index === -1) {
        AppState.wishlist.push(pId);
        showPremiumAlert("Wishlist", "Added to your Wishlist (View in Settings → Wishlist)");
    } else {
        AppState.wishlist.splice(index, 1);
        showPremiumAlert("Wishlist", "Removed from your Wishlist");
    } 
    saveState(); 
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    ); 
};

window.toggleWishlistModalBtn = function(pId, btnEl) {
    toggleWishlist(pId, null);
    const isWished = AppState.wishlist.includes(pId);
    if (isWished) {
        btnEl.classList.add('text-red-500');
        btnEl.classList.remove('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-4 h-4 md:w-5 md:h-5 fill-current text-red-500"></i>`;
    } else {
        btnEl.classList.remove('text-red-500');
        btnEl.classList.add('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-4 h-4 md:w-5 md:h-5"></i>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.loadProfileData = function() {
    const nameInput = document.getElementById('prof-name');
    const phoneInput = document.getElementById('prof-phone');
    const emailInput = document.getElementById('prof-email');
    const editInit = document.getElementById('edit-initials');
    const currentName = (AppState.profile && AppState.profile.name) ? AppState.profile.name : 'Sahil Sharma';
    const currentPhone = (AppState.profile && AppState.profile.phone) ? String(AppState.profile.phone).replace(/\D/g, '').slice(-10) : '7988300872';
    const currentEmail = (AppState.profile && AppState.profile.email) ? AppState.profile.email : 'sahil@freshmart.com';

    if (nameInput) nameInput.value = currentName;
    if (phoneInput) phoneInput.value = currentPhone;
    if (emailInput) emailInput.value = currentEmail;
    if (editInit) {
        const parts = currentName.trim().split(/\s+/).filter(Boolean);
        editInit.innerText = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : currentName.substring(0, 2).toUpperCase();
    }
};

window.saveProfile = function() {
    const nameEl = document.getElementById('prof-name');
    const phoneEl = document.getElementById('prof-phone');
    const emailEl = document.getElementById('prof-email');
    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim().replace(/\D/g, '') : '';
    const email = emailEl ? emailEl.value.trim() : '';

    if (!name || phone.length !== 10) {
        return showPremiumAlert('Error', 'Please enter a valid Full Name and 10-digit Mobile Number.', 'error');
    }

    AppState.profile.name = name;
    AppState.profile.phone = phone;
    if (email) AppState.profile.email = email;
    AppState.isAuthenticated = true;
    safeSetStorage('freshmart_user', { name, mobile: phone, email: AppState.profile.email });
    saveAccountToHistory(AppState.profile);
    saveState();
    goBackOneStep();
    showPremiumAlert('Profile Updated', 'Your profile details have been updated successfully!', 'check-circle');
};

function syncPaymentModal() {
    const radios = document.querySelectorAll('input[name="payment_method"]');
    radios.forEach(r => {
        r.checked = (r.value === (AppState.paymentMethod || 'Cash on Delivery'));
    });
}

window.savePaymentMethod = function(method) {
    AppState.paymentMethod = method;
    saveState();
    goBackOneStep();
    showPremiumAlert('Payment Method Saved', `Default checkout payment set to ${method}.`, 'check-circle');
};

function syncLanguageModal() {
    const radios = document.querySelectorAll('input[name="app_lang"]');
    radios.forEach(r => {
        r.checked = (r.value === (AppState.language || 'English'));
    });
}

window.updateLanguage = function(lang) {
    AppState.language = lang;
    saveState();
    goBackOneStep();
    showPremiumAlert('Language Updated', `Preferred language set to ${lang}.`, 'check-circle');
};

window.loadAddressData = function() {
    if (!AppState.address) return;
    const nameEl = document.getElementById('addr-name');
    const phoneEl = document.getElementById('addr-phone');
    const houseEl = document.getElementById('addr-house');
    const cityEl = document.getElementById('addr-city');
    const pinEl = document.getElementById('addr-pin');

    if (nameEl && AppState.address.name) nameEl.value = AppState.address.name;
    if (phoneEl && AppState.address.phone) phoneEl.value = AppState.address.phone;
    if (houseEl && AppState.address.house) houseEl.value = AppState.address.house;
    if (cityEl && AppState.address.city) cityEl.value = AppState.address.city;
    if (pinEl && AppState.address.pin) pinEl.value = AppState.address.pin;

    if (AppState.address.type) {
        const radio = document.querySelector(`input[name="addr_type"][value="${AppState.address.type}"]`);
        if (radio) radio.checked = true;
    }
};

window.autoFillLocation = function() {
    const cityEl = document.getElementById('addr-city');
    const pinEl = document.getElementById('addr-pin');
    const houseEl = document.getElementById('addr-house');
    if (cityEl) cityEl.value = 'Fetching...';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            () => { 
                setTimeout(() => {
                    if (cityEl) cityEl.value = 'Hisar';
                    if (pinEl) pinEl.value = '125001';
                    if (houseEl && !houseEl.value) houseEl.value = 'Model Town, Main Market';
                    showPremiumAlert('Location Found', 'City and Pincode filled based on your current location.');
                }, 500);
            },
            () => {
                if (cityEl) cityEl.value = 'Hisar';
                if (pinEl) pinEl.value = '125001';
                if (houseEl && !houseEl.value) houseEl.value = 'Sector 14, Main Road';
                showPremiumAlert('Location Assisted', 'Default service area (Hisar - 125001) filled. You can edit as needed.');
            }
        );
    } else {
        if (cityEl) cityEl.value = 'Hisar';
        if (pinEl) pinEl.value = '125001';
        showPremiumAlert('Location Assisted', 'Service area filled automatically.');
    }
};

window.saveAddress = function() {
    const typeEl = document.querySelector('input[name="addr_type"]:checked');
    const name = document.getElementById('addr-name')?.value.trim() || ''; 
    const phone = document.getElementById('addr-phone')?.value.trim().replace(/\D/g, '') || ''; 
    const house = document.getElementById('addr-house')?.value.trim() || '';
    const city = document.getElementById('addr-city')?.value.trim() || '';
    const pin = document.getElementById('addr-pin')?.value.trim() || '';
    
    if (!name || !phone || !house || !city || !pin) {
        return showPremiumAlert('Error', "Please fill all address fields!", 'error');
    }
    if (phone.length !== 10 || isNaN(phone)) {
        return showPremiumAlert('Invalid Input', "Invalid Mobile Number! Must be exactly 10 digits.", 'error');
    }
    
    const fullStr = `${house}, ${city} - ${pin}`;
    AppState.address = {
        type: typeEl ? typeEl.value : 'Home',
        name,
        phone,
        house,
        city,
        pin,
        full: fullStr
    }; 
    saveState(); 
    
    const addrText = document.getElementById('selected-address-text');
    if (addrText) addrText.innerText = `${AppState.address.type}: ${name}, ${fullStr}`;
    
    goBackOneStep(); 
    showPremiumAlert('Saved', "Delivery address saved successfully!");
};

window.loadOrders = function() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    let orders = safeGetStorage('freshmart_orders', null);
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        orders = [
            { id: 'FM-9082', date: '05 Oct 2026', total: 350, status: 'Delivered', items: [{ pId: 2, qty: 1 }, { pId: 7, qty: 2 }] },
            { id: 'FM-8810', date: '12 Sep 2026', total: 820, status: 'Delivered', items: [{ pId: 9, qty: 2 }, { pId: 10, qty: 2 }] }
        ];
        safeSetStorage('freshmart_orders', orders);
    }

    container.innerHTML = orders.map(o => `
        <div class="card-3d bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition card-dark border-dark">
            <div class="flex justify-between items-center mb-3.5 pb-3 border-b border-gray-100 border-dark">
                <div>
                    <div class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Order #${o.id}</div>
                    <div class="text-sm font-extrabold text-gray-900 mt-0.5 title-dark">${o.date}</div>
                </div>
                <span class="${o.status === 'Delivered' || o.status === 'Success' ? 'bg-green-50 text-green-600 border-green-100' : (o.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100')} border px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">${o.status}</span>
            </div>
            <div class="flex justify-between items-center">
                <div class="font-black text-gray-900 text-lg md:text-xl tracking-tight title-dark">₹${o.total}</div>
                <button type="button" onclick="reorderItems('${o.id}')" class="btn-3d text-primary-700 font-extrabold text-xs uppercase tracking-wider bg-primary-50 border border-primary-100 px-4 py-2 rounded-full hover:bg-primary-100 transition shadow-sm">Reorder</button>
            </div>
        </div>
    `).join('');
};

window.reorderItems = function(orderId) {
    const orders = safeGetStorage('freshmart_orders', []);
    const order = orders.find(o => o.id === orderId);
    if (order && Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
            const p = DB.products.find(x => x.id == it.pId);
            if (p) {
                const v = p.variants[0];
                const existing = AppState.cart.find(c => c.vId === v.vId);
                if (existing) existing.qty += (it.qty || 1);
                else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: it.qty || 1 });
            }
        });
    } else {
        const p = DB.products[0];
        if (p) {
            const v = p.variants[0];
            const existing = AppState.cart.find(c => c.vId === v.vId);
            if (existing) existing.qty += 1;
            else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: 1 });
        }
    }
    saveState();
    openModal('cart-drawer');
    showPremiumAlert('Order Added', `Items from Order #${orderId} have been added to your cart!`, 'check-circle');
};

// ============================================================================
// NOTIFICATION READ/UNREAD MANAGEMENT (Connected to Header User Icon & Red Dot)
// Persists read/unread state in localStorage ('freshmart_notifs') until Supabase
// `user_notifications` table is connected.
// ============================================================================
window.markSingleNotificationRead = function(notifId) {
    let notifs = safeGetStorage('freshmart_notifs', []);
    let changed = false;
    notifs = notifs.map(n => {
        if (String(n.id) === String(notifId) && !n.read) {
            changed = true;
            return { ...n, read: true, readAt: new Date().toISOString() };
        }
        return n;
    });
    if (changed) {
        safeSetStorage('freshmart_notifs', notifs);
        const allReadNow = notifs.every(n => Boolean(n.read));
        safeSetStorage('freshmart_notifs_all_read', allReadNow);
    }
    window.loadNotifications();
};

window.markAllNotificationsRead = function() {
    let notifs = safeGetStorage('freshmart_notifs', []);
    const nowIso = new Date().toISOString();
    notifs = notifs.map(n => ({ ...n, read: true, readAt: n.readAt || nowIso }));
    safeSetStorage('freshmart_notifs', notifs);
    safeSetStorage('freshmart_notifs_all_read', true);
    window.loadNotifications();
};

window.loadNotifications = function() {
    const container = document.getElementById('notification-container');
    const badge = document.getElementById('notif-count-badge');
    const badgeMain = document.getElementById('notif-count-badge-main');
    const settingsDot = document.getElementById('settings-dot');
    const navSettingsDot = document.getElementById('nav-settings-dot');
    const markAllBtn = document.getElementById('mark-all-notifs-read-btn');

    let notifs = safeGetStorage('freshmart_notifs', []);
    const now = new Date().getTime();
    notifs = notifs.filter(n => !n.expires || n.expires > now);

    if (notifs.length === 0) {
        const allReadPreviously = Boolean(safeGetStorage('freshmart_notifs_all_read', false));
        notifs = [
            {
                id: 1,
                status: 'Success',
                title: 'Order #FM-9082 Delivered',
                msg: 'Your grocery pack was delivered at your doorstep.',
                read: allReadPreviously,
                expires: now + 7 * 86400000
            },
            {
                id: 2,
                status: 'Success',
                title: 'Super Saver Offer Active!',
                msg: 'Get up to 15% OFF on Aashirvaad Atta, Basmati Rice & Cooking Oils today.',
                read: allReadPreviously,
                expires: now + 7 * 86400000
            },
            {
                id: 3,
                status: 'Success',
                title: 'Express 1-Click WhatsApp Order',
                msg: 'Checkout directly on WhatsApp with Cash or UPI on Delivery.',
                read: allReadPreviously,
                expires: now + 7 * 86400000
            }
        ];
        safeSetStorage('freshmart_notifs', notifs);
    }

    const unreadCount = notifs.filter(n => !n.read).length;

    // 1. Settings row badge ("X New")
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = `${unreadCount} New`;
            badge.classList.remove('hidden');
            badge.style.display = 'inline-block';
        } else {
            badge.innerText = '';
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }
    }

    // 2. Top-right Header User Icon number (#notif-count-badge-main) & Red Dot (#settings-dot)
    if (badgeMain) {
        if (unreadCount > 0) {
            badgeMain.innerText = String(unreadCount);
            badgeMain.classList.remove('hidden');
            badgeMain.style.display = 'inline';
        } else {
            badgeMain.innerText = '';
            badgeMain.classList.add('hidden');
            badgeMain.style.display = 'none';
        }
    }
    if (settingsDot) {
        settingsDot.classList.toggle('hidden', unreadCount === 0);
        settingsDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    if (navSettingsDot) {
        navSettingsDot.classList.toggle('hidden', unreadCount === 0);
        navSettingsDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    if (markAllBtn) {
        markAllBtn.disabled = unreadCount === 0;
        markAllBtn.style.opacity = unreadCount === 0 ? '0.5' : '1';
        markAllBtn.textContent = unreadCount === 0 ? 'All Read ✓' : `Mark all as read (${unreadCount})`;
    }

    if (!container) return;

    container.innerHTML = notifs.map(n => {
        const isUnread = !n.read;
        return `
        <div onclick="markSingleNotificationRead(${n.id})" class="card-3d cursor-pointer transition p-4 rounded-2xl border ${isUnread ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-500/15' : 'bg-slate-50/80 border-gray-200/80 opacity-80'} card-dark border-dark flex gap-3.5 items-start justify-between">
            <div class="flex gap-3.5 items-start min-w-0">
                <div class="w-11 h-11 rounded-xl ${isUnread ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center flex-shrink-0 input-dark">
                    <i data-lucide="${n.status === 'Success' ? 'check-circle' : 'bell'}" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="font-extrabold text-xs sm:text-sm ${isUnread ? 'text-gray-900' : 'text-gray-500'} title-dark">${n.title || 'Store Notification'}</h4>
                        ${isUnread
                            ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Unread</span>'
                            : '<span class="text-[10px] font-bold text-gray-400">Read ✓</span>'}
                    </div>
                    <p class="text-xs ${isUnread ? 'text-gray-600 font-semibold' : 'text-gray-400 font-medium'} mt-1 subtitle-dark">${n.msg}</p>
                    ${isUnread ? '<span class="inline-block mt-1.5 text-[10px] font-extrabold text-primary-600 hover:underline">Tap to mark as read</span>' : ''}
                </div>
            </div>
        </div>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function syncAppearanceModal() {
    const lightRadio = document.getElementById('theme-radio-light');
    const darkRadio = document.getElementById('theme-radio-dark');
    const sysRadio = document.getElementById('theme-radio-system');
    const current = AppState.theme || 'Light';
    if (lightRadio) lightRadio.checked = (current === 'Light');
    if (darkRadio) darkRadio.checked = (current === 'Dark' || current === 'Dark Mode');
    if (sysRadio) sysRadio.checked = (current === 'System');
}

window.updateThemeText = function(radioEl) {
    const el = document.getElementById('theme-status');
    if (el) el.innerText = radioEl.value;
    AppState.theme = radioEl.value;
    saveState();
    applyTheme();
    goBackOneStep();
    showPremiumAlert('Appearance Updated', `Theme set to ${radioEl.value}`);
};

function applyTheme() {
    const appBody = document.getElementById('app-body') || document.body;
    if (!appBody) return;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = AppState.theme === 'Dark' || AppState.theme === 'Dark Mode' || (AppState.theme === 'System' && prefersDark);

    if (useDark) {
        appBody.classList.add('bg-gray-900', 'text-white');
        appBody.classList.remove('bg-slate-50', 'bg-gray-50', 'text-gray-900');
        if (!document.getElementById('dark-theme-style')) {
            const style = document.createElement('style');
            style.id = 'dark-theme-style';
            style.innerHTML = `
                .card-dark { background-color: #1f2937 !important; color: #f9fafb !important; }
                .title-dark { color: #f9fafb !important; }
                .subtitle-dark { color: #9ca3af !important; }
                .header-dark { background-color: rgba(17, 24, 39, 0.95) !important; border-color: #374151 !important; }
                .input-dark { background-color: #374151 !important; color: #f9fafb !important; border-color: #4b5563 !important; }
                .hero-dark { background: linear-gradient(to bottom right, #111827, #1f2937) !important; border-color: #374151 !important; }
                .border-dark { border-color: #374151 !important; }
                .settings-item.card-dark:hover { background-color: #374151 !important; }
                .full-page-view { background-color: #111827 !important; }
                .search-icon-badge { background-color: rgba(16, 185, 129, 0.18) !important; color: #34d399 !important; }
                .footer-section-badge { background-color: rgba(16, 185, 129, 0.14) !important; border-color: rgba(16, 185, 129, 0.3) !important; color: #34d399 !important; }
                .footer-nav-link { color: #d1d5db !important; }
                .footer-nav-link:hover { color: #34d399 !important; }
            `;
            document.head.appendChild(style);
        }
    } else {
        appBody.classList.remove('bg-gray-900', 'text-white');
        appBody.classList.add('bg-slate-50', 'text-gray-900');
        const style = document.getElementById('dark-theme-style');
        if (style) style.remove();
    }
    syncAppearanceModal();
}

window.checkoutWhatsApp = function() {
    if (AppState.cart.length === 0) {
        return showPremiumAlert('Empty Cart', "Your cart is empty. Add items first.", 'error');
    }
    if (!AppState.address || !AppState.address.name) {
        openModal('address-modal');
        return showPremiumAlert('Address Required', "Please enter your delivery address to complete your WhatsApp order.", 'info');
    }

    let subtotal = 0;
    const payMode = AppState.paymentMethod || 'Cash on Delivery';
    let text = `*NEW ORDER - FRESHMART* 🛍️%0A%0A*Customer:* ${AppState.address.name}%0A*Phone:* ${AppState.address.phone}%0A%0A*Ordered Items:*%0A`;
    AppState.cart.forEach((item, index) => { 
        subtotal += item.price * item.qty; 
        text += `${index + 1}. ${item.name} (${item.size}) x ${item.qty} = ₹${item.price * item.qty}%0A`; 
    });
    const total = subtotal + DB.settings.deliveryFee;
    text += `%0A*Subtotal:* ₹${subtotal}%0A*Delivery Fee:* ₹${DB.settings.deliveryFee}%0A*Payment Mode:* ${payMode}%0A*Total Payable:* ₹${total}%0A%0A*Address Type:* ${AppState.address.type}%0A*Address:* ${AppState.address.full}`;
    
    let orders = safeGetStorage('freshmart_orders', []);
    const newOrderId = 'FM-' + Math.floor(Math.random() * 9000 + 1000);
    orders.unshift({
        id: newOrderId,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: total,
        status: 'Processing',
        items: AppState.cart.map(c => ({ pId: c.pId, qty: c.qty }))
    });
    safeSetStorage('freshmart_orders', orders);

    const waUrl = `https://wa.me/${DB.settings.whatsappNumber}?text=${text}`;
    AppState.cart = [];
    saveState();
    renderProducts(
        AppState.activeCategory === 'all' ? DB.products : DB.products.filter(x => x.category === AppState.activeCategory),
        'products-container'
    );
    closeAllFullPages();
    showPremiumAlert('Order Placed!', `Order #${newOrderId} (₹${total}) created! Redirecting to WhatsApp...`, 'check-circle');
    setTimeout(() => {
        window.open(waUrl, '_blank');
    }, 400);
};

// Mobile Swipe Right Gesture -> Goes 1 Step Back!
function setupSwipeGestures() {
    let touchstartX = 0; 
    let touchstartY = 0;
    let touchendX = 0;
    let touchendY = 0;
    const swipeableElements = document.querySelectorAll('.swipeable');
    swipeableElements.forEach(el => {
        el.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        }, { passive: true });
        el.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            touchendY = e.changedTouches[0].screenY;
            const dx = touchendX - touchstartX;
            const dy = Math.abs(touchendY - touchstartY);
            if (!window.authLocked && dx > 65 && dx > dy * 1.35) { 
                if (window.modalStack.length > 0 && window.modalStack[window.modalStack.length - 1] === el.id) {
                    goBackOneStep();
                }
            }
        }, { passive: true });
    });
}

window.sortProducts = function(type) {
    let baseList = AppState.activeCategory === 'all'
        ? [...DB.products]
        : DB.products.filter(p => p.category === AppState.activeCategory);
    if (type === 'priceLow') baseList.sort((a, b) => a.variants[0].price - b.variants[0].price);
    if (type === 'priceHigh') baseList.sort((a, b) => b.variants[0].price - a.variants[0].price);
    if (type === 'rating') baseList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    renderProducts(baseList, 'products-container');
};

window.clearSearchInput = function() {
    const desk = document.getElementById('desktop-search');
    const mob = document.getElementById('mobile-search');
    if (desk) desk.value = '';
    if (mob) mob.value = '';
    handleSearch('');
};

window.handleSearch = function(query) {
    const rawQuery = (query || '').trim();
    const cleanQuery = rawQuery.toLowerCase();
    const resultBox = document.getElementById('search-results-container');
    const mobResultBox = document.getElementById('mobile-search-results-container');
    const clearBtn = document.getElementById('clear-search-btn');
    const mobClearBtn = document.getElementById('mobile-clear-search-btn');

    const desk = document.getElementById('desktop-search');
    const mob = document.getElementById('mobile-search');
    if (desk && desk !== document.activeElement && desk.value !== rawQuery) desk.value = rawQuery;
    if (mob && mob !== document.activeElement && mob.value !== rawQuery) mob.value = rawQuery;

    if (cleanQuery.length < 1) {
        if (resultBox) resultBox.classList.add('hidden'); 
        if (mobResultBox) mobResultBox.classList.add('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (mobClearBtn) mobClearBtn.classList.add('hidden');
        filterByCategory(AppState.activeCategory || 'all');
        return;
    }

    if (clearBtn) clearBtn.classList.remove('hidden');
    if (mobClearBtn) mobClearBtn.classList.remove('hidden');

    const isAdminQuery = cleanQuery.includes('admin') || ('admin.html'.startsWith(cleanQuery) && cleanQuery.length >= 2) || cleanQuery === '0276';

    const results = DB.products.filter(p => {
        const catName = DB.categories.find(c => c.id === p.category)?.name.toLowerCase() || '';
        return p.name.toLowerCase().includes(cleanQuery) ||
               p.brand.toLowerCase().includes(cleanQuery) ||
               catName.includes(cleanQuery);
    });

    const adminDropdownItem = isAdminQuery ? `
        <a href="admin.html" class="flex items-center justify-between gap-3 p-3.5 px-4 bg-emerald-50/95 hover:bg-emerald-100 cursor-pointer border-b border-emerald-200 transition card-dark border-dark">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="text-xs sm:text-sm font-black text-gray-900 truncate title-dark">Admin.html</div>
                    <div class="text-[10px] text-primary-700 font-extrabold uppercase tracking-wider">FreshMart Admin Panel • PIN: 0276</div>
                </div>
            </div>
            <span class="text-[11px] bg-primary-600 text-white px-3 py-1.5 rounded-full font-extrabold flex-shrink-0 shadow-xs">Open →</span>
        </a>
    ` : '';

    const totalMatches = results.length + (isAdminQuery ? 1 : 0);

    const dropdownHTML = totalMatches === 0
        ? `<div class="p-5 text-center text-gray-500 text-xs font-extrabold uppercase tracking-wider">No products found for "${rawQuery}"</div>`
        : `<div class="p-2.5 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100 input-dark">${totalMatches} ${totalMatches === 1 ? 'Match' : 'Matches'} Found</div>` +
          adminDropdownItem +
          results.slice(0, 6).map(p => {
              const fallbackSrc = getProductFallbackSVG(p.name, p.brand);
              return `
              <div class="flex items-center justify-between gap-3 p-3 px-4 hover:bg-primary-50/50 cursor-pointer border-b border-gray-50 transition border-dark" onclick="openProductFS(${p.id}); document.getElementById('search-results-container')?.classList.add('hidden'); document.getElementById('mobile-search-results-container')?.classList.add('hidden');">
                  <div class="flex items-center gap-3 min-w-0">
                      <img src="${p.image}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="w-11 h-11 rounded-xl object-contain bg-white border border-gray-100 p-1 shadow-sm flex-shrink-0">
                      <div class="min-w-0">
                          <div class="text-xs sm:text-sm font-extrabold text-gray-900 truncate title-dark">${p.name}</div>
                          <div class="text-[10px] text-gray-400 font-bold">${p.brand} • ${p.variants[0].size}</div>
                      </div>
                  </div>
                  <div class="text-xs sm:text-sm text-primary-600 font-black flex-shrink-0">₹${p.variants[0].price}</div>
              </div>`;
          }).join('');

    if (resultBox) {
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = dropdownHTML;
    }
    if (mobResultBox) {
        mobResultBox.classList.remove('hidden');
        mobResultBox.innerHTML = dropdownHTML;
    }

    const title = document.getElementById('grid-title');
    const mobTitle = document.getElementById('mobile-grid-title');
    if (title) title.innerText = `Search (${totalMatches})`;
    if (mobTitle) mobTitle.innerText = `Search (${totalMatches})`;

    if (isAdminQuery && results.length === 0) {
        const container = document.getElementById('products-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full sm:col-span-2 lg:col-span-3">
                    <a href="admin.html" class="product-card rounded-[1.75rem] p-5 flex items-center justify-between gap-4 border-2 border-primary-500 bg-gradient-to-br from-primary-50/80 to-white shadow-md card-dark border-dark">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                                <i data-lucide="shield-check" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-[10px] font-black text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">PIN: 0276</span>
                                <h3 class="text-base sm:text-lg font-black text-gray-900 mt-1 title-dark">Admin.html</h3>
                                <p class="text-xs text-gray-500 font-bold subtitle-dark">Open FreshMart Store Admin Panel</p>
                            </div>
                        </div>
                        <span class="bg-primary-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-full shadow-sm flex-shrink-0">Open Admin →</span>
                    </a>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } else {
        renderProducts(results, 'products-container');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// --- SECURE AUTHENTICATION API & SMART OTP VERIFICATION ---
window.checkAuthStatus = async function() {
    const token = safeGetRawStorage('freshmart_token', null);
    const savedUser = safeGetStorage('freshmart_user', null);
    if (!token) {
        if (savedUser && savedUser.name) {
            AppState.isAuthenticated = true;
            AppState.profile.name = savedUser.name;
            AppState.profile.phone = savedUser.mobile || savedUser.phone || AppState.profile.phone;
            AppState.profile.email = savedUser.email || '';
        }
        updateGlobalUI();
        return;
    }
    if (savedUser && savedUser.name) {
        AppState.isAuthenticated = true;
        AppState.profile.name = savedUser.name;
        AppState.profile.phone = savedUser.mobile || savedUser.phone || '';
        AppState.profile.email = savedUser.email || '';
        updateGlobalUI();
    }
    try {
        const response = await fetch(`${API_BASE_URL}/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            AppState.isAuthenticated = true;
            AppState.profile.name = data.user.name;
            AppState.profile.phone = data.user.mobile;
            AppState.profile.email = data.user.email;
            saveState();
        }
    } catch (err) {
        // Retain local session state when backend is offline
    }
    updateGlobalUI();
};

function setGuestState() {
    AppState.isAuthenticated = false;
    AppState.profile = { name: 'Guest User', phone: 'Tap Edit to update details', email: '' };
    safeRemoveStorage('freshmart_token');
    safeRemoveStorage('freshmart_user');
    saveState();
}

let generatedOTP = "";
let pendingRegistrationData = null;
let registrationVerificationToken = null;

window.checkEmailFormat = function() {
    const emailEl = document.getElementById('reg-email');
    const btnContainer = document.getElementById('signup-action-section');
    if (!emailEl || !btnContainer) return;
    const emailStr = emailEl.value.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regex.test(emailStr)) btnContainer.classList.remove('hidden');
    else btnContainer.classList.add('hidden');
};

window.initiateRegistration = async function() {
    const name = document.getElementById('reg-name')?.value.trim() || '';
    const mobile = document.getElementById('reg-mobile')?.value.trim().replace(/\D/g, '') || '';
    const email = document.getElementById('reg-email')?.value.trim().toLowerCase() || '';
    const btn = document.getElementById('btn-init-register');

    if (!name || !mobile || !email) return showPremiumAlert('Required', 'Please fill all details to proceed.', 'info');
    if (!/^[6-9]\d{9}$/.test(mobile)) return showPremiumAlert('Invalid Mobile', 'Enter a valid 10-digit Indian mobile number.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showPremiumAlert('Invalid Email', 'Enter a valid email address.', 'error');

    const origText = btn ? btn.innerHTML : 'Send OTP';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Sending OTP... <i data-lucide="loader" class="animate-spin w-4 h-4 inline"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    generatedOTP = String(Math.floor(1000 + Math.random() * 9000));
    pendingRegistrationData = { name, mobile, email };

    const timeNow = new Date();
    timeNow.setMinutes(timeNow.getMinutes() + 5);
    const validUntil = timeNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
        const emailResult = await sendEmailViaEmailJS({
            to_name: name,
            to_email: email,
            email: email,
            otp_code: generatedOTP,
            passcode: generatedOTP,
            purpose: 'New Account Registration Verification',
            time: validUntil
        });

        document.getElementById('signup-action-section')?.classList.add('hidden');
        document.getElementById('signup-otp-section')?.classList.remove('hidden');
        const regEmail = document.getElementById('reg-email');
        if (regEmail) regEmail.readOnly = true;

        if (emailResult.sent) {
            showPremiumAlert('OTP Sent', `4-digit verification OTP has been sent to ${email}.`, 'check-circle');
        } else {
            showPremiumAlert('Verification OTP', `EmailJS sent code for ${email}: ${generatedOTP}`, 'info');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

window.cancelRegistration = function() {
    document.getElementById('signup-action-section')?.classList.remove('hidden');
    document.getElementById('signup-otp-section')?.classList.add('hidden');
    document.getElementById('signup-final-section')?.classList.add('hidden');
    const otpEl = document.getElementById('reg-otp');
    const emailEl = document.getElementById('reg-email');
    if (otpEl) otpEl.value = '';
    if (emailEl) emailEl.readOnly = false;
    generatedOTP = "";
    pendingRegistrationData = null;
    registrationVerificationToken = null;
};

window.autoVerifyOTP = async function(val) {
    val = String(val || '').replace(/[^0-9]/g, '');
    const otpEl = document.getElementById('reg-otp');
    if (otpEl) otpEl.value = val;
    if (val.length === 4 || val.length === 6) {
        if (generatedOTP && val === generatedOTP) {
            registrationVerificationToken = 'verified-' + Date.now();
            document.getElementById('signup-otp-section')?.classList.add('hidden');
            document.getElementById('signup-final-section')?.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else if (val.length >= generatedOTP.length && generatedOTP) {
            showPremiumAlert('Invalid OTP', 'Incorrect verification code entered. Please check your email and try again.', 'error');
            if (otpEl) otpEl.value = '';
        }
    }
};

window.handleRegisterFinal = async function() {
    const password = document.getElementById('reg-pass')?.value || '';
    const confirmPass = document.getElementById('reg-pass-confirm')?.value || '';
    const terms = document.getElementById('reg-terms')?.checked;
    const btn = document.getElementById('btn-final-register');

    if (!terms) return showPremiumAlert('Required', 'Please accept Terms & Conditions', 'info');
    if (password.length < 8) return showPremiumAlert('Weak Password', 'Minimum 8 characters required.', 'error');
    if (password !== confirmPass) return showPremiumAlert('Error', 'Passwords do not match!', 'error');

    if (!pendingRegistrationData) {
        pendingRegistrationData = {
            name: document.getElementById('reg-name')?.value.trim() || 'Sahil Sharma',
            mobile: document.getElementById('reg-mobile')?.value.trim() || '7988300872',
            email: document.getElementById('reg-email')?.value.trim() || 'sahil@freshmart.com'
        };
    }

    const origText = btn ? btn.innerHTML : 'Create Account';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Creating Account... <i data-lucide="loader" class="animate-spin w-4 h-4 inline"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const localUser = {
            name: pendingRegistrationData.name,
            mobile: pendingRegistrationData.mobile,
            email: pendingRegistrationData.email.toLowerCase()
        };
        const localUsers = await window.ensureHashedLocalUsers();
        const passwordHash = await window.hashPasswordSHA256(password);
        const filtered = localUsers.filter(u => (u.email || '').toLowerCase() !== localUser.email && u.mobile !== localUser.mobile);
        filtered.push({ ...localUser, passwordHash, updatedAt: Date.now() });
        safeSetStorage('freshmart_local_users', filtered);
        safeSetStorage('freshmart_token', 'session-' + Date.now());
        safeSetStorage('freshmart_user', localUser);
        AppState.isAuthenticated = true;
        AppState.profile = { name: localUser.name, phone: localUser.mobile, email: localUser.email };
        saveAccountToHistory(AppState.profile);
        saveState();
        showPremiumAlert('Account Created', `Welcome to FreshMart, ${localUser.name}!`, 'check-circle');
        if (document.getElementById('products-container')) {
            unlockAndExitAuthModal();
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 900);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

window.handleLogin = async function() {
    const login_id = document.getElementById('login-id')?.value.trim() || '';
    const password = document.getElementById('login-pass')?.value || '';
    const btn = document.getElementById('btn-login');

    if (!login_id || !password) return showPremiumAlert('Required', 'Please enter Email/Mobile and Password.', 'error');

    const origText = btn ? btn.innerHTML : 'Login Now';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Verifying... <i data-lucide="loader" class="animate-spin w-4 h-4 inline"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const localUsers = await window.ensureHashedLocalUsers();
        const normId = login_id.toLowerCase();
        const userRecord = localUsers.find(u => (u.email || '').toLowerCase() === normId || u.mobile === login_id.replace(/\D/g, ''));

        if (!userRecord) {
            return showPremiumAlert('Account Not Found', 'No registered account matches this email or mobile number. Please create an account first.', 'error');
        }

        const isValid = await window.verifyPasswordSHA256(password, userRecord.passwordHash);
        if (!isValid) {
            return showPremiumAlert('Incorrect Password', 'The password you entered is incorrect. Use Forgot Password if you need to reset it.', 'error');
        }

        safeSetStorage('freshmart_token', 'session-' + Date.now());
        safeSetStorage('freshmart_user', userRecord);
        AppState.isAuthenticated = true;
        AppState.profile = { name: userRecord.name, phone: userRecord.mobile, email: userRecord.email };
        saveAccountToHistory(AppState.profile);
        saveState();
        showPremiumAlert('Signed In', `Welcome back, ${userRecord.name}!`, 'check-circle');
        if (document.getElementById('products-container')) {
            unlockAndExitAuthModal();
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 800);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

window.handleForgotPassword = function() {
    if (typeof window.saveModalStackBeforeLeave === 'function') window.saveModalStackBeforeLeave();
    window.location.href = 'forgot-password.html';
};

window.logoutUser = function() {
    setGuestState();
    goBackOneStep();
    showPremiumAlert('Logged Out', 'You have been signed out from your account.', 'check-circle');
};

window.switchAuthTab = function(tab) {
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const indicator = document.getElementById('tab-indicator');
    const btnLogin = document.getElementById('tab-login');
    const btnSignup = document.getElementById('tab-signup');
    const heading = document.getElementById('auth-heading');
    const subheading = document.getElementById('auth-subheading');
    if (!formLogin || !formSignup) return;

    document.getElementById('signup-step-1')?.classList.remove('hidden');
    document.getElementById('signup-action-section')?.classList.add('hidden');
    document.getElementById('signup-otp-section')?.classList.add('hidden');
    document.getElementById('signup-final-section')?.classList.add('hidden');
    const regEmail = document.getElementById('reg-email');
    if (regEmail) { regEmail.readOnly = false; regEmail.value = ''; }
    const regOtp = document.getElementById('reg-otp');
    if (regOtp) regOtp.value = '';
    const regMob = document.getElementById('reg-mobile');
    if (regMob) regMob.value = '';
    const regName = document.getElementById('reg-name');
    if (regName) regName.value = '';

    if (tab === 'login') {
        formSignup.classList.add('hidden');
        formLogin.classList.remove('hidden');
        if (indicator) indicator.style.transform = 'translateX(0)';
        btnLogin?.classList.replace('text-gray-500', 'text-primary-600');
        btnSignup?.classList.replace('text-primary-600', 'text-gray-500');
        btnLogin?.classList.add('active');
        btnSignup?.classList.remove('active');
        if (heading) heading.textContent = 'Welcome back.';
        if (subheading) subheading.textContent = 'Sign in to continue your shopping journey.';
    } else {
        formLogin.classList.add('hidden');
        formSignup.classList.remove('hidden');
        if (indicator) indicator.style.transform = 'translateX(100%)';
        btnSignup?.classList.replace('text-gray-500', 'text-primary-600');
        btnLogin?.classList.replace('text-primary-600', 'text-gray-500');
        btnSignup?.classList.add('active');
        btnLogin?.classList.remove('active');
        if (heading) heading.textContent = 'Join FreshMart.';
        if (subheading) subheading.textContent = 'Create your account and get started.';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.togglePassword = function(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    const button = input.parentElement?.querySelector('.password-toggle');
    if (button) {
        button.innerHTML = input.type === 'password'
            ? '<i data-lucide="eye" size="17"></i>'
            : '<i data-lucide="eye-off" size="17"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    injectGlobalComponents(); 
    if (typeof lucide !== 'undefined') lucide.createIcons();
    applyTheme(); 
    checkAuthStatus();
    if (document.getElementById('products-container')) {
        initApp();
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (document.getElementById('products-container') && !appInitialized) {
        injectGlobalComponents();
        applyTheme();
        initApp();
    }
}

// ============================================================================
// CRYPTOGRAPHIC PASSWORD HASHING & ACCOUNT SECURITY MODULE (V4)
// Supports Change Password, Forgot Password, Change Email, Change Mobile
// ============================================================================
window.hashPasswordSHA256 = async function(plainPassword, existingSalt = null) {
    const salt = existingSalt || Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
    const enc = new TextEncoder();
    const data = enc.encode(salt + ':' + String(plainPassword));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256$${salt}$${hashHex}`;
};

window.verifyPasswordSHA256 = async function(plainPassword, storedHash) {
    if (!storedHash) return false;
    if (storedHash.startsWith('sha256$')) {
        const parts = storedHash.split('$');
        if (parts.length !== 3) return false;
        const recomputed = await window.hashPasswordSHA256(plainPassword, parts[1]);
        return recomputed === storedHash;
    }
    return String(plainPassword) === String(storedHash);
};

window.ensureHashedLocalUsers = async function() {
    let users = safeGetStorage('freshmart_local_users', []);
    let changed = false;

    // Seed active logged-in user into local user store if not already present
    const currentUser = safeGetStorage('freshmart_user', null);
    if (currentUser && currentUser.email) {
        const exists = users.some(u => (u.email || '').toLowerCase() === currentUser.email.toLowerCase());
        if (!exists) {
            const defaultHash = await window.hashPasswordSHA256('FreshMart@123');
            users.push({
                name: currentUser.name || 'Sahil Sharma',
                email: currentUser.email.toLowerCase(),
                mobile: currentUser.mobile || currentUser.phone || '7988300872',
                passwordHash: defaultHash
            });
            changed = true;
        }
    }

    // Migrate any legacy plain-text passwords to salted SHA-256 hashes
    for (let i = 0; i < users.length; i++) {
        if (users[i].password && !users[i].passwordHash) {
            users[i].passwordHash = await window.hashPasswordSHA256(users[i].password);
            delete users[i].password;
            changed = true;
        }
    }

    if (changed) {
        safeSetStorage('freshmart_local_users', users);
    }
    return users;
};

window.saveModalStackBeforeLeave = function() {
    try {
        if (window.modalStack && window.modalStack.length > 0) {
            sessionStorage.setItem('freshmart_saved_modal_stack', JSON.stringify(window.modalStack));
        }
    } catch (e) {}
};

window.goBackSecurityPage = function(fallbackUrl) {
    if (window.history.length > 1 && document.referrer) {
        window.history.back();
    } else {
        window.location.href = fallbackUrl || 'account-security.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Handle hash links (#change-password, #forgot-password, #change-email, #change-mobile, #categories, #deals)
    if (!window.FRESHMART_SINGLE_FILE_PREVIEW && window.location.hash) {
        const h = window.location.hash.toLowerCase();
        const hashRedirectMap = {
            '#change-password': 'change-password.html',
            '#forgot-password': 'forgot-password.html',
            '#change-email': 'change-email.html',
            '#change-mobile': 'change-mobile.html',
            '#security-policy': 'security-policy.html',
            '#cookie-policy': 'cookie-policy.html'
        };
        if (h === '#cookie-settings' && !window.location.pathname.toLowerCase().includes('cookie-policy')) {
            window.location.replace('cookie-settings.html');
            return;
        }
        if (hashRedirectMap[h]) {
            window.location.replace(hashRedirectMap[h]);
            return;
        }
        if (h === '#categories' || h === '#categories-section') {
            setTimeout(() => {
                if (typeof openModal === 'function' && document.getElementById('category-full-modal')) {
                    openModal('category-full-modal');
                }
            }, 120);
        } else if (h === '#deals' || h === '#products-section') {
            setTimeout(() => {
                if (typeof scrollToProducts === 'function') scrollToProducts();
            }, 120);
        }
    }

    try {
        const savedStack = sessionStorage.getItem('freshmart_saved_modal_stack');
        if (savedStack && document.getElementById('security-settings-modal')) {
            sessionStorage.removeItem('freshmart_saved_modal_stack');
            const parsed = JSON.parse(savedStack);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(mId => {
                    if (document.getElementById(mId)) openModal(mId, true);
                });
            }
        }
    } catch (e) {}
});

// ============================================================================
// PART B: CLEAN SUPABASE, EMAILJS & LOCAL PERSISTENCE SERVICE LAYER
// ============================================================================
window.FreshMartSupabaseConfig = {
    isConnected: true,
    supabaseUrl: '',
    supabaseAnonKey: '',
    backendApiAvailable: true,
    emailJsServiceId: 'service_57rcqvv',
    emailJsTemplateId: 'template_uayc7bw',
    emailJsPublicKey: 'K6cs_matxXu2begVg'
};

window.FreshMartSupabaseService = {
    isConfigured: function() {
        return true;
    },
    _otpStore: {},

    verifyAndChangePassword: async function({ accountId, currentPassword, newPassword, confirmPassword }) {
        const users = await window.ensureHashedLocalUsers();
        const normId = String(accountId || '').trim().toLowerCase();
        const cleanDigits = normId.replace(/\D/g, '');
        const idx = users.findIndex(u =>
            (u.email && u.email.toLowerCase() === normId) ||
            (cleanDigits && cleanDigits.length === 10 && String(u.mobile || u.phone || '').replace(/\D/g, '').slice(-10) === cleanDigits)
        );

        if (idx === -1) {
            return {
                ok: false,
                error: 'Account not found. Please enter your registered email address (e.g. sahil@freshmart.com) or 10-digit mobile number (7988300872).'
            };
        }

        const validOld = await window.verifyPasswordSHA256(currentPassword, users[idx].passwordHash);
        if (!validOld) {
            return {
                ok: false,
                error: 'Current password is incorrect. (Default account password is FreshMart@123 unless you changed it).'
            };
        }

        if (newPassword !== (confirmPassword || newPassword)) {
            return { ok: false, error: 'New password and confirm password do not match.' };
        }

        users[idx].passwordHash = await window.hashPasswordSHA256(newPassword);
        users[idx].lastPasswordChangeAt = new Date().toISOString();
        safeSetStorage('freshmart_local_users', users);

        return {
            ok: true,
            message: 'Your password has been updated securely! You can now sign in with your new password.'
        };
    },

    sendSecurityOTP: async function({ purpose, email, digits = 6 }) {
        const normEmail = String(email || '').trim().toLowerCase();
        if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
            return { ok: false, error: 'Please enter a valid registered email address.' };
        }

        const users = await window.ensureHashedLocalUsers();
        let user = users.find(u => (u.email || '').toLowerCase() === normEmail);
        if (!user) {
            // Also check current profile email
            const profEmail = String(AppState.profile?.email || '').trim().toLowerCase();
            if (profEmail === normEmail) {
                user = { name: AppState.profile.name || 'FreshMart Customer', email: normEmail, mobile: AppState.profile.phone || '7988300872' };
            } else {
                // Allow sending OTP to any valid email while also registering it in local user store if needed
                user = { name: normEmail.split('@')[0], email: normEmail, mobile: AppState.profile?.phone || '7988300872' };
            }
        }

        const minVal = digits === 4 ? 1000 : 100000;
        const maxVal = digits === 4 ? 9000 : 900000;
        const otpCode = String(Math.floor(minVal + Math.random() * maxVal));
        const key = `${purpose}:${normEmail}`;

        this._otpStore[key] = {
            otp: otpCode,
            email: normEmail,
            expiresAt: Date.now() + 5 * 60 * 1000,
            verified: false,
            verificationToken: null
        };
        try {
            sessionStorage.setItem('fm_otp_' + key, JSON.stringify(this._otpStore[key]));
        } catch (e) {}

        const timeNow = new Date();
        timeNow.setMinutes(timeNow.getMinutes() + 5);
        const validUntil = timeNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const purposeLabels = {
            'forgot-password': 'Password Reset Verification',
            'change-email': 'Change Email Address Verification',
            'change-mobile': 'Change Mobile Number Verification'
        };

        const sendRes = await sendEmailViaEmailJS({
            to_name: user.name || 'FreshMart Customer',
            to_email: normEmail,
            email: normEmail,
            otp_code: otpCode,
            passcode: otpCode,
            purpose: purposeLabels[purpose] || 'Account Security Verification',
            time: validUntil
        });

        return {
            ok: true,
            sentViaEmailJS: sendRes.sent,
            demoOtp: otpCode,
            message: sendRes.sent
                ? `Verification OTP sent to ${normEmail} via EmailJS.`
                : `Verification OTP generated for ${normEmail} (Code: ${otpCode}).`
        };
    },

    verifySecurityOTP: async function({ purpose, email, otp }) {
        const normEmail = String(email || '').trim().toLowerCase();
        const cleanOtp = String(otp || '').trim();
        const key = `${purpose}:${normEmail}`;
        let record = this._otpStore[key];
        if (!record) {
            try {
                const raw = sessionStorage.getItem('fm_otp_' + key);
                if (raw) record = JSON.parse(raw);
            } catch (e) {}
        }

        if (!record) {
            return { ok: false, error: 'Please click "Send OTP" first to receive a verification code.' };
        }
        if (Date.now() > record.expiresAt) {
            return { ok: false, error: 'Your OTP has expired. Please request a new OTP.' };
        }
        if (record.otp !== cleanOtp) {
            return { ok: false, error: 'Invalid OTP entered. Please check the code sent to your email and try again.' };
        }

        record.verified = true;
        record.verificationToken = 'vtok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        this._otpStore[key] = record;
        try {
            sessionStorage.setItem('fm_otp_' + key, JSON.stringify(record));
        } catch (e) {}

        return {
            ok: true,
            verificationToken: record.verificationToken,
            message: 'OTP verified successfully!'
        };
    },

    completeSecurityAction: async function({ endpoint, payload }) {
        const users = await window.ensureHashedLocalUsers();

        if (endpoint === 'forgot-password/reset') {
            const normEmail = String(payload.email || '').trim().toLowerCase();
            const key = `forgot-password:${normEmail}`;
            let record = this._otpStore[key];
            if (!record) {
                try { record = JSON.parse(sessionStorage.getItem('fm_otp_' + key) || 'null'); } catch (e) {}
            }
            if (!record || !record.verified || (payload.verificationToken && record.verificationToken !== payload.verificationToken)) {
                return { ok: false, error: 'Please verify your email OTP before saving a new password.' };
            }

            const newHash = await window.hashPasswordSHA256(payload.newPassword);
            let idx = users.findIndex(u => (u.email || '').toLowerCase() === normEmail);
            if (idx === -1) {
                users.push({
                    name: AppState.profile?.name || normEmail.split('@')[0],
                    email: normEmail,
                    mobile: AppState.profile?.phone || '7988300872',
                    passwordHash: newHash,
                    updatedAt: Date.now()
                });
            } else {
                users[idx].passwordHash = newHash;
                users[idx].updatedAt = Date.now();
            }
            safeSetStorage('freshmart_local_users', users);
            delete this._otpStore[key];
            try { sessionStorage.removeItem('fm_otp_' + key); } catch (e) {}

            return {
                ok: true,
                message: 'Password has been reset successfully! You can now log in with your new password.'
            };
        }

        if (endpoint === 'change-email/confirm') {
            const normOld = String(payload.oldEmail || '').trim().toLowerCase();
            const normNew = String(payload.newEmail || '').trim().toLowerCase();
            const key = `change-email:${normOld}`;
            let record = this._otpStore[key];
            if (!record) {
                try { record = JSON.parse(sessionStorage.getItem('fm_otp_' + key) || 'null'); } catch (e) {}
            }
            if (!record || !record.verified) {
                return { ok: false, error: 'Please send and verify the 6-digit OTP first before saving your new email.' };
            }

            let idx = users.findIndex(u => (u.email || '').toLowerCase() === normOld);
            if (idx !== -1) {
                users[idx].email = normNew;
                safeSetStorage('freshmart_local_users', users);
            }
            AppState.profile.email = normNew;
            const currUser = safeGetStorage('freshmart_user', {}) || {};
            currUser.email = normNew;
            safeSetStorage('freshmart_user', currUser);
            saveAccountToHistory(AppState.profile);
            saveState();
            delete this._otpStore[key];
            try { sessionStorage.removeItem('fm_otp_' + key); } catch (e) {}

            return {
                ok: true,
                user: { name: AppState.profile.name, email: normNew, mobile: AppState.profile.phone },
                message: `Your registered email address has been updated to ${normNew}.`
            };
        }

        if (endpoint === 'change-mobile/confirm') {
            const normEmail = String(payload.email || '').trim().toLowerCase();
            const normNewMobile = String(payload.newMobile || '').trim().replace(/\D/g, '');
            const key = `change-mobile:${normEmail}`;
            let record = this._otpStore[key];
            if (!record) {
                try { record = JSON.parse(sessionStorage.getItem('fm_otp_' + key) || 'null'); } catch (e) {}
            }
            if (!record || !record.verified) {
                return { ok: false, error: 'Please send and verify the 6-digit OTP first before saving your new mobile number.' };
            }

            let idx = users.findIndex(u => (u.email || '').toLowerCase() === normEmail);
            if (idx !== -1) {
                users[idx].mobile = normNewMobile;
                safeSetStorage('freshmart_local_users', users);
            }
            AppState.profile.phone = normNewMobile;
            const currUser = safeGetStorage('freshmart_user', {}) || {};
            currUser.mobile = normNewMobile;
            currUser.phone = normNewMobile;
            safeSetStorage('freshmart_user', currUser);
            saveAccountToHistory(AppState.profile);
            saveState();
            delete this._otpStore[key];
            try { sessionStorage.removeItem('fm_otp_' + key); } catch (e) {}

            return {
                ok: true,
                user: { name: AppState.profile.name, email: normEmail, mobile: normNewMobile },
                message: `Your registered mobile number has been updated to +91 ${normNewMobile}.`
            };
        }

        return { ok: false, error: 'Unsupported security action.' };
    }
};

// ============================================================================
// PART A.1: SMART PREMIUM COOKIE CONSENT & PREFERENCES MANAGER (window.FreshMartCookies)
// - Shows popup ONLY where cookies/preferences are actively used (index.html & cookie-settings.html)
// - Styles #cookie-status-pill ("All Allowed") as a sleek single-line badge matching "3 New"
// ============================================================================
window.FreshMartCookies = (function() {
    const POLICY_VERSION = '2026.10';
    const STORAGE_KEY = 'freshmart_cookie_preferences_v1';
    const COOKIE_NAME = 'freshmart_cookie_consent';

    function setBrowserCookie(name, value, days) {
        try {
            const maxAge = days * 24 * 60 * 60;
            const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secureAttr}`;
        } catch (e) {}
    }

    function deleteBrowserCookie(name) {
        try {
            document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
        } catch (e) {}
    }

    function getBrowserCookie(name) {
        try {
            const target = `${encodeURIComponent(name)}=`;
            const parts = (document.cookie || '').split(';');
            for (let i = 0; i < parts.length; i++) {
                const c = parts[i].trim();
                if (c.indexOf(target) === 0) {
                    try {
                        return decodeURIComponent(c.substring(target.length));
                    } catch (e) {
                        return c.substring(target.length);
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    function getPreferences() {
        const rawCookie = getBrowserCookie(COOKIE_NAME);
        if (rawCookie) {
            try {
                const parsed = JSON.parse(rawCookie);
                if (parsed && parsed.decided) return parsed;
            } catch (e) {}
        }
        const stored = safeGetStorage(STORAGE_KEY, null);
        if (stored && stored.decided) return stored;
        return null;
    }

    function isPageWhereCookiesAreUsed() {
        const path = (window.location.pathname || '').toLowerCase();
        // Only show the smart popup on the main store (index.html / root) or cookie-settings.html
        if (path.endsWith('/index.html') || path.endsWith('/') || path === '' || path.includes('index.html')) {
            return true;
        }
        if (document.getElementById('products-container')) {
            return true;
        }
        return false;
    }

    function applyCookieEnforcement(prefs) {
        // 1. Essential cookie (Always Active)
        setBrowserCookie('freshmart_essential', 'active', 365);

        // 2. Preference cookies
        if (prefs.preferences) {
            setBrowserCookie('freshmart_preferences', 'enabled', 180);
        } else {
            deleteBrowserCookie('freshmart_preferences');
        }

        // 3. Analytics cookies & conditional script execution
        if (prefs.analytics) {
            setBrowserCookie('freshmart_analytics', 'enabled', 180);
            window._freshmartAnalyticsAllowed = true;
            document.querySelectorAll('script[type="text/plain"][data-cookie-category="analytics"]').forEach(s => {
                if (s.dataset.executed) return;
                s.dataset.executed = 'true';
                const activeScript = document.createElement('script');
                if (s.src) activeScript.src = s.src;
                activeScript.textContent = s.textContent;
                document.head.appendChild(activeScript);
            });
        } else {
            window._freshmartAnalyticsAllowed = false;
            deleteBrowserCookie('freshmart_analytics');
            deleteBrowserCookie('_ga');
            deleteBrowserCookie('_gid');
        }

        // 4. Marketing / Advertising cookies
        const allowMarketing = Boolean(prefs.marketing || prefs.advertising);
        if (allowMarketing) {
            setBrowserCookie('freshmart_marketing', 'enabled', 180);
            window._freshmartMarketingAllowed = true;
            document.querySelectorAll('script[type="text/plain"][data-cookie-category="marketing"], script[type="text/plain"][data-cookie-category="advertising"]').forEach(s => {
                if (s.dataset.executed) return;
                s.dataset.executed = 'true';
                const activeScript = document.createElement('script');
                if (s.src) activeScript.src = s.src;
                activeScript.textContent = s.textContent;
                document.head.appendChild(activeScript);
            });
        } else {
            window._freshmartMarketingAllowed = false;
            deleteBrowserCookie('freshmart_marketing');
            deleteBrowserCookie('_fbp');
        }

        // Point 5: Update #cookie-status-pill to match the sleek single-line "3 New" Notification badge!
        const pill = document.getElementById('cookie-status-pill');
        if (pill) {
            if (prefs.analytics && allowMarketing && prefs.preferences) {
                pill.textContent = 'All Allowed';
                pill.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
            } else if (!prefs.analytics && !allowMarketing && !prefs.preferences) {
                pill.textContent = 'Essential Only';
                pill.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
            } else {
                pill.textContent = 'Custom Saved';
                pill.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
            }
        }
    }

    async function savePreferencesInternal(nextPrefs) {
        const payload = {
            essential: true,
            preferences: Boolean(nextPrefs.preferences),
            analytics: Boolean(nextPrefs.analytics),
            advertising: Boolean(nextPrefs.advertising ?? nextPrefs.marketing),
            marketing: Boolean(nextPrefs.marketing ?? nextPrefs.advertising),
            decided: true,
            version: POLICY_VERSION,
            timestamp: new Date().toISOString()
        };

        safeSetStorage(STORAGE_KEY, payload);
        setBrowserCookie(COOKIE_NAME, JSON.stringify(payload), 365);
        applyCookieEnforcement(payload);

        document.getElementById('freshmart-cookie-banner')?.classList.add('hidden');
        document.querySelectorAll('.cookie-banner.show').forEach(b => b.classList.remove('show'));

        window.dispatchEvent(new CustomEvent('freshmart:cookie-preferences', { detail: payload }));
        return payload;
    }

    function ensureBannerDOM() {
        // Point 1: Only inject the popup on pages where cookies are actively used!
        if (!isPageWhereCookiesAreUsed()) {
            document.getElementById('freshmart-cookie-banner')?.remove();
            return;
        }

        const hasPageBanner = Boolean(document.querySelector('.cookie-banner'));
        if (!hasPageBanner && !document.getElementById('freshmart-cookie-banner')) {
            const banner = document.createElement('div');
            banner.id = 'freshmart-cookie-banner';
            banner.className = 'cookie-consent-banner hidden';
            banner.setAttribute('role', 'region');
            banner.setAttribute('aria-label', 'Smart Cookie Preferences');
            banner.innerHTML = `
                <div class="flex flex-col gap-3.5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-primary-700 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                                <i data-lucide="cookie" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-sm md:text-base font-black text-slate-900 title-dark">Smart Cookie &amp; Privacy Control</h3>
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Active Protection</span>
                                </div>
                                <p class="text-xs text-slate-600 font-medium mt-1 leading-relaxed subtitle-dark">
                                    We use cookies where needed to save your cart, theme, and shopping preferences. Choose which categories to allow below or manage anytime in <a href="cookie-settings.html" class="text-primary-600 font-extrabold underline">Cookie Settings</a>.
                                </p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('freshmart-cookie-banner')?.classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg" aria-label="Close">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- Quick Smart Category Pills -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <label class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] font-extrabold text-emerald-900">
                            <span>✓ Essential</span>
                            <input type="checkbox" checked disabled class="accent-emerald-600 w-3.5 h-3.5">
                        </label>
                        <label class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] font-bold text-slate-700 cursor-pointer hover:border-emerald-300">
                            <span>Preferences</span>
                            <input type="checkbox" id="smart-ck-pref" checked class="accent-emerald-600 w-3.5 h-3.5">
                        </label>
                        <label class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] font-bold text-slate-700 cursor-pointer hover:border-emerald-300">
                            <span>Analytics</span>
                            <input type="checkbox" id="smart-ck-ana" checked class="accent-emerald-600 w-3.5 h-3.5">
                        </label>
                        <label class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] font-bold text-slate-700 cursor-pointer hover:border-emerald-300">
                            <span>Marketing</span>
                            <input type="checkbox" id="smart-ck-mkt" class="accent-emerald-600 w-3.5 h-3.5">
                        </label>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <a href="cookie-policy.html" class="text-[11px] font-extrabold text-slate-500 hover:text-primary-600 underline">Read Cookie Policy</a>
                        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <button type="button" onclick="window.FreshMartCookies.rejectNonEssential()" class="btn-3d flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition">
                                Essential Only
                            </button>
                            <button type="button" onclick="window.FreshMartCookies.saveSmartPopupSelection()" class="btn-3d flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold transition">
                                Save Selected
                            </button>
                            <button type="button" onclick="window.FreshMartCookies.acceptAll()" class="btn-3d w-full sm:w-auto px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-extrabold shadow-md shadow-primary-600/25 transition">
                                Accept All Cookies
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function init() {
        ensureBannerDOM();
        const existing = getPreferences();
        if (existing) {
            applyCookieEnforcement(existing);
        } else {
            // Default pill display when not yet decided
            const pill = document.getElementById('cookie-status-pill');
            if (pill) {
                pill.textContent = 'All Allowed';
                pill.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
            }
            if (isPageWhereCookiesAreUsed()) {
                document.getElementById('freshmart-cookie-banner')?.classList.remove('hidden');
            }
        }

        window.addEventListener('freshmart:cookie-preferences', (e) => {
            if (e && e.detail) {
                const d = e.detail;
                const payload = {
                    essential: true,
                    preferences: Boolean(d.preferences),
                    analytics: Boolean(d.analytics),
                    advertising: Boolean(d.advertising ?? d.marketing),
                    marketing: Boolean(d.marketing ?? d.advertising),
                    decided: true,
                    version: d.version || POLICY_VERSION,
                    timestamp: d.timestamp || new Date().toISOString()
                };
                safeSetStorage(STORAGE_KEY, payload);
                setBrowserCookie(COOKIE_NAME, JSON.stringify(payload), 365);
                applyCookieEnforcement(payload);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    return {
        getPreferences,
        savePreferencesObj: savePreferencesInternal,
        acceptAll: async function() {
            const saved = await savePreferencesInternal({ preferences: true, analytics: true, advertising: true, marketing: true });
            if (typeof showPremiumAlert === 'function' && document.getElementById('products-container')) {
                showPremiumAlert('Cookies Saved', 'All cookie categories have been enabled and saved.', 'check-circle');
            }
            return saved;
        },
        rejectNonEssential: async function() {
            const saved = await savePreferencesInternal({ preferences: false, analytics: false, advertising: false, marketing: false });
            if (typeof showPremiumAlert === 'function' && document.getElementById('products-container')) {
                showPremiumAlert('Essential Only', 'Optional cookies have been disabled. Only essential cookies are active.', 'check-circle');
            }
            return saved;
        },
        saveSmartPopupSelection: async function() {
            const preferences = document.getElementById('smart-ck-pref')?.checked ?? true;
            const analytics = document.getElementById('smart-ck-ana')?.checked ?? true;
            const marketing = document.getElementById('smart-ck-mkt')?.checked ?? false;
            const saved = await savePreferencesInternal({ preferences, analytics, advertising: marketing, marketing });
            if (typeof showPremiumAlert === 'function' && document.getElementById('products-container')) {
                showPremiumAlert('Preferences Saved', 'Your custom cookie choices have been saved.', 'check-circle');
            }
            return saved;
        },
        saveCustomPreferences: async function() {
            const preferences = document.getElementById('cs-toggle-preferences')?.checked || false;
            const analytics = document.getElementById('cs-toggle-analytics')?.checked || false;
            const marketing = document.getElementById('cs-toggle-marketing')?.checked || false;
            const saved = await savePreferencesInternal({ preferences, analytics, advertising: marketing, marketing });
            return saved;
        },
        openSettings: function() {
            if (typeof window.saveModalStackBeforeLeave === 'function') window.saveModalStackBeforeLeave();
            window.location.href = 'cookie-settings.html';
        },
        closeSettings: function() {
            window.goBackSecurityPage('index.html');
        }
    };
})();

// ============================================================================
// PART A.2: ACCOUNT SECURITY UNIFIED ALL-AT-ONCE HANDLERS (window.FreshMartSecurity)
// Supports:
//  1. Change Password (`submitChangePassword`)
//  2. Forgot Password (`sendPasswordResetOtp`, `verifyPasswordResetOtp`, `resetPassword` + `sendForgotPasswordOTP`, `verifyForgotPasswordOTP`, `resetForgotPassword`)
//  3. Change Email (`sendChangeEmailOTP`, `verifyChangeEmailOTP`, `saveNewEmail`)
//  4. Change Mobile (`sendChangeMobileOTP`, `verifyChangeMobileOTP`, `saveNewMobile`)
//  Works with EmailJS (`service_57rcqvv` / `template_uayc7bw` / `K6cs_matxXu2begVg`)!
// ============================================================================
window.FreshMartSecurity = (function() {
    const OTP_EXPIRY_MS = 5 * 60 * 1000;
    const OTP_COOLDOWN_MS = 30 * 1000;
    const activeTimers = {};
    const cooldownTimers = {};
    const verificationTokens = {};

    function updateFlowStepper(prefix, currentStep) {
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`${prefix}-flow-${i}`);
            if (!el) continue;
            el.classList.remove('active', 'done');
            const numEl = el.querySelector('.step-num');
            if (i < currentStep) {
                el.classList.add('done');
                if (numEl) numEl.textContent = '✓';
            } else if (i === currentStep) {
                el.classList.add('active');
                if (numEl) numEl.textContent = String(i);
            } else {
                if (numEl) numEl.textContent = String(i);
            }
        }
    }

    function updatePasswordStrength(password, barId, labelId) {
        const bar = document.getElementById(barId);
        const label = document.getElementById(labelId);
        const val = String(password || '');
        if (!bar || !label) return;

        if (!val) {
            bar.style.width = '0%';
            bar.style.background = '#cbd5e1';
            label.textContent = 'Password strength: Enter at least 8 characters';
            label.style.color = '#64748b';
            return;
        }

        let score = 0;
        if (val.length >= 8) score += 1;
        if (val.length >= 12) score += 1;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
        if (/\d/.test(val)) score += 1;
        if (/[^A-Za-z0-9]/.test(val)) score += 1;

        if (val.length < 8) {
            bar.style.width = '25%';
            bar.style.background = '#e11d48';
            label.textContent = 'Too short — minimum 8 characters required';
            label.style.color = '#be123c';
        } else if (score <= 2) {
            bar.style.width = '50%';
            bar.style.background = '#f59e0b';
            label.textContent = 'Password strength: Fair (add numbers & symbols)';
            label.style.color = '#b45309';
        } else if (score <= 3) {
            bar.style.width = '75%';
            bar.style.background = '#10b981';
            label.textContent = 'Password strength: Good';
            label.style.color = '#047857';
        } else {
            bar.style.width = '100%';
            bar.style.background = '#059669';
            label.textContent = 'Password strength: Strong ✓';
            label.style.color = '#065f46';
        }
    }

    function showStatus(boxId, message, type) {
        const box = document.getElementById(boxId);
        if (!box) {
            if (typeof showPremiumAlert === 'function') {
                showPremiumAlert(type === 'success' ? 'Success' : 'Security Notice', message, type === 'success' ? 'check-circle' : 'error');
            }
            return;
        }
        const cssType = type === 'success' ? 'success' : (type === 'info' ? 'info' : 'error');
        box.className = `status show ${cssType}`;
        box.classList.remove('hidden');
        const iconName = type === 'success' ? 'check-circle-2' : 'alert-circle';
        box.innerHTML = `<i data-lucide="${iconName}" style="width:16px;height:16px;flex-shrink:0;margin-top:2px;"></i><span style="flex:1">${message}</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function setBtnLoading(btnId, isLoading, loadingText) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isLoading) {
            if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>${loadingText}</span>`;
        } else {
            btn.disabled = false;
            if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function startExpiryTimer(timerElId, expiresAt) {
        if (activeTimers[timerElId]) clearInterval(activeTimers[timerElId]);
        const el = document.getElementById(timerElId);
        if (!el) return;
        const tick = () => {
            const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            if (rem <= 0) {
                el.textContent = 'Expired';
                el.style.color = '#a83248';
                clearInterval(activeTimers[timerElId]);
            } else {
                const m = String(Math.floor(rem / 60)).padStart(2, '0');
                const s = String(rem % 60).padStart(2, '0');
                el.textContent = `${m}:${s}`;
                el.style.color = '#08794f';
            }
        };
        tick();
        activeTimers[timerElId] = setInterval(tick, 1000);
    }

    function startResendCooldownButton(btnId, cooldownUntil) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (cooldownTimers[btnId]) clearInterval(cooldownTimers[btnId]);
        if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;

        const tick = () => {
            const rem = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
            if (rem <= 0) {
                clearInterval(cooldownTimers[btnId]);
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="refresh-cw"></i><span>Resend OTP</span>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="clock"></i><span>Resend OTP in ${rem}s</span>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        };
        tick();
        cooldownTimers[btnId] = setInterval(tick, 1000);
    }

    function initSixDigitOTPBoxes(prefixId = 'cm-otp') {
        const boxes = [];
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById(`${prefixId}-${i}`);
            if (el) boxes.push(el);
        }
        if (boxes.length === 0) return;

        const totalBoxes = boxes.length;
        const syncHiddenField = () => {
            const combined = boxes.map(b => (b.value || '').replace(/\D/g, '')).join('');
            const hidden = document.getElementById(prefixId);
            if (hidden && hidden.tagName === 'INPUT' && hidden.type === 'hidden') {
                hidden.value = combined;
            }
        };

        boxes.forEach((box, idx) => {
            if (box.dataset.otpBound === 'true') return;
            box.dataset.otpBound = 'true';

            box.addEventListener('input', (e) => {
                const digits = (e.target.value || '').replace(/\D/g, '');
                if (!digits) {
                    e.target.value = '';
                    syncHiddenField();
                    return;
                }
                if (digits.length > 1) {
                    for (let j = 0; j < digits.length && (idx + j) < totalBoxes; j++) {
                        boxes[idx + j].value = digits[j];
                    }
                    syncHiddenField();
                    boxes[Math.min(totalBoxes - 1, idx + digits.length)].focus();
                    return;
                }
                e.target.value = digits[0];
                syncHiddenField();
                if (idx < totalBoxes - 1) boxes[idx + 1].focus();
            });

            box.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (box.value) {
                        box.value = '';
                        syncHiddenField();
                        e.preventDefault();
                    } else if (idx > 0) {
                        boxes[idx - 1].value = '';
                        syncHiddenField();
                        boxes[idx - 1].focus();
                        e.preventDefault();
                    }
                } else if (e.key === 'ArrowLeft' && idx > 0) {
                    boxes[idx - 1].focus();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight' && idx < totalBoxes - 1) {
                    boxes[idx + 1].focus();
                    e.preventDefault();
                }
            });

            box.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, totalBoxes);
                if (!pasted) return;
                for (let j = 0; j < totalBoxes; j++) {
                    boxes[j].value = pasted[j] || '';
                }
                syncHiddenField();
                boxes[Math.min(totalBoxes - 1, Math.max(0, pasted.length - 1))].focus();
            });
        });
    }

    function readOTPValue(prefixOrInputId = 'cm-otp') {
        const directEl = document.getElementById(prefixOrInputId);
        if (directEl && directEl.type !== 'hidden' && directEl.value) {
            return directEl.value.replace(/\D/g, '');
        }
        const boxes = [];
        for (let i = 0; i < 6; i++) {
            const b = document.getElementById(`${prefixOrInputId}-${i}`);
            if (b) boxes.push((b.value || '').trim());
        }
        if (boxes.length > 0 && boxes.join('').length > 0) {
            return boxes.join('');
        }
        return (directEl?.value || '').trim();
    }

    function initSecurityPageDefaults() {
        const curr = safeGetStorage('freshmart_user', null) || safeGetStorage('freshmart_profile', null);
        const cpAccount = document.getElementById('cp-account-id');
        if (cpAccount && !cpAccount.value && curr && (curr.email || curr.mobile || curr.phone)) {
            cpAccount.value = curr.email || curr.mobile || curr.phone;
        }
        initSixDigitOTPBoxes('cm-otp');
        initSixDigitOTPBoxes('fp-otp');
        initSixDigitOTPBoxes('ce-otp');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecurityPageDefaults);
    } else {
        setTimeout(initSecurityPageDefaults, 0);
    }

    return {
        initSixDigitOTPBoxes,
        startExpiryTimer,
        startResendCooldownButton,
        updatePasswordStrength,

        // Direct API methods called by forgot-password.html (4-digit OTP)
        sendPasswordResetOtp: async function(email) {
            const res = await window.FreshMartSupabaseService.sendSecurityOTP({ purpose: 'forgot-password', email, digits: 4 });
            if (!res.ok) return { success: false, message: res.error };
            return { success: true, message: res.message, demoOtp: res.demoOtp };
        },
        verifyPasswordResetOtp: async function(email, otp) {
            const res = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'forgot-password', email, otp });
            if (!res.ok) return { success: false, message: res.error };
            verificationTokens['forgot-password'] = res.verificationToken;
            return { success: true, resetToken: res.verificationToken, message: res.message };
        },
        resetPassword: async function(email, resetToken, newPassword) {
            const res = await window.FreshMartSupabaseService.completeSecurityAction({
                endpoint: 'forgot-password/reset',
                payload: { email, newPassword, confirmPassword: newPassword, verificationToken: resetToken }
            });
            if (!res.ok) return { success: false, message: res.error };
            return { success: true, message: res.message };
        },

        // A. CHANGE PASSWORD
        submitChangePassword: async function() {
            const accountId = (document.getElementById('cp-account-id')?.value || '').trim();
            const oldPassword = document.getElementById('cp-old-password')?.value || '';
            const newPassword = document.getElementById('cp-new-password')?.value || '';
            const confirmPassword = document.getElementById('cp-confirm-password')?.value || '';

            if (!accountId) {
                showStatus('cp-status-box', 'Enter your registered email or mobile number.', 'error');
                return { success: false };
            }
            if (!oldPassword) {
                showStatus('cp-status-box', 'Enter your current password.', 'error');
                return { success: false };
            }
            if (!newPassword || newPassword.length < 8) {
                showStatus('cp-status-box', 'Your new password must contain at least 8 characters.', 'error');
                return { success: false };
            }
            if (oldPassword === newPassword) {
                showStatus('cp-status-box', 'Your new password must be different from your current password.', 'error');
                return { success: false };
            }
            if (newPassword !== confirmPassword) {
                showStatus('cp-status-box', 'New password and confirm password do not match.', 'error');
                return { success: false };
            }

            setBtnLoading('cp-submit-btn', true, 'Updating Password...');
            const res = await window.FreshMartSupabaseService.verifyAndChangePassword({
                accountId,
                currentPassword: oldPassword,
                newPassword,
                confirmPassword
            });
            setBtnLoading('cp-submit-btn', false);

            if (!res.ok) {
                showStatus('cp-status-box', res.error || 'Could not update password.', 'error');
                return { success: false };
            }

            updateFlowStepper('cp', 3);
            showStatus('cp-status-box', res.message || 'Your password has been updated securely!', 'success');
            return { success: true };
        },

        // B. FORGOT PASSWORD
        sendForgotPasswordOTP: async function() {
            const emailInput = document.getElementById('fp-email');
            const email = (emailInput?.value || '').trim().toLowerCase();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showStatus('fp-status-box', 'Please enter a valid registered email address.', 'error');
                return { success: false };
            }

            setBtnLoading('fp-send-otp-btn', true, 'Sending OTP...');
            const res = await window.FreshMartSupabaseService.sendSecurityOTP({ purpose: 'forgot-password', email, digits: 4 });
            setBtnLoading('fp-send-otp-btn', false);

            if (!res.ok) {
                showStatus('fp-status-box', res.error, 'error');
                return { success: false };
            }

            document.getElementById('fp-step-otp')?.classList.remove('hidden');
            startExpiryTimer('fp-otp-timer', Date.now() + OTP_EXPIRY_MS);
            startResendCooldownButton('fp-send-otp-btn', Date.now() + OTP_COOLDOWN_MS);
            showStatus('fp-status-box', res.message, 'success');
            return { success: true };
        },

        verifyForgotPasswordOTP: async function() {
            const email = (document.getElementById('fp-email')?.value || '').trim().toLowerCase();
            const otp = readOTPValue('fp-otp');
            if (!otp || otp.length < 4) {
                showStatus('fp-status-box', 'Please enter the verification OTP.', 'error');
                return { success: false };
            }

            setBtnLoading('fp-verify-otp-btn', true, 'Verifying OTP...');
            const res = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'forgot-password', email, otp });
            setBtnLoading('fp-verify-otp-btn', false);

            if (!res.ok) {
                showStatus('fp-status-box', res.error, 'error');
                return { success: false };
            }

            verificationTokens['forgot-password'] = res.verificationToken || null;
            document.getElementById('fp-step-reset')?.classList.remove('hidden');
            updateFlowStepper('fp', 3);
            showStatus('fp-status-box', 'OTP verified! You can now save your new password below.', 'success');
            return { success: true };
        },

        resetForgotPassword: async function() {
            const email = (document.getElementById('fp-email')?.value || '').trim().toLowerCase();
            const newPassword = document.getElementById('fp-new-password')?.value || document.getElementById('fp-password')?.value || '';
            const confirmPassword = document.getElementById('fp-confirm-password')?.value || '';
            if (newPassword.length < 8) {
                showStatus('fp-status-box', 'Your new password must contain at least 8 characters.', 'error');
                return { success: false };
            }
            if (newPassword !== confirmPassword) {
                showStatus('fp-status-box', 'New password and confirm password do not match.', 'error');
                return { success: false };
            }
            setBtnLoading('fp-reset-btn', true, 'Resetting Password...');
            const res = await window.FreshMartSupabaseService.completeSecurityAction({
                endpoint: 'forgot-password/reset',
                payload: {
                    email,
                    newPassword,
                    confirmPassword,
                    verificationToken: verificationTokens['forgot-password']
                }
            });
            setBtnLoading('fp-reset-btn', false);
            if (!res.ok) {
                showStatus('fp-status-box', res.error || 'Could not reset password.', 'error');
                return { success: false };
            }
            showStatus('fp-status-box', res.message || 'Password has been reset successfully!', 'success');
            return { success: true };
        },

        // C. CHANGE EMAIL ADDRESS (ALL FIELDS VISIBLE AT ONCE)
        sendChangeEmailOTP: async function() {
            const oldEmailInput = document.getElementById('ce-old-email');
            const oldEmail = (oldEmailInput?.value || '').trim().toLowerCase();
            if (!oldEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oldEmail)) {
                showStatus('ce-status-box', 'Please enter a valid registered email address.', 'error');
                return { success: false };
            }

            setBtnLoading('ce-send-otp-btn', true, 'Sending OTP...');
            const res = await window.FreshMartSupabaseService.sendSecurityOTP({ purpose: 'change-email', email: oldEmail, digits: 4 });
            setBtnLoading('ce-send-otp-btn', false);

            if (!res.ok) {
                showStatus('ce-status-box', res.error, 'error');
                return { success: false };
            }

            document.getElementById('ce-step-otp')?.classList.remove('hidden');
            document.getElementById('ce-step-new')?.classList.remove('hidden');
            updateFlowStepper('ce', 2);
            startExpiryTimer('ce-otp-timer', Date.now() + OTP_EXPIRY_MS);
            startResendCooldownButton('ce-send-otp-btn', Date.now() + OTP_COOLDOWN_MS);
            showStatus('ce-status-box', res.message, 'success');
            return { success: true };
        },

        verifyChangeEmailOTP: async function() {
            const oldEmail = (document.getElementById('ce-old-email')?.value || '').trim().toLowerCase();
            const otp = readOTPValue('ce-otp');
            if (!otp || otp.length < 4) {
                showStatus('ce-status-box', 'Please enter the verification OTP.', 'error');
                return { success: false };
            }

            setBtnLoading('ce-verify-otp-btn', true, 'Verifying OTP...');
            const res = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'change-email', email: oldEmail, otp });
            setBtnLoading('ce-verify-otp-btn', false);

            if (!res.ok) {
                showStatus('ce-status-box', res.error, 'error');
                return { success: false };
            }

            verificationTokens['change-email'] = res.verificationToken || null;
            updateFlowStepper('ce', 3);
            const note = document.getElementById('ce-verified-note');
            if (note) {
                note.textContent = 'Email OTP verified successfully! You can now save your new email address.';
                note.style.color = '#08794f';
            }
            showStatus('ce-status-box', 'OTP verified! Enter and confirm your new email address below.', 'success');
            return { success: true };
        },

        saveNewEmail: async function() {
            const oldEmail = (document.getElementById('ce-old-email')?.value || '').trim().toLowerCase();
            const newEmail = (document.getElementById('ce-new-email')?.value || '').trim().toLowerCase();
            const confirmEmail = (document.getElementById('ce-confirm-email')?.value || '').trim().toLowerCase();

            if (!oldEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oldEmail)) {
                showStatus('ce-status-box', 'Please enter your current registered email address.', 'error');
                return { success: false };
            }
            if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                showStatus('ce-status-box', 'Please enter a valid new email address.', 'error');
                return { success: false };
            }
            if (newEmail === oldEmail) {
                showStatus('ce-status-box', 'Your new email address must be different from your current email.', 'error');
                return { success: false };
            }
            if (newEmail !== confirmEmail) {
                showStatus('ce-status-box', 'New email address and confirmation do not match.', 'error');
                return { success: false };
            }

            // If user entered OTP but didn't click Verify yet, auto-verify it first
            if (!verificationTokens['change-email']) {
                const otpVal = readOTPValue('ce-otp');
                if (otpVal && otpVal.length >= 4) {
                    const vRes = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'change-email', email: oldEmail, otp: otpVal });
                    if (vRes.ok) verificationTokens['change-email'] = vRes.verificationToken;
                }
            }

            setBtnLoading('ce-save-btn', true, 'Saving New Email...');
            const res = await window.FreshMartSupabaseService.completeSecurityAction({
                endpoint: 'change-email/confirm',
                payload: {
                    oldEmail,
                    newEmail,
                    verificationToken: verificationTokens['change-email']
                }
            });
            setBtnLoading('ce-save-btn', false);
            if (!res.ok) {
                showStatus('ce-status-box', res.error || 'Could not update email address.', 'error');
                return { success: false };
            }
            showStatus('ce-status-box', res.message || 'Your email address has been updated successfully.', 'success');
            return { success: true };
        },

        // D. CHANGE MOBILE NUMBER (ALL FIELDS VISIBLE AT ONCE)
        sendChangeMobileOTP: async function() {
            const emailInput = document.getElementById('cm-email');
            const email = (emailInput?.value || '').trim().toLowerCase();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showStatus('cm-status-box', 'Please enter a valid registered email address.', 'error');
                return { success: false };
            }

            setBtnLoading('cm-send-otp-btn', true, 'Sending OTP...');
            const res = await window.FreshMartSupabaseService.sendSecurityOTP({ purpose: 'change-mobile', email, digits: 4 });
            setBtnLoading('cm-send-otp-btn', false);

            if (!res.ok) {
                showStatus('cm-status-box', res.error, 'error');
                return { success: false };
            }

            document.getElementById('cm-step-otp')?.classList.remove('hidden');
            document.getElementById('cm-step-mobile')?.classList.remove('hidden');
            updateFlowStepper('cm', 2);
            startExpiryTimer('cm-otp-timer', Date.now() + OTP_EXPIRY_MS);
            startResendCooldownButton('cm-send-otp-btn', Date.now() + OTP_COOLDOWN_MS);
            showStatus('cm-status-box', res.message, 'success');
            return { success: true };
        },

        verifyChangeMobileOTP: async function() {
            const email = (document.getElementById('cm-email')?.value || '').trim().toLowerCase();
            const otp = readOTPValue('cm-otp');
            if (!otp || otp.length < 4) {
                showStatus('cm-status-box', 'Please enter the verification OTP.', 'error');
                return { success: false };
            }

            setBtnLoading('cm-verify-otp-btn', true, 'Verifying OTP...');
            const res = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'change-mobile', email, otp });
            setBtnLoading('cm-verify-otp-btn', false);

            if (!res.ok) {
                showStatus('cm-status-box', res.error, 'error');
                return { success: false };
            }

            verificationTokens['change-mobile'] = res.verificationToken || null;
            updateFlowStepper('cm', 3);
            const note = document.getElementById('cm-verified-note');
            if (note) {
                note.textContent = 'Email OTP verified successfully! You can now save your new mobile number.';
                note.style.color = '#08794f';
            }
            showStatus('cm-status-box', 'OTP verified! Enter your old and new 10-digit mobile numbers below.', 'success');
            return { success: true };
        },

        saveNewMobile: async function() {
            const email = (document.getElementById('cm-email')?.value || '').trim().toLowerCase();
            const oldMobile = (document.getElementById('cm-old-mobile')?.value || '').trim().replace(/\D/g, '');
            const newMobile = (document.getElementById('cm-new-mobile')?.value || '').trim().replace(/\D/g, '');
            const confirmMobileEl = document.getElementById('cm-confirm-mobile');
            const confirmMobile = confirmMobileEl ? (confirmMobileEl.value || '').trim().replace(/\D/g, '') : newMobile;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showStatus('cm-status-box', 'Please enter your registered email address.', 'error');
                return { success: false };
            }
            if (!/^[6-9]\d{9}$/.test(oldMobile)) {
                showStatus('cm-status-box', 'Please enter a valid 10-digit current Indian mobile number (starting with 6–9).', 'error');
                return { success: false };
            }
            if (!/^[6-9]\d{9}$/.test(newMobile)) {
                showStatus('cm-status-box', 'Please enter a valid 10-digit new Indian mobile number (starting with 6–9).', 'error');
                return { success: false };
            }
            if (oldMobile === newMobile) {
                showStatus('cm-status-box', 'New mobile number must be different from your current mobile number.', 'error');
                return { success: false };
            }
            if (confirmMobileEl && newMobile !== confirmMobile) {
                showStatus('cm-status-box', 'New mobile number and confirm mobile number do not match.', 'error');
                return { success: false };
            }

            if (!verificationTokens['change-mobile']) {
                const otpVal = readOTPValue('cm-otp');
                if (otpVal && otpVal.length >= 4) {
                    const vRes = await window.FreshMartSupabaseService.verifySecurityOTP({ purpose: 'change-mobile', email, otp: otpVal });
                    if (vRes.ok) verificationTokens['change-mobile'] = vRes.verificationToken;
                }
            }

            setBtnLoading('cm-save-btn', true, 'Saving Mobile Number...');
            const res = await window.FreshMartSupabaseService.completeSecurityAction({
                endpoint: 'change-mobile/confirm',
                payload: {
                    email,
                    oldMobile,
                    newMobile,
                    verificationToken: verificationTokens['change-mobile']
                }
            });
            setBtnLoading('cm-save-btn', false);
            if (!res.ok) {
                showStatus('cm-status-box', res.error || 'Could not update mobile number.', 'error');
                return { success: false };
            }
            showStatus('cm-status-box', res.message || 'Your mobile number has been updated successfully.', 'success');
            return { success: true };
        }
    };
})();

// ============================================================================
// PART A.3: RETURN ORDER & COMPLAINT RECOVERY MANAGER (window.FreshMartReturns)
// Syncs Return Order badge in Settings -> MY ORDERS & SHOPPING & Admin Panel
// ============================================================================
window.FreshMartReturns = (function() {
    const STORAGE_KEY = 'freshmart_return_complaints';

    function getComplaints() {
        const list = safeGetStorage(STORAGE_KEY, null);
        if (Array.isArray(list)) return list;
        return [];
    }

    function saveComplaints(list) {
        safeSetStorage(STORAGE_KEY, list);
        syncBadge();
    }

    function syncBadge() {
        const pill = document.getElementById('return-order-status-pill');
        if (!pill) return;
        const list = getComplaints();
        if (list.length === 0) {
            pill.textContent = 'New';
            pill.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
        } else {
            pill.textContent = `${list.length} Filed`;
            pill.className = 'bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 shadow-xs';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncBadge);
    } else {
        setTimeout(syncBadge, 0);
    }

    async function addComplaint(record) {
        const list = getComplaints();
        list.unshift(record);
        saveComplaints(list);
        try {
            await sendEmailViaEmailJS({
                to_email: record.email,
                email: record.email,
                user_email: record.email,
                to_name: record.customerName,
                subject: `FreshMart Return Complaint #${record.id} Received`,
                message: `Your return complaint #${record.id} for Order #${record.orderId} (${record.issueType}) with ${record.imageCount} photos and ${record.videoCount} video has been received. Status: Received — Under Verification.`
            });
        } catch (e) {}
        return record;
    }

    async function resolveComplaint(complaintId, faultType) {
        const list = getComplaints();
        const idx = list.findIndex(c => c.id === complaintId);
        if (idx === -1) return null;
        const item = list[idx];
        if (faultType === "store") {
            item.statusCode = "approved_store_fault";
            item.statusLabel = "Approved ✓ — Store Fault (Refund/Replacement & Email Sent)";
            item.resolutionNote = `Verified: Our team checked your 4+ photos & video for Order #${item.orderId}. We accept full responsibility (Store/Delivery Fault). Full replacement/refund recovery has been approved and confirmation email sent to ${item.email}.`;
        } else {
            item.statusCode = "rejected_user_fault";
            item.statusLabel = "Resolved — Customer Fault (Verification Email Sent)";
            item.resolutionNote = `Verified: Our team inspected the dispatch record and uploaded media for Order #${item.orderId}. The damage occurred post-delivery (Customer Handling). A detailed verification report has been emailed to ${item.email}.`;
        }
        item.emailSent = true;
        saveComplaints(list);
        try {
            await sendEmailViaEmailJS({
                to_email: item.email,
                email: item.email,
                user_email: item.email,
                to_name: item.customerName,
                subject: `FreshMart Complaint #${item.id} Resolution Update`,
                message: item.resolutionNote
            });
        } catch (e) {}
        return item;
    }

    return {
        getComplaints,
        getAll: getComplaints,
        saveComplaints,
        addComplaint,
        resolveComplaint,
        syncBadge
    };
})();

// Direct Enter-key navigation for Admin.html in Search Box (Preserved)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.id === 'desktop-search' || e.target.id === 'mobile-search')) {
        const val = (e.target.value || '').trim().toLowerCase();
        if (val === 'admin.html' || val === 'admin' || val === '0276') {
            e.preventDefault();
            window.location.href = 'admin.html';
        }
    }
});
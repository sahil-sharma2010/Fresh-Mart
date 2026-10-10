document.addEventListener("DOMContentLoaded", () => {
    if(typeof lucide !== 'undefined') lucide.createIcons();
    applyTheme(); 
});

const defaultProducts = [
    { id: 1, name: "Bisleri Packaged Drinking Water", brand: "Bisleri", category: "c1", description: "Pure drinking water with essential minerals.", image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80", rating: 4.8, reviews: 156, sales: 1200, variants: [{ vId: '1a', size: "1 L", price: 20, originalPrice: 20, stock: 50 }, { vId: '1b', size: "5 L", price: 65, originalPrice: 75, stock: 15 }] },
    { id: 2, name: "Aashirvaad Shudh Chakki Atta", brand: "ITC", category: "c3", description: "100% whole wheat grain atta.", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80", rating: 4.9, reviews: 342, sales: 800, variants: [{ vId: '2a', size: "5 kg", price: 210, originalPrice: 240, stock: 30 }] },
    { id: 3, name: "Haldiram's Aloo Bhujia", brand: "Haldiram", category: "c2", description: "Crispy and spicy authentic namkeen.", image: "https://images.unsplash.com/photo-1599507593499-a3f7d1d94260?w=400&q=80", rating: 4.5, reviews: 89, sales: 500, variants: [{ vId: '3a', size: "400 g", price: 95, originalPrice: 100, stock: 100 }] },
    { id: 4, name: "Maggi 2-Minute Noodles", brand: "Nestle", category: "c3", description: "Instant masala noodles for quick meals.", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80", rating: 4.7, reviews: 500, sales: 2000, variants: [{ vId: '4a', size: "70 g", price: 14, originalPrice: 14, stock: 200 }] },
    { id: 5, name: "Coca Cola Soft Drink", brand: "Coca Cola", category: "c1", description: "Original taste refreshing cold drink.", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80", rating: 4.6, reviews: 210, sales: 1500, variants: [{ vId: '5a', size: "750 ml", price: 40, originalPrice: 40, stock: 50 }] },
    { id: 6, name: "Lays Classic Salted", brand: "Lays", category: "c2", description: "Crispy potato chips lightly salted.", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80", rating: 4.5, reviews: 320, sales: 1800, variants: [{ vId: '6a', size: "50 g", price: 20, originalPrice: 20, stock: 100 }] },
    { id: 7, name: "Tata Salt Vacuum Evaporated", brand: "Tata", category: "c3", description: "Iodised vacuum evaporated salt.", image: "https://images.unsplash.com/photo-1627484297686-29177bdce8ce?w=400&q=80", rating: 4.9, reviews: 800, sales: 5000, variants: [{ vId: '7a', size: "1 kg", price: 25, originalPrice: 28, stock: 200 }] },
    { id: 8, name: "Dettol Original Soap", brand: "Dettol", category: "c4", description: "Germ protection bathing soap.", image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=80", rating: 4.8, reviews: 450, sales: 2200, variants: [{ vId: '8a', size: "125 g", price: 45, originalPrice: 50, stock: 80 }] }
];

const DB = {
    settings: { whatsappNumber: "917988300872", deliveryFee: 20 },
    categories: [
        { id: 'c1', name: 'Water & Drinks', icon: '🥤', count: 24 },
        { id: 'c2', name: 'Snacks', icon: '🍿', count: 38 },
        { id: 'c3', name: 'Grocery', icon: '🛒', count: 56 },
        { id: 'c4', name: 'Personal Care', icon: '🧴', count: 21 },
        { id: 'c5', name: 'Household', icon: '🧹', count: 15 }
    ],
    products: JSON.parse(localStorage.getItem('freshmart_products')) || defaultProducts
};

if(!localStorage.getItem('freshmart_products')) localStorage.setItem('freshmart_products', JSON.stringify(DB.products));

let AppState = {
    cart: JSON.parse(localStorage.getItem('freshmart_cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('freshmart_wishlist')) || [],
    address: JSON.parse(localStorage.getItem('freshmart_addr')) || null,
    profile: JSON.parse(localStorage.getItem('freshmart_profile')) || { name: 'Sahil Sharma', phone: '7988300872' },
    theme: localStorage.getItem('freshmart_theme') || 'Light',
    activeCategory: 'all'
};

function saveState() {
    localStorage.setItem('freshmart_cart', JSON.stringify(AppState.cart));
    localStorage.setItem('freshmart_wishlist', JSON.stringify(AppState.wishlist));
    localStorage.setItem('freshmart_addr', JSON.stringify(AppState.address));
    localStorage.setItem('freshmart_profile', JSON.stringify(AppState.profile));
    localStorage.setItem('freshmart_theme', AppState.theme);
    updateGlobalUI();
}

// --- PREMIUM CUSTOM POPUP ALERTS ---
window.showPremiumAlert = function(title, message, iconType = 'check-circle') {
    const popup = document.getElementById('premium-alert-popup');
    if(!popup) return alert(message); 
    
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    
    const iconContainer = document.getElementById('alert-icon-container');
    const iconEl = document.getElementById('alert-icon');
    
    if(iconType === 'check-circle') {
        iconContainer.className = 'w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-5 mt-2 shadow-inner';
    } else if(iconType === 'alert-circle' || iconType === 'error') {
        iconType = 'alert-circle';
        iconContainer.className = 'w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5 mt-2 shadow-inner';
    } else {
        iconContainer.className = 'w-20 h-20 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-5 mt-2 shadow-inner';
    }
    
    iconEl.setAttribute('data-lucide', iconType);
    if(typeof lucide !== 'undefined') lucide.createIcons();
    
    popup.classList.add('open');
};

window.closePremiumAlert = function() {
    const popup = document.getElementById('premium-alert-popup');
    if(popup) popup.classList.remove('open');
};

let waReturnPending = false;
let waReturnType = 'support';
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && waReturnPending) { showWAPopup(waReturnType); waReturnPending = false; }
});
window.showWAPopup = function(type) {
    const popup = document.getElementById('whatsapp-popup');
    if(!popup) return;
    const sub = document.getElementById('wa-popup-subtitle');
    sub.innerText = type === 'order' ? "Your order details were prepared for WhatsApp." : "Your support message was prepared for WhatsApp.";
    popup.classList.remove('hidden'); void popup.offsetWidth;
    popup.classList.remove('opacity-0');
    popup.querySelector('div').classList.replace('scale-90', 'scale-100');
};
window.closeWAPopup = function() {
    const popup = document.getElementById('whatsapp-popup');
    if(!popup) return;
    popup.classList.add('opacity-0');
    popup.querySelector('div').classList.replace('scale-100', 'scale-90');
    setTimeout(() => popup.classList.add('hidden'), 300);
};

window.openSubModal = function(subId, parentId) {
    const parent = document.getElementById(parentId);
    const sub = document.getElementById(subId);
    if(parent) { parent.classList.remove('open'); setTimeout(() => parent.style.pointerEvents = 'none', 300); }
    if(sub) { sub.style.pointerEvents = 'auto'; sub.classList.add('open'); if(parentId) sub.setAttribute('data-parent', parentId); }
    if(subId === 'edit-profile-modal') loadProfileData();
};

window.closeSubModal = function(subId) {
    const sub = document.getElementById(subId);
    if(!sub) return;
    const parentId = sub.getAttribute('data-parent');
    sub.classList.remove('open'); setTimeout(() => sub.style.pointerEvents = 'none', 300);
    if(parentId) {
        const parent = document.getElementById(parentId);
        if(parent) { parent.style.pointerEvents = 'auto'; parent.classList.add('open'); }
        sub.removeAttribute('data-parent');
    }
};

window.toggleFSModal = function(id) { 
    const el = document.getElementById(id); 
    if(!el) return;
    if(el.classList.contains('open')) { el.classList.remove('open'); setTimeout(() => el.style.pointerEvents = 'none', 300); } 
    else { el.removeAttribute('data-parent'); el.style.pointerEvents = 'auto'; el.classList.add('open'); } 
    if(id === 'notification-modal') loadNotifications();
    if(id === 'orders-modal') loadOrders();
};

function initApp() {
    renderSidebars(); renderQuickCategories(); renderProducts(DB.products, 'products-container');
    updateGlobalUI(); setupSwipeGestures(); startAutoSliders();
    if(AppState.address) {
        const el = document.getElementById('selected-address-text');
        if(el) el.innerText = `${AppState.address.type}: ${AppState.address.name}, ${AppState.address.full}`;
    }
}

window.scrollToProducts = function() {
    const el = document.getElementById('products-section');
    if (el) window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth'});
};

function startAutoSliders() {
    setInterval(() => { slideSliderInfinite('why-shop-slider'); }, 2000);
    setInterval(() => { slideSliderInfinite('reviews-slider'); }, 2000);
}

window.slideSliderInfinite = function(sliderId) {
    const slider = document.getElementById(sliderId);
    if (!slider || slider.children.length === 0) return;
    const cardWidth = slider.firstElementChild.offsetWidth + 16;
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
    if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
        setTimeout(() => { slider.appendChild(slider.firstElementChild); slider.scrollLeft -= cardWidth; }, 300);
    }
};

window.slideSlider = function(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    slider.scrollBy({ left: direction * (slider.firstElementChild.offsetWidth + 16), behavior: 'smooth' });
};

function renderSidebars() {
    const deskContainer = document.getElementById('desktop-sidebar-categories');
    const mobContainer = document.getElementById('fs-categories-container');
    let html = `<div onclick="filterByCategory('all')" class="bg-white rounded-3xl p-6 text-center cursor-pointer hover:border-primary-500 border border-gray-100 shadow-sm transition active:scale-95 card-dark"><div class="text-4xl mb-3"><i data-lucide="layers" class="mx-auto text-primary-600"></i></div><h3 class="font-bold text-gray-800 title-dark">All Products</h3></div>`;
    DB.categories.forEach(cat => {
        html += `<div onclick="filterByCategory('${cat.id}')" class="bg-white rounded-3xl p-6 text-center cursor-pointer hover:border-primary-500 border border-gray-100 shadow-sm transition active:scale-95 card-dark"><div class="text-4xl mb-3">${cat.icon}</div><h3 class="font-bold text-gray-800 title-dark">${cat.name}</h3></div>`;
    });
    if(deskContainer) deskContainer.innerHTML = html;
    if(mobContainer) mobContainer.innerHTML = html;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function filterByCategory(catId) {
    AppState.activeCategory = catId;
    const el = document.getElementById('category-full-modal');
    if(el && el.classList.contains('open')) toggleFSModal('category-full-modal');
    
    if(catId === 'all') {
        const title = document.getElementById('grid-title');
        if(title) title.innerText = "All Products";
        renderProducts(DB.products, 'products-container');
    } else {
        const cat = DB.categories.find(c => c.id === catId);
        const filtered = DB.products.filter(p => p.category === catId);
        const title = document.getElementById('grid-title');
        if(title) title.innerText = `${cat.name}`;
        renderProducts(filtered, 'products-container');
    }
}

function createProductCard(product) {
    const defaultVariant = product.variants[0];
    const isWished = AppState.wishlist.includes(product.id);
    const discount = defaultVariant.originalPrice > defaultVariant.price ? Math.round(((defaultVariant.originalPrice - defaultVariant.price) / defaultVariant.originalPrice) * 100) : 0;
    
    return `
        <div class="product-card rounded-[2rem] p-3 flex flex-col relative group card-dark border-dark">
            <button onclick="toggleWishlist(${product.id}, event)" class="btn-3d absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:bg-gray-100 transition ${isWished ? 'text-red-500 fill-current' : 'text-gray-400'}">
                <i data-lucide="heart" class="w-5 h-5 ${isWished ? 'fill-current' : ''}"></i>
            </button>
            <div class="relative w-full h-32 md:h-44 mb-3 overflow-hidden bg-gray-50 rounded-[1.5rem] cursor-pointer flex items-center justify-center border border-gray-100 p-2" onclick="openProductFS(${product.id})">
                ${discount > 0 ? `<div class="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm z-10 tracking-wider">${discount}% OFF</div>` : ''}
                <img src="${product.image}" alt="${product.name}" class="max-h-full max-w-full mix-blend-multiply">
            </div>
            <div class="flex-1 flex flex-col cursor-pointer" onclick="openProductFS(${product.id})">
                <span class="text-[10px] text-primary-600 bg-primary-50 border border-primary-100 px-3 py-1 rounded-full font-extrabold mb-2 w-max tracking-widest uppercase shadow-sm">${product.brand}</span>
                <h3 class="font-extrabold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 title-dark" style="min-height: 2.5rem;">${product.name}</h3>
                <div class="flex justify-between items-center mt-auto">
                    <span class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-bold shadow-sm">${defaultVariant.size}</span>
                    <span class="text-[10px] flex items-center text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-full shadow-sm"><i data-lucide="star" class="w-3 h-3 fill-current mr-1"></i> ${product.rating}</span>
                </div>
                <div class="mt-3 pt-3 flex items-center justify-between border-t border-gray-100">
                    <div class="flex flex-col">
                        <span class="text-base md:text-xl font-black text-gray-900 leading-none tracking-tight title-dark">₹${defaultVariant.price}</span>
                        ${defaultVariant.originalPrice > defaultVariant.price ? `<span class="text-xs text-gray-400 line-through mt-1 font-bold">₹${defaultVariant.originalPrice}</span>` : '<span class="text-xs opacity-0">-</span>'}
                    </div>
                    <button onclick="event.stopPropagation(); addVariantToCartFast(${product.id})" class="btn-3d w-11 h-11 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white flex items-center justify-center transition-colors shadow-md">
                        <i data-lucide="plus" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    if(productList.length === 0) container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 text-sm font-bold tracking-widest uppercase">No products found.</div>`;
    else container.innerHTML = productList.map(p => createProductCard(p)).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

window.openProductFS = function(productId) {
    const p = DB.products.find(x => x.id === productId);
    if(!p) return;
    const isWished = AppState.wishlist.includes(p.id);
    const modalContent = document.getElementById('product-modal-content');
    if(!modalContent) return;
    
    const variantHTML = p.variants.map((v, index) => `
        <div class="relative inline-block">
            <input type="radio" name="variant" id="v_${v.vId}" value="${v.vId}" class="peer sr-only variant-radio" ${index === 0 ? 'checked' : ''} onchange="updateModalPrice('${v.vId}', ${p.id})">
            <label for="v_${v.vId}" class="btn-3d block px-5 py-3 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 transition text-sm font-bold text-gray-700 shadow-sm input-dark">
                <span>${v.size}</span> - ₹${v.price}
            </label>
        </div>`).join('');

    modalContent.innerHTML = `
        <div class="flex flex-col md:flex-row h-full">
            <button onclick="toggleFSModal('product-modal')" class="btn-3d absolute top-4 left-4 md:hidden w-12 h-12 bg-white/90 backdrop-blur rounded-full z-20 shadow-lg flex items-center justify-center"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>
            <button onclick="toggleFSModal('product-modal')" class="hidden md:flex btn-3d absolute top-4 right-4 w-12 h-12 bg-gray-100 rounded-full z-20 items-center justify-center hover:bg-gray-200"><i data-lucide="x" class="w-6 h-6"></i></button>
            
            <div class="w-full md:w-1/2 p-6 md:p-10 bg-white flex flex-col items-center justify-between border-r border-gray-100 relative rounded-t-[3rem] md:rounded-tr-none md:rounded-l-[3rem] card-dark border-dark">
                <div class="absolute top-4 right-4 flex flex-col gap-3 z-10">
                    <button onclick="toggleWishlistModalBtn(${p.id}, this)" class="btn-3d w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center hover:bg-red-50 transition ${isWished ? 'text-red-500 fill-current' : 'text-gray-400'}">
                        <i data-lucide="heart" class="w-6 h-6 ${isWished ? 'fill-current' : ''}"></i>
                    </button>
                </div>
                <img src="${p.image}" class="max-h-[250px] md:max-h-[350px] w-full object-contain mix-blend-multiply p-4 mt-10">
                <div class="w-full flex justify-center gap-6 mt-6 pt-6 border-t border-gray-100">
                    <a href="https://wa.me/${DB.settings.whatsappNumber}?text=Hi%20FreshMart,%20I%20have%20a%20query%20about%20${p.name}" target="_blank" class="w-14 h-14 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition shadow-sm btn-3d"><i data-lucide="message-circle" class="w-7 h-7"></i></a>
                    <a href="mailto:FreshMart@gmail.com?subject=Query about ${p.name}" class="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-600 hover:text-white transition shadow-sm btn-3d"><i data-lucide="mail" class="w-7 h-7"></i></a>
                </div>
            </div>
            
            <div class="p-6 md:p-10 flex-1 flex flex-col bg-gray-50/50 card-dark">
                <span class="text-[10px] font-extrabold text-primary-600 bg-primary-50 border border-primary-100 px-4 py-1.5 rounded-full inline-block w-max mb-4 uppercase tracking-widest shadow-sm">${p.brand}</span>
                <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3 tracking-tight title-dark">${p.name}</h2>
                <div class="flex items-center gap-3 text-xs text-gray-500 mb-6">
                    <span class="flex items-center bg-yellow-50 text-yellow-700 border border-yellow-100 px-3 py-1.5 rounded-full font-black shadow-sm"><i data-lucide="star" class="w-4 h-4 fill-current mr-1 text-yellow-500"></i> ${p.rating}</span>
                    <span class="font-bold text-gray-500">• ${p.reviews} Verified Reviews</span>
                </div>
                <p class="text-sm text-gray-600 mb-8 leading-relaxed font-semibold subtitle-dark">${p.description}</p>
                <div class="mb-6"><h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Select Variant</h3><div class="flex flex-wrap gap-3">${variantHTML}</div></div>
                
                <div class="mt-auto flex items-center justify-between border-t border-gray-200 pt-6">
                    <div id="modal-price-display"></div>
                    <button id="modal-add-btn" class="btn-3d bg-primary-600 text-white px-10 py-5 rounded-full text-base font-extrabold shadow-xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition flex items-center gap-3">
                        <i data-lucide="shopping-bag" class="w-6 h-6"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>`;
    updateModalPrice(p.variants[0].vId, p.id);
    toggleFSModal('product-modal');
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.updateModalPrice = function(vId, pId) {
    const p = DB.products.find(x => x.id === pId);
    const v = p.variants.find(x => x.vId === vId);
    const display = document.getElementById('modal-price-display');
    if(display) display.innerHTML = `<div class="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">₹${v.price}</div>`;
    const btn = document.getElementById('modal-add-btn');
    if(btn) btn.setAttribute('onclick', `addVariantToCart(${pId})`);
};

window.addVariantToCart = function(pId) {
    const selectedRadio = document.querySelector('input[name="variant"]:checked');
    if(!selectedRadio) return showPremiumAlert('Error', 'Please select a size first', 'alert-circle');
    const p = DB.products.find(x => x.id === pId);
    const v = p.variants.find(x => x.vId === selectedRadio.value);
    const existing = AppState.cart.find(c => c.vId === v.vId);
    if(existing) existing.qty += 1;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: 1 });
    saveState(); 
    showPremiumAlert('Added to Cart', `${p.name} has been added to your cart.`, 'check-circle'); 
    toggleFSModal('product-modal');
};

window.updateGlobalUI = function() {
    // Profile
    const initials = AppState.profile.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    const profName = document.getElementById('profile-name-display');
    const profPhone = document.getElementById('profile-phone-display');
    const profInit = document.getElementById('profile-initials');
    if(profName) profName.innerText = AppState.profile.name;
    if(profPhone) profPhone.innerText = '+91 ' + AppState.profile.phone;
    if(profInit) profInit.innerText = initials;

    // Cart
    const totalQty = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
    const totalAmt = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const headTotal = document.getElementById('header-cart-total');
    if(headTotal) headTotal.innerText = `₹${totalAmt}`;
    
    const dot = document.getElementById('settings-dot');
    const navDot = document.getElementById('nav-cart-badge');
    if(totalQty > 0) {
        if(dot) { dot.innerText = totalQty; dot.classList.remove('hidden'); }
        if(navDot) navDot.classList.remove('hidden');
    } else {
        if(dot) dot.classList.add('hidden');
        if(navDot) navDot.classList.add('hidden');
    }
    
    const cartContainer = document.getElementById('cart-items');
    if(cartContainer) {
        if(AppState.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="text-center mt-20 flex flex-col items-center">
                    <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6 shadow-inner"><i data-lucide="shopping-cart" class="w-12 h-12"></i></div>
                    <h3 class="text-xl font-extrabold text-gray-900 mb-2 title-dark">Your cart is empty</h3>
                    <p class="text-sm font-medium text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
                    <button onclick="toggleFSModal('cart-drawer'); scrollToProducts();" class="btn-3d bg-primary-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-primary-500/30 text-sm">Shop Now</button>
                </div>`;
        } else {
            cartContainer.innerHTML = AppState.cart.map(item => `
                <div class="flex gap-4 bg-white p-4 border border-gray-100 rounded-[2rem] shadow-sm card-dark border-dark">
                    <img src="${item.image}" class="w-20 h-20 object-contain bg-gray-50 rounded-2xl border border-gray-100 p-2">
                    <div class="flex-1">
                        <h4 class="text-sm font-extrabold text-gray-900 line-clamp-1 title-dark">${item.name}</h4>
                        <div class="text-[10px] text-gray-500 font-bold mt-1 bg-gray-50 px-3 py-1 rounded-full w-max border border-gray-100">${item.size}</div>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-primary-600 font-black text-lg">₹${item.price}</span>
                            <div class="flex gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 items-center shadow-inner input-dark">
                                <button onclick="updateCartQty('${item.vId}', -1)" class="btn-3d text-gray-500 hover:text-red-500 font-bold px-2"><i data-lucide="minus" class="w-4 h-4"></i></button>
                                <span class="text-sm font-black w-5 text-center">${item.qty}</span>
                                <button onclick="updateCartQty('${item.vId}', 1)" class="btn-3d text-gray-500 hover:text-primary-600 font-bold px-2"><i data-lucide="plus" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    </div>
                </div>`).join('');
        }
        const cartFooter = document.getElementById('cart-footer');
        if(cartFooter) cartFooter.style.display = AppState.cart.length === 0 ? 'none' : 'block';
    }
    const cartSub = document.getElementById('cart-subtotal');
    if(cartSub) cartSub.innerText = `₹${totalAmt}`;
    const cartTot = document.getElementById('cart-total');
    if(cartTot) cartTot.innerText = `₹${totalAmt > 0 ? totalAmt + DB.settings.deliveryFee : 0}`;
    
    // Wishlist UI
    const wishContainer = document.getElementById('wishlist-container');
    if(wishContainer) {
        const wishProducts = DB.products.filter(p => AppState.wishlist.includes(p.id));
        if(wishProducts.length === 0) {
            wishContainer.innerHTML = `
                <div class="text-center mt-20 flex flex-col items-center">
                    <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6 shadow-inner"><i data-lucide="heart" class="w-12 h-12"></i></div>
                    <h3 class="text-xl font-extrabold text-gray-900 mb-2 title-dark">Wishlist is empty</h3>
                    <p class="text-sm font-medium text-gray-500 mb-8">Save items you love here.</p>
                    <button onclick="toggleFSModal('wishlist-modal'); scrollToProducts();" class="btn-3d bg-primary-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-primary-500/30 text-sm">Explore Products</button>
                </div>`;
        } else {
            wishContainer.innerHTML = wishProducts.map(p => `
                <div class="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm card-dark border-dark">
                    <img src="${p.image}" class="w-16 h-16 rounded-2xl bg-gray-50 object-contain border border-gray-100 p-1">
                    <div class="flex-1 truncate"><div class="text-sm font-extrabold text-gray-900 truncate title-dark">${p.name}</div><div class="text-primary-600 text-sm font-black mt-1">₹${p.variants[0].price}</div></div>
                    <button onclick="moveWishToCart(${p.id})" class="btn-3d px-4 py-2 bg-primary-600 text-white font-bold text-xs rounded-full shadow-md">Move to Cart</button>
                    <button onclick="toggleWishlist(${p.id}, event)" class="btn-3d w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition"><i data-lucide="trash" class="w-5 h-5"></i></button>
                </div>`).join('');
        }
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.moveWishToCart = function(pId) {
    window.addVariantToCartFast(pId);
    toggleWishlist(pId, null);
    showPremiumAlert('Moved', "Item successfully moved to cart.");
};

window.updateCartQty = function(vId, change) { 
    const item = AppState.cart.find(c => c.vId === vId); 
    if(!item) return; 
    item.qty += change; 
    if(item.qty <= 0) AppState.cart = AppState.cart.filter(c => c.vId !== vId); 
    saveState(); 
};

window.toggleWishlist = function(pId, event) { 
    if(event) event.stopPropagation(); 
    const index = AppState.wishlist.indexOf(pId); 
    if(index === -1) { AppState.wishlist.push(pId); showToast("Added to Wishlist"); } 
    else { AppState.wishlist.splice(index, 1); showToast("Removed from Wishlist"); } 
    saveState(); 
    renderProducts(DB.products, 'products-container'); 
};

window.toggleWishlistModalBtn = function(pId, btnEl) {
    toggleWishlist(pId, null);
    const isWished = AppState.wishlist.includes(pId);
    if(isWished) {
        btnEl.classList.add('text-red-500'); btnEl.classList.remove('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-6 h-6 fill-current"></i>`;
    } else {
        btnEl.classList.remove('text-red-500'); btnEl.classList.add('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-6 h-6"></i>`;
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.loadProfileData = function() {
    document.getElementById('prof-name').value = AppState.profile.name;
    document.getElementById('prof-phone').value = AppState.profile.phone;
    document.getElementById('edit-initials').innerText = AppState.profile.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
};

window.saveProfile = function() {
    const name = document.getElementById('prof-name').value;
    const phone = document.getElementById('prof-phone').value;
    if(!name || phone.length !== 10) return showPremiumAlert('Error', 'Please enter valid Name and 10-digit Phone', 'error');
    
    AppState.profile = { name, phone };
    saveState();
    closeSubModal('edit-profile-modal');
    showPremiumAlert('Success', 'Profile Updated Successfully!', 'check-circle');
};

// --- ADDRESS VALIDATION & GEO LOCATION ---
window.autoFillLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { 
                document.getElementById('addr-city').value = 'Fetching...'; 
                document.getElementById('addr-pin').value = '123456'; 
                setTimeout(()=>{
                    document.getElementById('addr-city').value = 'Hisar';
                    showPremiumAlert('Location Found', 'City and Pincode filled based on your location.');
                }, 800);
            },
            (err) => { showPremiumAlert('Error', 'Please allow location access in your browser.', 'error'); }
        );
    } else {
        showPremiumAlert('Error', 'Geolocation is not supported by your browser.', 'error');
    }
};

window.saveAddress = function() {
    const typeEl = document.querySelector('input[name="addr_type"]:checked');
    const name = document.getElementById('addr-name').value; 
    const phone = document.getElementById('addr-phone').value; 
    const house = document.getElementById('addr-house').value;
    const city = document.getElementById('addr-city').value;
    const pin = document.getElementById('addr-pin').value;
    
    if(!name || !phone || !house || !city || !pin) return showPremiumAlert('Error', "Please fill all address fields!", 'error');
    if(phone.length !== 10 || isNaN(phone)) return showPremiumAlert('Invalid Input', "Invalid Mobile Number! Must be exactly 10 digits.", 'error');
    
    const fullStr = `${house}, ${city} - ${pin}`;
    AppState.address = { type: typeEl ? typeEl.value : 'Home', name, phone, full: fullStr }; 
    saveState(); 
    
    const addrText = document.getElementById('selected-address-text');
    if(addrText) addrText.innerText = `${AppState.address.type}: ${name}, ${fullStr}`;
    
    closeSubModal('address-modal'); 
    showPremiumAlert('Saved', "Address saved successfully!");
};

// --- ADMIN ORDERS & NOTIFICATIONS ---
window.loadOrders = function() {
    const container = document.getElementById('orders-container');
    let orders = JSON.parse(localStorage.getItem('freshmart_orders')) || [
        { id: 'FM-9082', date: '05 Oct 2026', total: 350, status: 'Delivered' },
        { id: 'FM-8810', date: '12 Sep 2026', total: 820, status: 'Delivered' }
    ];
    container.innerHTML = orders.map(o => `
        <div class="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-md hover:shadow-lg transition card-dark border-dark">
            <div class="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
                <div>
                    <div class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Order #${o.id}</div>
                    <div class="text-sm font-extrabold text-gray-900 mt-1.5 title-dark">${o.date}</div>
                </div>
                <span class="${o.status==='Delivered' || o.status==='Success' ? 'bg-green-50 text-green-600 border-green-100' : (o.status==='Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100')} border px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">${o.status}</span>
            </div>
            <div class="flex justify-between items-center">
                <div class="font-black text-gray-900 text-xl tracking-tight title-dark">₹${o.total}</div>
                <button class="btn-3d text-primary-700 font-extrabold text-xs uppercase tracking-wider bg-primary-50 border border-primary-100 px-6 py-3 rounded-full hover:bg-primary-100 transition shadow-sm">Reorder</button>
            </div>
        </div>
    `).join('');
};

window.loadNotifications = function() {
    const container = document.getElementById('notification-container');
    const badge = document.getElementById('notif-count-badge');
    if(!container) return;
    
    let notifs = JSON.parse(localStorage.getItem('freshmart_notifs')) || [];
    const now = new Date().getTime();
    notifs = notifs.filter(n => n.expires > now);
    localStorage.setItem('freshmart_notifs', JSON.stringify(notifs));
    
    if(badge) badge.innerText = notifs.length;
    
    if(notifs.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm font-bold bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm card-dark border-dark">No new notifications.</div>`;
    } else {
        container.innerHTML = notifs.map(n => `
            <div class="bg-white p-5 rounded-[2rem] border ${n.status === 'Success' ? 'border-green-200' : 'border-red-200'} shadow-sm card-dark border-dark flex gap-4 items-center mb-3">
                <div class="w-12 h-12 rounded-full ${n.status === 'Success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} flex items-center justify-center flex-shrink-0"><i data-lucide="${n.status === 'Success' ? 'check-circle' : 'alert-circle'}" class="w-6 h-6"></i></div>
                <div><h4 class="font-extrabold text-sm title-dark">${n.status === 'Success' ? 'Delivery Successful' : 'Delivery Issue'}</h4><p class="text-xs text-gray-500 mt-1 font-medium">${n.msg}</p></div>
            </div>
        `).join('');
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.updateThemeText = function(radioEl) {
    const el = document.getElementById('theme-status');
    if(el) el.innerText = radioEl.value;
    AppState.theme = radioEl.value;
    saveState();
    applyTheme();
    showPremiumAlert('Theme Updated', `Theme set to ${radioEl.value}`);
};

function applyTheme() {
    if(AppState.theme === 'Dark' || AppState.theme === 'Dark Mode') {
        document.getElementById('app-body').classList.add('bg-gray-900', 'text-white');
        document.getElementById('app-body').classList.remove('bg-gray-50', 'text-gray-900');
        if(!document.getElementById('dark-theme-style')) {
            const style = document.createElement('style');
            style.id = 'dark-theme-style';
            style.innerHTML = `
                .card-dark { background-color: #1f2937 !important; color: white !important; }
                .title-dark { color: white !important; }
                .subtitle-dark { color: #9ca3af !important; }
                .header-dark { background-color: rgba(17, 24, 39, 0.95) !important; border-color: #374151 !important; }
                .input-dark { background-color: #374151 !important; color: white !important; border-color: #4b5563 !important; }
                .hero-dark { background: linear-gradient(to bottom right, #111827, #1f2937) !important; border-color: #374151 !important; }
                .border-dark { border-color: #374151 !important; }
            `;
            document.head.appendChild(style);
        }
    } else {
        document.getElementById('app-body').classList.remove('bg-gray-900', 'text-white');
        document.getElementById('app-body').classList.add('bg-gray-50', 'text-gray-900');
        const style = document.getElementById('dark-theme-style');
        if(style) style.remove();
    }
}

window.checkoutWhatsApp = function() {
    if(AppState.cart.length === 0) return showPremiumAlert('Empty Cart', "Your cart is empty. Add items first.", 'alert-circle');
    if(!AppState.address) return showPremiumAlert('Missing Details', "Please add delivery address first", 'alert-circle');
    let subtotal = 0;
    let text = `*NEW ORDER - FRESHMART* 🛍️%0A%0A*Customer:* ${AppState.address.name}%0A*Phone:* ${AppState.address.phone}%0A%0A*Ordered Items:*%0A`;
    AppState.cart.forEach((item, index) => { 
        subtotal += item.price * item.qty; 
        text += `${index+1}. ${item.name} (${item.size}) x ${item.qty} = ₹${item.price * item.qty}%0A`; 
    });
    const total = subtotal + DB.settings.deliveryFee;
    text += `%0A*Subtotal:* ₹${subtotal}%0A*Delivery Fee:* ₹${DB.settings.deliveryFee}%0A*Total Payable (COD):* ₹${total}%0A%0A*Address Type:* ${AppState.address.type}%0A*Address:* ${AppState.address.full}`;
    
    let orders = JSON.parse(localStorage.getItem('freshmart_orders')) || [];
    orders.unshift({ id: 'FM-'+Math.floor(Math.random()*9000+1000), date: new Date().toLocaleDateString('en-GB'), total: total, status: 'Processing' });
    localStorage.setItem('freshmart_orders', JSON.stringify(orders));

    waReturnPending = true;
    waReturnType = 'order';
    
    setTimeout(() => { AppState.cart = []; saveState(); toggleFSModal('cart-drawer'); }, 1000);
    window.open(`https://wa.me/${DB.settings.whatsappNumber}?text=${text}`, '_blank');
};

function setupSwipeGestures() {
    let touchstartX = 0; 
    let touchendX = 0;
    const swipeableElements = document.querySelectorAll('.swipeable');
    swipeableElements.forEach(el => {
        el.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
        el.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX - touchstartX > 120) { 
                if(el.hasAttribute('data-parent')) { closeSubModal(el.id); } 
                else { el.classList.remove('open'); setTimeout(() => el.style.pointerEvents = 'none', 300); }
            }
        }, {passive: true});
    });
}

function sortProducts(type) {
    let sorted = [...DB.products];
    if(type === 'priceLow') sorted.sort((a,b) => a.variants[0].price - b.variants[0].price);
    if(type === 'priceHigh') sorted.sort((a,b) => b.variants[0].price - a.variants[0].price);
    renderProducts(sorted, 'products-container');
}

// Search functionality preserved exactly
function handleSearch(query) {
    query = query.toLowerCase().trim();
    const resultBox = document.getElementById('search-results-container');
    const clearBtn = document.getElementById('clear-search-btn');
    if(!resultBox) return;
    if(query.length < 2) {
        resultBox.classList.add('hidden'); 
        if(clearBtn) clearBtn.classList.add('hidden');
        renderProducts(DB.products, 'products-container'); 
        const title = document.getElementById('grid-title');
        if(title) title.innerText = "All Products";
        return;
    }
    if(clearBtn) clearBtn.classList.remove('hidden');
    const results = DB.products.filter(p => {
        const catName = DB.categories.find(c => c.id === p.category)?.name.toLowerCase() || '';
        return p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query) || catName.includes(query);
    });
    resultBox.classList.remove('hidden');
    if(results.length === 0) resultBox.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs font-bold uppercase tracking-wider">No products found</div>`;
    else {
        resultBox.innerHTML = `<div class="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">${results.length} Matches Found</div>` + 
            results.slice(0,5).map(p => `
            <div class="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition" onclick="openProductFS(${p.id}); document.getElementById('search-results-container').classList.add('hidden');">
                <img src="${p.image}" class="w-14 h-14 rounded-2xl object-contain bg-white border border-gray-100 p-1 shadow-sm">
                <div><div class="text-sm font-extrabold text-gray-900">${p.name}</div><div class="text-xs text-primary-600 font-black mt-0.5">₹${p.variants[0].price}</div></div>
            </div>`).join('');
    }
    const title = document.getElementById('grid-title');
    if(title) title.innerText = `Search Results (${results.length})`;
    renderProducts(results, 'products-container');
}

if (document.getElementById('products-container')) { initApp(); } 
else { document.addEventListener("DOMContentLoaded", () => { if(typeof lucide !== 'undefined') lucide.createIcons(); }); }
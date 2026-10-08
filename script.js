// Initialize Icons
lucide.createIcons();

// --- 1. PRESERVED DATABASE ---
const DB = {
    settings: { whatsappNumber: "917988300872", deliveryFee: 20 },
    categories: [
        { id: 'c1', name: 'Water & Drinks', icon: '🥤', count: 24 },
        { id: 'c2', name: 'Snacks', icon: '🍿', count: 38 },
        { id: 'c3', name: 'Grocery', icon: '🛒', count: 56 },
        { id: 'c4', name: 'Personal Care', icon: '🧴', count: 21 },
        { id: 'c5', name: 'Household', icon: '🧹', count: 15 }
    ],
    products: [
        { 
            id: 1, name: "Bisleri Packaged Drinking Water", brand: "Bisleri", category: "c1", description: "Pure drinking water with essential minerals.", 
            image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80", rating: 4.8, reviews: 156, sales: 1200, 
            variants: [{ vId: '1a', size: "1 L", price: 20, originalPrice: 20, stock: 50 }, { vId: '1b', size: "5 L", price: 65, originalPrice: 75, stock: 15 }]
        },
        { 
            id: 2, name: "Aashirvaad Shudh Chakki Atta", brand: "ITC", category: "c3", description: "100% whole wheat grain atta.", 
            image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80", rating: 4.9, reviews: 342, sales: 800, 
            variants: [{ vId: '2a', size: "5 kg", price: 210, originalPrice: 240, stock: 30 }]
        },
        { 
            id: 3, name: "Haldiram's Aloo Bhujia", brand: "Haldiram", category: "c2", description: "Crispy and spicy authentic namkeen.", 
            image: "https://images.unsplash.com/photo-1599507593499-a3f7d1d94260?w=400&q=80", rating: 4.5, reviews: 89, sales: 500, 
            variants: [{ vId: '3a', size: "400 g", price: 95, originalPrice: 100, stock: 100 }]
        },
        { 
            id: 4, name: "Maggi 2-Minute Noodles", brand: "Nestle", category: "c3", description: "Instant masala noodles for quick meals.", 
            image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80", rating: 4.7, reviews: 500, sales: 2000, 
            variants: [{ vId: '4a', size: "70 g", price: 14, originalPrice: 14, stock: 200 }]
        }
    ]
};

let AppState = {
    cart: JSON.parse(localStorage.getItem('freshmart_cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('freshmart_wishlist')) || [],
    savedLater: JSON.parse(localStorage.getItem('freshmart_saved')) || [],
    recentlyViewed: JSON.parse(localStorage.getItem('freshmart_recent')) || [],
    address: JSON.parse(localStorage.getItem('freshmart_addr')) || null,
    activeCategory: 'all'
};

function saveState() {
    localStorage.setItem('freshmart_cart', JSON.stringify(AppState.cart));
    localStorage.setItem('freshmart_wishlist', JSON.stringify(AppState.wishlist));
    localStorage.setItem('freshmart_saved', JSON.stringify(AppState.savedLater));
    localStorage.setItem('freshmart_addr', JSON.stringify(AppState.address));
    updateGlobalUI();
}

// --- WHATSAPP RETURN POPUP LOGIC ---
let waReturnPending = false;
let waReturnType = 'support';

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && waReturnPending) {
        showWAPopup(waReturnType);
        waReturnPending = false;
    }
});

window.showWAPopup = function(type) {
    const popup = document.getElementById('whatsapp-popup');
    const sub = document.getElementById('wa-popup-subtitle');
    if(type === 'order') {
        sub.innerText = "Your order details were prepared for WhatsApp.";
    } else {
        sub.innerText = "Your support message was prepared for WhatsApp.";
    }
    popup.classList.remove('hidden');
    // trigger reflow
    void popup.offsetWidth;
    popup.classList.remove('opacity-0');
    popup.querySelector('div').classList.remove('scale-95');
    popup.querySelector('div').classList.add('scale-100');
    lucide.createIcons();
};

window.closeWAPopup = function() {
    const popup = document.getElementById('whatsapp-popup');
    popup.classList.add('opacity-0');
    popup.querySelector('div').classList.remove('scale-100');
    popup.querySelector('div').classList.add('scale-95');
    setTimeout(() => popup.classList.add('hidden'), 300);
};

// --- SUB-MODAL LOGIC (1-STEP BACK) ---
window.openSubModal = function(subId, parentId) {
    const parent = document.getElementById(parentId);
    const sub = document.getElementById(subId);
    
    if(parent) {
        parent.classList.remove('open');
        setTimeout(() => parent.style.pointerEvents = 'none', 300);
    }
    
    sub.style.pointerEvents = 'auto';
    sub.classList.add('open');
    sub.setAttribute('data-parent', parentId);
};

window.closeSubModal = function(subId) {
    const sub = document.getElementById(subId);
    const parentId = sub.getAttribute('data-parent');
    
    sub.classList.remove('open');
    setTimeout(() => sub.style.pointerEvents = 'none', 300);
    
    if(parentId) {
        const parent = document.getElementById(parentId);
        if(parent) {
            parent.style.pointerEvents = 'auto';
            parent.classList.add('open');
        }
        sub.removeAttribute('data-parent');
    }
};

window.toggleFSModal = function(id) { 
    const el = document.getElementById(id); 
    if(el.classList.contains('open')) { 
        el.classList.remove('open'); 
        setTimeout(() => el.style.pointerEvents = 'none', 300); 
    } else { 
        el.removeAttribute('data-parent');
        el.style.pointerEvents = 'auto'; 
        el.classList.add('open'); 
    } 
};

function initApp() {
    renderSidebars();
    renderQuickCategories();
    renderProducts(DB.products, 'products-container');
    updateGlobalUI();
    setupSwipeGestures();
    startAutoSliders();
    if(AppState.address) {
        document.getElementById('selected-address-text').innerText = `${AppState.address.type}: ${AppState.address.name}, ${AppState.address.full}`;
    }
}

// --- JUMP / SCROLL TO PRODUCTS ---
window.scrollToProducts = function() {
    const el = document.getElementById('products-section');
    if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
};

// --- INFINITE AUTO-SLIDERS (2 SECONDS GAP) ---
function startAutoSliders() {
    setInterval(() => { slideSliderInfinite('why-shop-slider'); }, 2000);
    setInterval(() => { slideSliderInfinite('reviews-slider'); }, 2000);
}

window.slideSliderInfinite = function(sliderId) {
    const slider = document.getElementById(sliderId);
    if (!slider || slider.children.length === 0) return;
    
    const firstCard = slider.firstElementChild;
    const cardWidth = firstCard.offsetWidth + 16;
    
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
    
    if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
        setTimeout(() => {
            slider.appendChild(firstCard);
            slider.scrollLeft -= cardWidth; 
        }, 300);
    }
};

window.slideSlider = function(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    const cardWidth = slider.firstElementChild ? slider.firstElementChild.offsetWidth + 16 : 280;
    slider.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
};

// --- RENDERING LOGIC ---
function renderSidebars() {
    const deskContainer = document.getElementById('desktop-sidebar-categories');
    const mobContainer = document.getElementById('fs-categories-container');
    
    let html = `
        <li onclick="filterByCategory('all')" class="sidebar-category p-2.5 rounded-2xl cursor-pointer hover:bg-gray-50 flex justify-between items-center transition ${AppState.activeCategory === 'all' ? 'active' : ''}">
            <span class="flex items-center gap-3 font-bold"><div class="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center"><i data-lucide="layers" class="w-4 h-4"></i></div> All Products</span>
        </li>
    `;
    DB.categories.forEach(cat => {
        html += `
        <li onclick="filterByCategory('${cat.id}')" class="sidebar-category p-2.5 rounded-2xl cursor-pointer hover:bg-gray-50 flex justify-between items-center transition ${AppState.activeCategory === cat.id ? 'active' : ''}">
            <span class="flex items-center gap-3 font-bold"><div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">${cat.icon}</div> ${cat.name}</span>
            <span class="text-[10px] text-gray-500 font-bold bg-white border border-gray-100 px-2 py-0.5 rounded-full">${cat.count}</span>
        </li>`;
    });

    if(deskContainer) deskContainer.innerHTML = html;
    if(mobContainer) mobContainer.innerHTML = html;
    lucide.createIcons();
}

function renderQuickCategories() {
    const container = document.getElementById('quick-categories');
    if(!container) return;
    container.innerHTML = DB.categories.map(cat => `
        <div onclick="filterByCategory('${cat.id}')" class="bg-gray-50 rounded-full px-5 py-2.5 flex items-center gap-2 cursor-pointer border border-gray-200 hover:border-primary-500 whitespace-nowrap text-xs md:text-sm font-bold transition active:scale-95 shadow-sm">
            <span class="text-base">${cat.icon}</span> ${cat.name}
        </div>
    `).join('');
}

function filterByCategory(catId) {
    AppState.activeCategory = catId;
    renderSidebars();
    const el = document.getElementById('category-modal');
    if(el && el.classList.contains('open')) toggleFSModal('category-modal');
    
    if(catId === 'all') {
        document.getElementById('grid-title').innerText = "All Products";
        renderProducts(DB.products, 'products-container');
    } else {
        const cat = DB.categories.find(c => c.id === catId);
        const filtered = DB.products.filter(p => p.category === catId);
        document.getElementById('grid-title').innerText = `${cat.name}`;
        renderProducts(filtered, 'products-container');
    }
}

function createProductCard(product) {
    const defaultVariant = product.variants[0];
    const isWished = AppState.wishlist.includes(product.id);
    const discount = defaultVariant.originalPrice > defaultVariant.price ? Math.round(((defaultVariant.originalPrice - defaultVariant.price) / defaultVariant.originalPrice) * 100) : 0;
    
    return `
        <div class="product-card rounded-3xl p-3 flex flex-col relative group">
            <button onclick="toggleWishlist(${product.id}, event)" class="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-gray-100 transition ${isWished ? 'text-red-500 fill-current' : 'text-gray-400'}">
                <i data-lucide="heart" class="w-4 h-4 ${isWished ? 'fill-current' : ''}"></i>
            </button>
            
            <div class="relative w-full h-32 md:h-44 mb-3 overflow-hidden bg-gray-50 rounded-2xl cursor-pointer flex items-center justify-center border border-gray-100 p-2" onclick="openProductFS(${product.id})">
                ${discount > 0 ? `<div class="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm z-10 tracking-wider">${discount}% OFF</div>` : ''}
                <img src="${product.image}" alt="${product.name}" class="max-h-full max-w-full mix-blend-multiply">
            </div>
            
            <div class="flex-1 flex flex-col cursor-pointer" onclick="openProductFS(${product.id})">
                <span class="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md font-bold mb-1.5 w-max tracking-wider uppercase">${product.brand}</span>
                <h3 class="font-bold text-gray-900 text-xs md:text-sm leading-snug mb-1.5 line-clamp-2" style="min-height: 2.2rem;">${product.name}</h3>
                
                <div class="flex justify-between items-center mt-1">
                    <span class="text-[10px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold">${defaultVariant.size}</span>
                    <span class="text-[10px] flex items-center text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-full"><i data-lucide="star" class="w-3 h-3 fill-current mr-0.5"></i> ${product.rating}</span>
                </div>
                
                <div class="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                    <div class="flex flex-col">
                        <span class="text-sm md:text-base font-black text-gray-900 leading-none">₹${defaultVariant.price}</span>
                        ${defaultVariant.originalPrice > defaultVariant.price ? `<span class="text-[10px] text-gray-400 line-through mt-0.5 font-semibold">₹${defaultVariant.originalPrice}</span>` : '<span class="text-[10px] opacity-0">-</span>'}
                    </div>
                    <button onclick="event.stopPropagation(); addVariantToCartFast(${product.id})" class="w-9 h-9 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white flex items-center justify-center transition-colors shadow-sm">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if(productList.length === 0) container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 text-sm font-semibold">No products found.</div>`;
    else container.innerHTML = productList.map(p => createProductCard(p)).join('');
    lucide.createIcons();
}

function handleSearch(query) {
    query = query.toLowerCase().trim();
    const resultBox = document.getElementById('search-results-container');
    const clearBtn = document.getElementById('clear-search-btn');
    if(query.length < 2) {
        resultBox.classList.add('hidden'); 
        if(clearBtn) clearBtn.classList.add('hidden');
        renderProducts(DB.products, 'products-container'); 
        document.getElementById('grid-title').innerText = "All Products";
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
        resultBox.innerHTML = `<div class="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">${results.length} Matches Found</div>` + 
            results.slice(0,5).map(p => `
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition" onclick="openProductFS(${p.id}); document.getElementById('search-results-container').classList.add('hidden');">
                <img src="${p.image}" class="w-12 h-12 rounded-xl object-contain bg-white border border-gray-100 p-1">
                <div><div class="text-xs font-bold text-gray-900">${p.name}</div><div class="text-xs text-primary-600 font-black mt-0.5">₹${p.variants[0].price}</div></div>
            </div>`).join('');
    }
    document.getElementById('grid-title').innerText = `Search Results (${results.length})`;
    renderProducts(results, 'products-container');
}

window.addVariantToCartFast = function(pId) {
    const p = DB.products.find(x => x.id === pId);
    const v = p.variants[0];
    const existing = AppState.cart.find(c => c.vId === v.vId);
    if(existing) existing.qty += 1;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: 1 });
    saveState(); 
    showToast("Added to Cart!");
};

window.openProductFS = function(productId) {
    const p = DB.products.find(x => x.id === productId);
    if(!p) return;
    
    const isWished = AppState.wishlist.includes(p.id);
    const isSaved = AppState.savedLater.includes(p.id);
    
    const modalContent = document.getElementById('product-modal-content');
    const variantHTML = p.variants.map((v, index) => `
        <div class="relative inline-block">
            <input type="radio" name="variant" id="v_${v.vId}" value="${v.vId}" class="peer sr-only variant-radio" ${index === 0 ? 'checked' : ''} onchange="updateModalPrice('${v.vId}', ${p.id})">
            <label for="v_${v.vId}" class="block px-4 py-2.5 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 transition text-sm font-bold text-gray-700 shadow-sm">
                <span>${v.size}</span> - ₹${v.price}
            </label>
        </div>`).join('');

    modalContent.innerHTML = `
        <div class="flex flex-col md:flex-row h-full">
            <button onclick="toggleFSModal('product-modal')" class="absolute top-4 left-4 md:hidden w-10 h-10 bg-white/90 backdrop-blur rounded-full z-20 shadow-md flex items-center justify-center"><i data-lucide="arrow-left" class="w-5 h-5"></i></button>
            <button onclick="toggleFSModal('product-modal')" class="hidden md:flex absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full z-20 items-center justify-center hover:bg-gray-200"><i data-lucide="x" class="w-5 h-5"></i></button>
            
            <div class="w-full md:w-1/2 p-6 md:p-10 bg-white flex flex-col items-center justify-center border-r border-gray-100 relative">
                <div class="absolute top-4 right-4 flex flex-col gap-3 z-10">
                    <button onclick="toggleWishlistModalBtn(${p.id}, this)" class="w-11 h-11 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:bg-red-50 transition ${isWished ? 'text-red-500 fill-current' : 'text-gray-400'}">
                        <i data-lucide="heart" class="w-5 h-5 ${isWished ? 'fill-current' : ''}"></i>
                    </button>
                    <button onclick="toggleSaveLaterModalBtn(${p.id}, this)" class="w-11 h-11 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:bg-yellow-50 transition ${isSaved ? 'text-yellow-500 fill-current' : 'text-gray-400'}">
                        <i data-lucide="bookmark" class="w-5 h-5 ${isSaved ? 'fill-current' : ''}"></i>
                    </button>
                </div>
                <img src="${p.image}" class="max-h-[250px] md:max-h-[350px] w-full object-contain mix-blend-multiply p-4">
            </div>
            
            <div class="p-6 md:p-8 flex-1 flex flex-col bg-gray-50/50">
                <span class="text-[10px] font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full inline-block w-max mb-3 uppercase tracking-wider border border-primary-100">${p.brand}</span>
                <h2 class="text-xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2">${p.name}</h2>
                <div class="flex items-center gap-3 text-xs text-gray-500 mb-6">
                    <span class="flex items-center bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-md font-bold border border-yellow-100"><i data-lucide="star" class="w-3.5 h-3.5 fill-current mr-1 text-yellow-500"></i> ${p.rating}</span>
                    <span class="font-bold">• ${p.reviews} Verified Reviews</span>
                </div>
                <p class="text-sm text-gray-600 mb-8 leading-relaxed font-medium">${p.description}</p>
                <div class="mb-6"><h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Variant</h3><div class="flex flex-wrap gap-3">${variantHTML}</div></div>
                
                <div class="mt-auto flex items-center justify-between border-t border-gray-200 pt-5">
                    <div id="modal-price-display"></div>
                    <button id="modal-add-btn" class="bg-primary-600 text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition flex items-center gap-2">
                        <i data-lucide="shopping-bag" class="w-5 h-5"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>`;
    updateModalPrice(p.variants[0].vId, p.id);
    toggleFSModal('product-modal');
    lucide.createIcons();
};

window.updateModalPrice = function(vId, pId) {
    const p = DB.products.find(x => x.id === pId);
    const v = p.variants.find(x => x.vId === vId);
    document.getElementById('modal-price-display').innerHTML = `<div class="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">₹${v.price}</div>`;
    document.getElementById('modal-add-btn').setAttribute('onclick', `addVariantToCart(${pId})`);
};

window.addVariantToCart = function(pId) {
    const selectedRadio = document.querySelector('input[name="variant"]:checked');
    if(!selectedRadio) return showToast("Select size");
    const p = DB.products.find(x => x.id === pId);
    const v = p.variants.find(x => x.vId === selectedRadio.value);
    const existing = AppState.cart.find(c => c.vId === v.vId);
    if(existing) existing.qty += 1;
    else AppState.cart.push({ pId: p.id, name: p.name, image: p.image, vId: v.vId, size: v.size, price: v.price, qty: 1 });
    saveState(); 
    showToast("Added to Cart!"); 
    toggleFSModal('product-modal');
};

function updateGlobalUI() {
    const totalQty = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
    const totalAmt = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    document.getElementById('header-cart-total').innerText = `₹${totalAmt}`;
    const dot = document.getElementById('settings-dot');
    const navDot = document.getElementById('nav-cart-badge');
    if(totalQty > 0) {
        dot.innerText = totalQty; 
        dot.classList.remove('hidden');
        if(navDot) navDot.classList.remove('hidden');
    } else {
        dot.classList.add('hidden');
        if(navDot) navDot.classList.add('hidden');
    }
    
    const cartContainer = document.getElementById('cart-items');
    if(AppState.cart.length === 0) cartContainer.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm font-medium">Your cart is empty</div>`;
    else {
        cartContainer.innerHTML = AppState.cart.map(item => `
            <div class="flex gap-3 bg-white p-3 border border-gray-100 rounded-3xl shadow-sm">
                <img src="${item.image}" class="w-16 h-16 object-contain bg-gray-50 rounded-2xl border border-gray-100 p-1">
                <div class="flex-1">
                    <h4 class="text-xs font-bold text-gray-900 line-clamp-1">${item.name}</h4>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5 bg-gray-50 px-2 py-0.5 rounded-md w-max">${item.size}</div>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-primary-600 font-black text-sm">₹${item.price}</span>
                        <div class="flex gap-2 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 items-center">
                            <button onclick="updateCartQty('${item.vId}', -1)" class="text-gray-500 hover:text-red-500 font-bold px-1.5"><i data-lucide="minus" class="w-3 h-3"></i></button>
                            <span class="text-xs font-bold w-4 text-center">${item.qty}</span>
                            <button onclick="updateCartQty('${item.vId}', 1)" class="text-gray-500 hover:text-primary-600 font-bold px-1.5"><i data-lucide="plus" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }
    document.getElementById('cart-subtotal').innerText = `₹${totalAmt}`;
    document.getElementById('cart-total').innerText = `₹${totalAmt > 0 ? totalAmt + DB.settings.deliveryFee : 0}`;
    
    // Update Wishlist
    const wishContainer = document.getElementById('wishlist-container');
    if(wishContainer) {
        const wishProducts = DB.products.filter(p => AppState.wishlist.includes(p.id));
        if(wishProducts.length === 0) wishContainer.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm font-medium">Wishlist is empty</div>`;
        else {
            wishContainer.innerHTML = wishProducts.map(p => `
                <div class="flex items-center gap-3 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
                    <img src="${p.image}" class="w-16 h-16 rounded-2xl bg-gray-50 object-contain border border-gray-100 p-1">
                    <div class="flex-1 truncate"><div class="text-xs font-bold text-gray-900 truncate">${p.name}</div><div class="text-primary-600 text-xs font-black mt-1">₹${p.variants[0].price}</div></div>
                    <button onclick="openProductFS(${p.id})" class="w-9 h-9 flex items-center justify-center bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition"><i data-lucide="shopping-bag" class="w-4 h-4"></i></button>
                    <button onclick="toggleWishlist(${p.id}, event)" class="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>`).join('');
        }
    }

    // Update Saved For Later
    const savedContainer = document.getElementById('saved-later-container');
    if(savedContainer) {
        const savedProducts = DB.products.filter(p => AppState.savedLater.includes(p.id));
        if(savedProducts.length === 0) savedContainer.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm font-medium">No items saved for later.</div>`;
        else {
            savedContainer.innerHTML = savedProducts.map(p => `
                <div class="flex items-center gap-3 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
                    <img src="${p.image}" class="w-16 h-16 rounded-2xl bg-gray-50 object-contain border border-gray-100 p-1">
                    <div class="flex-1 truncate"><div class="text-xs font-bold text-gray-900 truncate">${p.name}</div><div class="text-primary-600 text-xs font-black mt-1">₹${p.variants[0].price}</div></div>
                    <button onclick="openProductFS(${p.id})" class="w-9 h-9 flex items-center justify-center bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition"><i data-lucide="shopping-bag" class="w-4 h-4"></i></button>
                    <button onclick="toggleSaveLater(${p.id}, event)" class="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>`).join('');
        }
    }
    lucide.createIcons();
}

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

window.toggleSaveLater = function(pId, event) { 
    if(event) event.stopPropagation(); 
    const index = AppState.savedLater.indexOf(pId); 
    if(index === -1) { AppState.savedLater.push(pId); showToast("Saved for later"); } 
    else { AppState.savedLater.splice(index, 1); showToast("Removed from saved items"); } 
    saveState(); 
};

window.toggleWishlistModalBtn = function(pId, btnEl) {
    toggleWishlist(pId, null);
    const isWished = AppState.wishlist.includes(pId);
    if(isWished) {
        btnEl.classList.add('text-red-500'); btnEl.classList.remove('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-5 h-5 fill-current"></i>`;
    } else {
        btnEl.classList.remove('text-red-500'); btnEl.classList.add('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="heart" class="w-5 h-5"></i>`;
    }
    lucide.createIcons();
};

window.toggleSaveLaterModalBtn = function(pId, btnEl) {
    toggleSaveLater(pId, null);
    const isSaved = AppState.savedLater.includes(pId);
    if(isSaved) {
        btnEl.classList.add('text-yellow-500'); btnEl.classList.remove('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="bookmark" class="w-5 h-5 fill-current"></i>`;
    } else {
        btnEl.classList.remove('text-yellow-500'); btnEl.classList.add('text-gray-400');
        btnEl.innerHTML = `<i data-lucide="bookmark" class="w-5 h-5"></i>`;
    }
    lucide.createIcons();
};

window.updateThemeText = function(radioEl) {
    document.getElementById('theme-status').innerText = radioEl.value;
    showToast(`Theme set to ${radioEl.value}`);
};

window.showToast = function(msg) { 
    const container = document.getElementById('toast-container'); 
    const toast = document.createElement('div'); 
    toast.className = `toast-notification bg-gray-900 text-white px-5 py-3 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 tracking-wide`; 
    toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-primary-400"></i> ${msg}`; 
    container.appendChild(toast); 
    lucide.createIcons();
    setTimeout(() => toast.remove(), 2500); 
};

window.checkoutWhatsApp = function() {
    if(AppState.cart.length === 0) return showToast("Cart is empty");
    if(!AppState.address) return showToast("Please add delivery address first");
    let subtotal = 0;
    let text = `*NEW ORDER - FRESHMART* 🛍️%0A%0A*Customer:* ${AppState.address.name}%0A*Phone:* ${AppState.address.phone}%0A%0A*Ordered Items:*%0A`;
    AppState.cart.forEach((item, index) => { 
        subtotal += item.price * item.qty; 
        text += `${index+1}. ${item.name} (${item.size}) x ${item.qty} = ₹${item.price * item.qty}%0A`; 
    });
    const total = subtotal + DB.settings.deliveryFee;
    text += `%0A*Subtotal:* ₹${subtotal}%0A*Delivery Fee:* ₹${DB.settings.deliveryFee}%0A*Total Payable (COD):* ₹${total}%0A%0A*Address Type:* ${AppState.address.type}%0A*Address:* ${AppState.address.full}`;
    
    waReturnPending = true;
    waReturnType = 'order';
    
    setTimeout(() => { AppState.cart = []; saveState(); toggleFSModal('cart-drawer'); }, 1000);
    window.open(`https://wa.me/${DB.settings.whatsappNumber}?text=${text}`, '_blank');
};

window.supportWhatsApp = function() {
    waReturnPending = true;
    waReturnType = 'support';
};

window.saveAddress = function() {
    const typeEl = document.querySelector('input[name="addr_type"]:checked');
    const name = document.getElementById('addr-name').value; 
    const phone = document.getElementById('addr-phone').value; 
    const house = document.getElementById('addr-house').value;
    const city = document.getElementById('addr-city').value;
    const pin = document.getElementById('addr-pin').value;
    
    if(!name || !phone || !house || !city || !pin) return showToast("Please fill all address fields");
    
    const fullStr = `${house}, ${city} - ${pin}`;
    AppState.address = { type: typeEl.value, name, phone, full: fullStr }; 
    saveState(); 
    document.getElementById('selected-address-text').innerText = `${typeEl.value}: ${name}, ${fullStr}`;
    closeSubModal('address-modal'); 
    showToast("Address saved!");
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
                if(el.hasAttribute('data-parent')) {
                    closeSubModal(el.id);
                } else {
                    el.classList.remove('open'); 
                    setTimeout(() => el.style.pointerEvents = 'none', 300); 
                }
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

// Initial Boot
initApp();
const API_BASE = 'https://root-2-reach.onrender.com/api';
let currentLang = localStorage.getItem('lang') || 'en';
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = 'login.html';
}

const dashboardTranslations = {
    en: {
        home: "Home", logout: "Logout", welcome: "Welcome", traditional_products: "Traditional Products",
        my_products: "My Products", add_product: "Add Product", save: "Save Product",
        name_en: "Name (English)", name_ta: "Name (Tamil)", desc_en: "Description (English)",
        desc_ta: "Description (Tamil)", district: "District", category: "Category", product_image: "Product Image"
    },
    ta: {
        home: "முகப்பு", logout: "வெளியேறு", welcome: "வரவேற்கிறோம்", traditional_products: "பாரம்பரிய பொருட்கள்",
        my_products: "எனது பொருட்கள்", add_product: "பொருளைச் சேர்", save: "சேமி",
        name_en: "பெயர் (ஆங்கிலம்)", name_ta: "பெயர் (தமிழ்)", desc_en: "விளக்கம் (ஆங்கிலம்)",
        desc_ta: "விளக்கம் (தமிழ்)", district: "மாவட்டம்", category: "வகை", product_image: "பொருள் படம்"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initLangSwitcher();
    updateDashboardUI();

    document.getElementById('user-name').textContent = localStorage.getItem('name') || '';

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    if (window.location.pathname.includes('buyer')) {
        if (role !== 'BUYER') window.location.href = 'seller-dashboard.html';
        initBuyerDashboard();
    } else if (window.location.pathname.includes('seller')) {
        if (role !== 'SELLER') window.location.href = 'buyer-dashboard.html';
        initSellerDashboard();
    }
});

function initLangSwitcher() {
    const langBtn = document.getElementById('lang-btn');
    if(langBtn) {
        document.body.className = currentLang === 'ta' ? 'lang-ta' : '';
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'ta' : 'en';
            localStorage.setItem('lang', currentLang);
            document.body.className = currentLang === 'ta' ? 'lang-ta' : '';
            updateDashboardUI();
        });
    }
}

function updateDashboardUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dashboardTranslations[currentLang][key]) {
            el.textContent = dashboardTranslations[currentLang][key];
        }
    });
    // Re-fetch to apply language dynamically to DB data
    if (window.location.pathname.includes('buyer')) fetchAllProducts();
    if (window.location.pathname.includes('seller')) fetchSellerProducts();
}

// ---- BUYER LOGIC ----
async function initBuyerDashboard() {
    fetchAllProducts();
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            fetchAllProducts(e.target.value);
        });
    }
}

async function fetchAllProducts(search = '') {
    try {
        const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const products = await res.json();
        renderProducts(products, 'products-grid', false);
    } catch(e) { console.error(e); }
}

// ---- SELLER LOGIC ----
async function initSellerDashboard() {
    fetchSellerProducts();
    populateSelects();

    const modal = document.getElementById('add-modal');
    document.getElementById('open-add-modal').addEventListener('click', () => { modal.style.display = 'flex'; });
    document.getElementById('close-modal').addEventListener('click', () => { modal.style.display = 'none'; });

    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('p-name').value);
        formData.append('name_ta', document.getElementById('p-name-ta').value);
        formData.append('description', document.getElementById('p-desc').value);
        formData.append('description_ta', document.getElementById('p-desc-ta').value);
        formData.append('price', document.getElementById('p-price').value);
        formData.append('quantity', document.getElementById('p-quantity').value);
        formData.append('district_id', document.getElementById('p-district').value);
        formData.append('category_id', document.getElementById('p-category').value);
        
        const fileField = document.getElementById('p-image');
        if(fileField.files[0]) formData.append('image', fileField.files[0]);

        try {
            const res = await fetch(`${API_BASE}/seller/products`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if(res.ok) {
                modal.style.display = 'none';
                e.target.reset();
                fetchSellerProducts();
                alert('Product added successfully!');
            } else if (res.status === 401) {
                // Session expired (stale JWT) — clear storage and redirect
                alert('Your session has expired. Please login again.');
                localStorage.clear();
                window.location.href = 'login.html';
            } else {
                alert('Error adding product: ' + (data.error || 'Unknown error'));
            }
        } catch(err) { alert('Network error: ' + err.message); }
    });
}

async function fetchSellerProducts() {
    try {
        const res = await fetch(`${API_BASE}/seller/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const products = await res.json();
        renderProducts(products, 'seller-products-grid', true);
    } catch(e) { console.error(e); }
}

async function populateSelects() {
    const distSelect = document.getElementById('p-district');
    const catSelect = document.getElementById('p-category');
    if(!distSelect) return;
    
    try {
        const [dRes, cRes] = await Promise.all([fetch(`${API_BASE}/districts`), fetch(`${API_BASE}/categories`)]);
        const districts = await dRes.json();
        const categories = await cRes.json();
        
        districts.forEach(d => {
            const o = document.createElement('option'); o.value = d.id; o.textContent = currentLang === 'en' ? d.name_en : d.name_ta;
            distSelect.appendChild(o);
        });
        categories.forEach(c => {
            const o = document.createElement('option'); o.value = c.id; o.textContent = currentLang === 'en' ? c.name_en : c.name_ta;
            catSelect.appendChild(o);
        });
    } catch(e) {}
}

async function deleteProduct(id) {
    if(!confirm("Are you sure you want to delete this product?")) return;
    try {
        const res = await fetch(`${API_BASE}/seller/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) fetchSellerProducts();
    } catch(e) { console.error(e); }
}

// ---- SHARED RENDER LOGIC ----
function renderProducts(products, containerId, isSeller) {
    const grid = document.getElementById(containerId);
    if(!grid) return;
    grid.innerHTML = '';
    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">No products found.</p>';
        return;
    }
    products.forEach(p => {
        const name = (currentLang === 'ta' && p.name_ta) ? p.name_ta : (p.name || 'Unnamed Product');
        const desc = (currentLang === 'ta' && p.description_ta) ? p.description_ta : (p.description || '');
        const districtName = p.district_name || '-';
        const categoryName = p.category_name || '-';
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        const imgUrl = p.image_url ? p.image_url : 'https://via.placeholder.com/300x200?text=No+Image';
        
        card.innerHTML = `
            <div style="overflow:hidden; border-radius:12px 12px 0 0;">
                <img src="${imgUrl}" alt="${name}" class="card-img" style="transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=No+Image';">
            </div>
            <div class="card-body">
                <span class="badge badge-district">${districtName}</span>
                <span class="badge badge-cat">${categoryName}</span>
                <h3 class="card-title" style="margin-top: 10px;">${name}</h3>
                <p class="card-text">${desc ? desc.substring(0,60) + '...' : ''}</p>
                <div class="price-tag">₹${p.price}</div>
                <div style="font-size: 0.85rem; color: #777; margin-top: 8px;">
                    <strong>Seller:</strong> ${p.business_name || p.seller_name || 'N/A'}
                </div>
                ${isSeller ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                        <p style="font-size:0.85rem;color:#888;">Stock: ${p.quantity || 0}</p>
                        <button class="del-btn" onclick="event.stopPropagation(); deleteProduct(${p.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.location.href = `product-detail.html?id=${p.id}`;
        });
        
        grid.appendChild(card);
    });
}

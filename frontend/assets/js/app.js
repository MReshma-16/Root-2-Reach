const API_BASE = 'http://localhost:3000/api';
let currentLang = 'en';

const translations = {
    en: {
        home: "Home",
        login: "Login",
        register: "Register",
        dashboard: "Dashboard",
        logout: "Logout",
        hero_title: "From Local Hands to Your Hands",
        hero_desc: "Explore authentic traditional crafts, handlooms, and agricultural treasures brought directly from local artisans.",
        explore_now: "Explore Now",
        featured_districts: "Featured Districts",
        traditional_products: "Traditional Products",
        footer_text: "Preserving Heritage, Empowering Artisans."
    },
    ta: {
        home: "முகப்பு",
        login: "உள்நுழைய",
        register: "பதிவு செய்க",
        dashboard: "டாஷ்போர்டு",
        logout: "வெளியேறு",
        hero_title: "உள்ளூர் கைகளிலிருந்து உங்கள் கைகளுக்கு",
        hero_desc: "உள்ளூர் கைவினைஞர்களிடமிருந்து நேரடியாகக் கொண்டுவரப்பட்ட உண்மையான பாரம்பரிய கைவினைப்பொருட்கள் மற்றும் விவசாயப் பொக்கிஷங்களை ஆராயுங்கள்.",
        explore_now: "இப்போதே ஆராயுங்கள்",
        featured_districts: "சிறப்பு மாவட்டங்கள்",
        traditional_products: "பாரம்பரிய பொருட்கள்",
        footer_text: "பாரம்பரியத்தை பாதுகாத்தல், கைவினைஞர்களை மேம்படுத்துதல்."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initLangSwitcher();
    fetchDistricts();
    fetchProducts();
});

function initLangSwitcher() {
    const langBtn = document.getElementById('lang-btn');
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ta' : 'en';
        document.body.className = currentLang === 'ta' ? 'lang-ta' : '';
        updateUI();
    });
}

function updateUI() {
    // Update static translations
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    // Re-render dynamic content to apply correct language
    fetchDistricts();
    fetchProducts();
}

async function fetchDistricts() {
    try {
        const response = await fetch(`${API_BASE}/districts`);
        const districts = await response.json();
        renderDistricts(districts);
    } catch (error) {
        console.error("Failed to fetch districts", error);
    }
}

function renderDistricts(districts) {
    const grid = document.getElementById('districts-grid');
    if (!grid) return;
    grid.innerHTML = '';
    districts.forEach(d => {
        const name = currentLang === 'en' ? d.name_en : d.name_ta;
        const desc = currentLang === 'en' ? d.description_en : d.description_ta;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <img src="${d.image_url || 'https://via.placeholder.com/300x200'}" alt="${name}" class="card-img" style="transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div class="card-body">
                <h3 class="card-title">${name}</h3>
                <p class="card-text">${desc}</p>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = `district-detail.html?id=${d.id}`;
        });
        grid.appendChild(card);
    });
}

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error("Failed to fetch products", error);
    }
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = '';
    products.forEach(p => {
        const name = (currentLang === 'ta' && p.name_ta) ? p.name_ta : p.name;
        const desc = (currentLang === 'ta' && p.description_ta) ? p.description_ta : p.description;
        const districtName = p.district_name;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        const imgUrl = p.image_url ? p.image_url : 'https://via.placeholder.com/300x200';
        card.innerHTML = `
            <div style="overflow:hidden; border-radius:12px 12px 0 0;">
                <img src="${imgUrl}" alt="${name}" class="card-img" style="transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200';">
            </div>
            <div class="card-body">
                <span class="badge badge-district">${districtName}</span>
                <span class="badge badge-cat">${p.category_name}</span>
                <h3 class="card-title" style="margin-top: 10px;">${name}</h3>
                <p class="card-text">${desc ? desc.substring(0,60) + '...' : ''}</p>
                <div class="price-tag">₹${p.price}</div>
                <div style="font-size: 0.85rem; color: #777; margin-top: 8px;">
                    <strong>Seller:</strong> ${p.business_name || p.seller_name}
                </div>
            </div>
        `;
        card.addEventListener('click', () => openProductModal(p.id));
        grid.appendChild(card);
    });
}

async function openProductModal(id) {
    try {
        const response = await fetch(`${API_BASE}/products/${id}`);
        const p = await response.json();
        
        let modal = document.getElementById('product-modal');
        if(!modal) {
            modal = document.createElement('div');
            modal.id = 'product-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; transform: scale(0.8); opacity: 0; transition: all 0.4s ease;">
                    <span class="close-btn" onclick="closeProductModal()">&times;</span>
                    <div id="product-modal-body"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        const imgUrl = p.image_url ? p.image_url : 'https://via.placeholder.com/300x200';
        const modalName = (currentLang === 'ta' && p.name_ta) ? p.name_ta : p.name;
        const modalDesc = (currentLang === 'ta' && p.description_ta) ? p.description_ta : p.description;
        const sellerLabel = currentLang === 'ta' ? 'விற்பனையாளர் விவரங்கள்' : 'Seller Details';
        const nameLabel = currentLang === 'ta' ? 'பெயர்' : 'Name';
        const bizLabel = currentLang === 'ta' ? 'வியாபாரம்' : 'Business';
        const addrLabel = currentLang === 'ta' ? 'முகவரி' : 'Address';
        const viewLabel = currentLang === 'ta' ? 'முழு பக்கம் காண்க' : 'View Full Page';
        document.getElementById('product-modal-body').innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                <div style="flex: 1; min-width: 300px;">
                    <img src="${imgUrl}" style="width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                </div>
                <div style="flex: 1; min-width: 300px;">
                    <span class="badge badge-district">${p.district_name}</span>
                    <span class="badge badge-cat">${p.category_name}</span>
                    <h2 style="color: var(--primary-color); margin: 10px 0;">${modalName}</h2>
                    <div class="price-tag" style="font-size: 2rem; margin-bottom: 15px;">₹${p.price}</div>
                    <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 20px;">${modalDesc}</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; color: #333;">${sellerLabel}</h4>
                        <p><strong>${nameLabel}:</strong> ${p.seller_name}</p>
                        <p><strong>${bizLabel}:</strong> ${p.business_name || 'N/A'}</p>
                        <p><strong>${addrLabel}:</strong> ${p.seller_address || 'N/A'}, ${p.seller_district}</p>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <a href="product-detail.html?id=${p.id}" class="btn btn-primary" style="flex: 1; text-align: center;">${viewLabel}</a>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        setTimeout(() => {
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
            modal.querySelector('.modal-content').style.opacity = '1';
        }, 10);
        
    } catch (error) {
        console.error("Failed to fetch product details", error);
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if(modal) {
        modal.querySelector('.modal-content').style.transform = 'scale(0.8)';
        modal.querySelector('.modal-content').style.opacity = '0';
        setTimeout(() => {
            modal.classList.remove('active');
        }, 400);
    }
}

function checkAuthState() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');

    if (token && role) {
        if(navLogin) navLogin.style.display = 'none';
        if(navRegister) navRegister.style.display = 'none';
        if(navDashboard) {
            navDashboard.style.display = 'inline-block';
            navDashboard.href = role === 'SELLER' ? 'seller-dashboard.html' : 'buyer-dashboard.html';
        }
        if(navLogout) {
            navLogout.style.display = 'inline-block';
            navLogout.addEventListener('click', () => {
                localStorage.clear();
                window.location.reload();
            });
        }
    }
}

// Call checkAuthState on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();

    const exploreBtn = document.getElementById('explore-btn');
    if(exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            const productsSection = document.getElementById('products-grid');
            if(productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
});

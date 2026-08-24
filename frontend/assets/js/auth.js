const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('devtunnels.ms'))
    ? window.location.origin + '/api'
    : 'https://root-2-reach.onrender.com/api';
let currentLang = localStorage.getItem('lang') || 'en';

const authTranslations = {
    en: {
        home: "Home", login: "Login", register: "Register", email: "Email", password: "Password",
        login_btn: "Login", forgot_password: "Forgot Password?", no_account: "Don't have an account?",
        register_here: "Register Here", buyer: "Buyer", seller: "Seller", name: "Name",
        phone: "Phone", confirm_password: "Confirm Password", business_name: "Business/Shop Name",
        district: "District", address: "Address", register_btn: "Register", already_have_account: "Already have an account? Login"
    },
    ta: {
        home: "முகப்பு", login: "உள்நுழைய", register: "பதிவு செய்க", email: "மின்னஞ்சல்", password: "கடவுச்சொல்",
        login_btn: "உள்நுழைய", forgot_password: "கடவுச்சொல்லை மறந்துவிட்டீர்களா?", no_account: "கணக்கு இல்லையா?",
        register_here: "இங்கே பதிவு செய்க", buyer: "வாங்குபவர்", seller: "விற்பனையாளர்", name: "பெயர்",
        phone: "தொலைபேசி", confirm_password: "கடவுச்சொல்லை உறுதிப்படுத்துக", business_name: "கடை பெயர்",
        district: "மாவட்டம்", address: "முகவரி", register_btn: "பதிவு செய்க", already_have_account: "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைய"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initLangSwitcher();
    updateAuthUI();

    // Setup Role Switcher if on register page
    const btnBuyer = document.getElementById('btn-buyer');
    const btnSeller = document.getElementById('btn-seller');
    const sellerFields = document.getElementById('seller-fields');
    const roleInput = document.getElementById('role');

    if (btnBuyer && btnSeller) {
        btnBuyer.addEventListener('click', () => {
            btnBuyer.classList.add('active');
            btnSeller.classList.remove('active');
            sellerFields.style.display = 'none';
            roleInput.value = 'CUSTOMER';
        });
        btnSeller.addEventListener('click', () => {
            btnSeller.classList.add('active');
            btnBuyer.classList.remove('active');
            sellerFields.style.display = 'block';
            roleInput.value = 'SELLER';
            fetchDistrictsForSelect();
        });
    }

    // Handle Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('name', data.name);
                    window.location.href = data.role === 'SELLER' ? 'seller-dashboard.html' : 'buyer-dashboard.html';
                } else {
                    errorMsg.textContent = data.error;
                }
            } catch (err) {
                errorMsg.textContent = 'Server error. Please try again.';
            }
        });
    }

    // Handle Register
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;
            const errorMsg = document.getElementById('error-msg');

            if (password !== confirm) {
                errorMsg.textContent = "Passwords do not match!";
                return;
            }

            const payload = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                password: password,
                role: document.getElementById('role').value
            };

            if (payload.role === 'SELLER') {
                payload.business_name = document.getElementById('business-name').value;
                payload.district = document.getElementById('district-select').value;
                payload.address = document.getElementById('address').value;
            }

            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (res.ok) {
                    window.location.href = 'login.html';
                } else {
                    errorMsg.textContent = data.error;
                }
            } catch (err) {
                errorMsg.textContent = 'Server error. Please try again.';
            }
        });
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
            updateAuthUI();
        });
    }
}

function updateAuthUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (authTranslations[currentLang][key]) {
            el.textContent = authTranslations[currentLang][key];
        }
    });
}

async function fetchDistrictsForSelect() {
    const select = document.getElementById('district-select');
    if (!select || select.children.length > 0) return;
    try {
        const res = await fetch(`${API_BASE}/districts`);
        const districts = await res.json();
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = currentLang === 'en' ? d.name_en : d.name_ta;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

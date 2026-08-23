const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function createSVG(filename, text, color1, color2) {
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>`;
    
    fs.writeFileSync(path.join(outputDir, filename), svg);
}

// Generate District SVGs
createSVG('kanchi.svg', 'Kanchipuram District', '#D35400', '#E67E22');
createSVG('karur.svg', 'Karur District', '#2980B9', '#3498DB');
createSVG('thanjavur.svg', 'Thanjavur District', '#8E44AD', '#9B59B6');
createSVG('madurai.svg', 'Madurai District', '#27AE60', '#2ECC71');
createSVG('tirunelveli.svg', 'Tirunelveli District', '#C0392B', '#E74C3C');
createSVG('kanyakumari.svg', 'Kanyakumari District', '#16A085', '#1ABC9C');

// Generate Product SVGs
createSVG('saree1.svg', 'Kanchipuram Silk Saree', '#F39C12', '#F1C40F');
createSVG('doll.svg', 'Thanjavur Dancing Doll', '#D35400', '#F39C12');
createSVG('plate.svg', 'Thanjavur Art Plate', '#7F8C8D', '#95A5A6');
createSVG('saree2.svg', 'Madurai Sungudi Saree', '#8E44AD', '#9B59B6');
createSVG('mat.svg', 'Pathamadai Silk Mat', '#27AE60', '#2ECC71');
createSVG('halwa.svg', 'Tirunelveli Halwa', '#C0392B', '#D35400');
createSVG('shell.svg', 'Kanyakumari Shell Craft', '#2980B9', '#3498DB');
createSVG('towel.svg', 'Karur Cotton Towels', '#16A085', '#1ABC9C');
createSVG('painting.svg', 'Thanjavur Painting', '#F39C12', '#F1C40F');
createSVG('basket.svg', 'Palm Leaf Basket', '#D35400', '#E67E22');
createSVG('kottan.svg', 'Chettinad Kottan', '#8E44AD', '#9B59B6');
createSVG('lamp.svg', 'Nachiyar Koil Lamp', '#F39C12', '#D35400');

console.log('SVGs generated successfully in public/images/');

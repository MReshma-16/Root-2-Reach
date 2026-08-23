const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error(err.message); return; }
    console.log('Connected to the SQLite database for seeding.');

    db.serialize(() => {
        // Drop old tables
        db.run(`DROP TABLE IF EXISTS order_items`);
        db.run(`DROP TABLE IF EXISTS orders`);
        db.run(`DROP TABLE IF EXISTS cart`);
        db.run(`DROP TABLE IF EXISTS products`);
        db.run(`DROP TABLE IF EXISTS categories`);
        db.run(`DROP TABLE IF EXISTS districts`);
        db.run(`DROP TABLE IF EXISTS users`);

        // Recreate tables
        db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
            password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('SELLER','CUSTOMER')),
            business_name TEXT, district TEXT, address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name_en TEXT NOT NULL, name_ta TEXT NOT NULL)`);
        db.run(`CREATE TABLE districts (id INTEGER PRIMARY KEY AUTOINCREMENT, name_en TEXT NOT NULL, name_ta TEXT NOT NULL, description_en TEXT, description_ta TEXT, image_url TEXT)`);
        db.run(`CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, name_ta TEXT,
            description TEXT, description_ta TEXT,
            price REAL NOT NULL DEFAULT 0,
            quantity INTEGER NOT NULL DEFAULT 0, image_url TEXT, category_id INTEGER, district_id INTEGER,
            seller_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id), FOREIGN KEY (district_id) REFERENCES districts(id),
            FOREIGN KEY (seller_id) REFERENCES users(id)
        )`);
        db.run(`CREATE TABLE cart (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (customer_id) REFERENCES users(id), FOREIGN KEY (product_id) REFERENCES products(id))`);
        db.run(`CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, total REAL NOT NULL, name TEXT, phone TEXT, address TEXT, district TEXT, pincode TEXT, status TEXT DEFAULT 'PLACED', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES users(id))`);
        db.run(`CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, seller_id INTEGER NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (seller_id) REFERENCES users(id))`);

        // Seed categories
        const cats = [['Handloom','கைத்தறி'],['Handicrafts','கைவினைப்பொருட்கள்'],['Food Products','உணவுப் பொருட்கள்'],['Artwork','கலைப்படைப்பு'],['Textiles','ஜவுளி'],['Jewellery','நகைகள்'],['Pottery','மட்பாண்டம்'],['Eco-friendly','சுற்றுச்சூழல் நட்பு']];
        const stmtC = db.prepare('INSERT INTO categories (name_en, name_ta) VALUES (?, ?)');
        cats.forEach(c => stmtC.run(c));
        stmtC.finalize();

        // Seed districts
        const dists = [
            ['Kanchipuram','காஞ்சிபுரம்', 'City of Thousand Temples and Silk', 'ஆயிரம் கோயில்கள் மற்றும் பட்டு நகரம்', '/public/images/kanchipuram_district.png'],
            ['Karur','கரூர்', 'Hub of Handloom Textile Exports', 'கைத்தறி ஜவுளி ஏற்றுமதியின் மையம்', '/public/images/karur_district.png'],
            ['Thanjavur','தஞ்சாவூர்', 'The Rice Bowl and Cultural Capital', 'நெற்களஞ்சியம் மற்றும் கலாச்சார தலைநகரம்', '/public/images/thanjavur_district.png'],
            ['Madurai','மதுரை', 'The Ancient City of Temples', 'பண்டைய கோயில் நகரம்', '/public/images/madurai_district.png'],
            ['Tirunelveli','திருநெல்வேலி', 'Land of Waterfalls and Halwa', 'அருவிகள் மற்றும் அல்வாக்களின் பூமி', '/public/images/tirunelveli_district.png'],
            ['Kanyakumari','கன்னியாகுமரி', 'Where Three Oceans Meet', 'மூன்று கடல்கள் சங்கமிக்கும் இடம்', '/public/images/kanyakumari_district.png'],
            ['Coimbatore','கோயம்புத்தூர்', 'The Manchester of South India', 'தென்னிந்தியாவின் மான்செஸ்டர்', '/public/images/coimbatore_district.png'],
            ['Salem','சேலம்', 'City of Mountains and Steel', 'மலைகள் மற்றும் எஃகு நகரம்', '/public/images/salem_district.png']
        ];
        const stmtD = db.prepare('INSERT INTO districts (name_en, name_ta, description_en, description_ta, image_url) VALUES (?, ?, ?, ?, ?)');
        dists.forEach(d => stmtD.run(d));
        stmtD.finalize();

        // Seed demo sellers
        const sellerPass = bcrypt.hashSync('seller123', 10);
        db.run(`INSERT INTO users (name, email, phone, password, role, business_name, district, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Tamil Crafts Store', 'seller@root2reach.com', '9876543210', sellerPass, 'SELLER', 'Tamil Crafts Emporium', 'Kanchipuram', '12 Silk Street, Kanchipuram - 631501']);
        db.run(`INSERT INTO users (name, email, phone, password, role, business_name, district, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Madurai Weaves', 'madurai@root2reach.com', '9876543212', sellerPass, 'SELLER', 'Madurai Textile Hub', 'Madurai', '88 Temple Bazaar Road, Madurai - 625001']);
        db.run(`INSERT INTO users (name, email, phone, password, role, business_name, district, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Halwa King', 'halwa@root2reach.com', '9876543213', sellerPass, 'SELLER', 'Traditional Tirunelveli Halwa', 'Tirunelveli', '12 Waterfalls Road, Tirunelveli - 627001']);

        // Seed a demo customer
        const custPass = bcrypt.hashSync('customer123', 10);
        db.run(`INSERT INTO users (name, email, phone, password, role, address) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Priya Kumar', 'customer@root2reach.com', '9876543211', custPass, 'CUSTOMER', '45 Gandhi Road, Chennai']);

        // Seed products with Tamil translations
        // Format: [name, name_ta, description, description_ta, price, qty, image_url, cat_id, dist_id, seller_id]
        const products = [
            // Kanchipuram Silk Sarees - 2 sellers, different images
            ['Kanchipuram Silk Saree', 'காஞ்சிபுரம் பட்டு சேலை',
             'Pure mulberry silk woven with gold and silver zari. A timeless bridal classic with vibrant yellow and purple hues.',
             'தங்க மற்றும் வெள்ளி ஜரி நெய்த தூய்மையான மல்பெரி பட்டு. மஞ்சள் மற்றும் ஊதா நிற மணமகள் பட்டு சேலை.',
             12500, 15, '/public/images/kanchipuram_saree_1.png', 1, 1, 1],

            ['Kanchipuram Silk Saree', 'காஞ்சிபுரம் பட்டு சேலை',
             'Deep purple Kanchipuram silk saree with intricate gold zari border and traditional peacock motifs. Premium bridal wear.',
             'அழகான ஊதா நிற காஞ்சிபுரம் பட்டு சேலை, தங்க ஜரி விளிம்பு மற்றும் மயில் வேலைப்பாடுகளுடன். சிறந்த மணமகள் உடை.',
             13000, 5, '/public/images/kanchipuram_saree_2.jpg', 1, 1, 2],

            ['Thanjavur Dancing Doll', 'தஞ்சாவூர் தாளாட்டும் பொம்மை',
             'Traditional terracotta doll that oscillates gracefully. A symbol of Thanjavur heritage.',
             'பாரம்பரிய மண் பொம்மை இனிமையாக அசைகிறது. தஞ்சாவூர் பாரிபரிய சின்னம்.',
             850, 30, '/public/images/thanjavur_dancing_doll.png', 2, 3, 1],

            ['Thanjavur Art Plate', 'தஞ்சாவூர் கலைத் தட்டு',
             'Intricately engraved metal plate depicting Hindu deities. Royal craft from the Chola period.',
             'இந்து தெய்வங்களை சித்தரிக்கும் அழகாக செதுக்கப்பட்ட உலோக தட்டு. சோழர் காலத்தின் அரச கலை.',
             3200, 10, '/public/images/thanjavur_art_plate.png', 4, 3, 1],

            // Madurai Sungudi Sarees - 2 sellers, different images
            ['Madurai Sungudi Saree', 'மதுரை சுங்குடி சேலை',
             'Traditional Sungudi cotton saree with dark maroon checkered pattern and gold peacock border. Authentic Madurai handloom.',
             'கருமை சிவப்பு சதுர வடிவமும் தங்க மயில் விளிம்பும் கொண்ட பாரம்பரிய சுங்குடி பருத்தி சேலை. நேர்மையான மதுரை கைத்தறி.',
             2500, 20, '/public/images/madurai_sungudi_1.jpg', 5, 4, 1],

            ['Madurai Sungudi Saree', 'மதுரை சுங்குடி சேலை',
             'Olive golden Sungudi saree with bright teal green border and silver zari. Perfect for festivals and ceremonies.',
             'பளிச்சிடும் கறுகறுப்பு பச்சை விளிம்பும் வெள்ளி ஜரியும் கொண்ட ஆலிவ் தங்க சுங்குடி சேலை. விழாக்களுக்கு ஏற்றது.',
             2300, 10, '/public/images/madurai_sungudi_2.png', 5, 4, 2],

            ['Pathamadai Silk Mat', 'பாத்தமடை பட்டு பாய்',
             'Super fine mats woven from korai grass. Often given as a wedding gift.',
             'கோரை புல்லால் நெய்யப்பட்ட மிகவும் நேர்த்தியான பாய். திருமண பரிசாக வழங்கப்படும்.',
             4500, 8, '/public/images/pathamadai_silk_mat.png', 2, 5, 1],

            ['Tirunelveli Halwa', 'திருநெல்வேலி அல்வா',
             'Delicious wheat-based sweet dripping with pure ghee. A cultural culinary icon from Tirunelveli.',
             'தூய்மையான நெய்யில் நனைந்த சுவையான கோதுமை அல்வா. திருநெல்வேலியின் கலாச்சார உணவு சின்னம்.',
             350, 50, '/public/images/tirunelveli_halwa.png', 3, 5, 1],

            ['Tirunelveli Halwa', 'திருநெல்வேலி அல்வா',
             'Irresistibly fresh ghee halwa from the streets of Tirunelveli. Made with traditional recipe.',
             'திருநெல்வேலி தெருக்களில் இருந்து மிகவும் புதிய நெய் அல்வா. பாரம்பரிய முறையில் தயாரிக்கப்பட்டது.',
             320, 100, '/public/images/tirunelveli_halwa.png', 3, 5, 3],

            ['Kanyakumari Shell Craft', 'கன்னியாகுமரி சங்கு கலை',
             'Beautiful decorative items made from sea shells. Represents the coastal heritage of Kanyakumari.',
             'கடல் சங்குகளால் தயாரிக்கப்பட்ட அழகான அலங்கார பொருட்கள். கன்னியாகுமரியின் கடலோர பாரம்பரியத்தை பிரதிநிதித்துவப்படுத்துகிறது.',
             650, 25, '/public/images/kanyakumari_shell_craft.png', 2, 6, 1],

            ['Karur Cotton Towels', 'கரூர் பருத்தி துண்டுகள்',
             'High quality, absorbent handloom towels. Exported globally for their unmatched quality.',
             'உயர் தரமான, உறிஞ்சும் தன்மை கொண்ட கைத்தறி துண்டுகள். அவற்றின் தரத்திற்காக உலகளவில் ஏற்றுமதி செய்யப்படுகின்றன.',
             450, 40, '/public/images/karur_cotton_towels.png', 1, 2, 1],

            ['Thanjavur Painting', 'தஞ்சாவூர் ஓவியம்',
             'Classical South Indian painting with gold foil embellishments. Depicts Hindu gods and goddesses.',
             'தங்க தகட்டு அலங்காரத்துடன் கூடிய செம்மையான தென்னிந்திய ஓவியம். இந்து கடவுளர் மற்றும் தேவிகளை சித்தரிக்கிறது.',
             8500, 5, '/public/images/thanjavur_painting.png', 4, 3, 1],

            ['Palm Leaf Basket', 'பனை ஓலை கூடை',
             'Eco-friendly baskets woven from palm leaves. Used traditionally for carrying offerings to temples.',
             'பனை ஓலைகளால் நெய்யப்பட்ட சுற்றுச்சூழல் நட்பான கூடைகள். கோயில்களில் காணிக்கை செல்ல பாரம்பரியமாக பயன்படுத்தப்படுகின்றன.',
             280, 35, '/public/images/palm_leaf_basket_real.png', 8, 6, 1],

            ['Palm Leaf Basket', 'பனை ஓலை கூடை',
             'Handcrafted organic palm leaf baskets for multipurpose storage. From skilled coastal artisans.',
             'திறமையான கடலோர கைவினைஞர்களிடமிருந்து பன்முக சேமிப்பிற்காக கைவினையில் தயாரிக்கப்பட்ட பனை ஓலை கூடைகள்.',
             260, 50, '/public/images/palm_leaf_basket.png', 8, 6, 3],

            ['Chettinad Kottan', 'செட்டிநாடு கொட்டான்',
             'Colorful palm leaf baskets from Chettinad region. Used in marriages and auspicious rituals.',
             'செட்டிநாடு பகுதியிலிருந்து வண்ணமயமான பனை ஓலை கூடைகள். திருமணங்கள் மற்றும் மங்கல நிகழ்ச்சிகளில் பயன்படுத்தப்படுகின்றன.',
             550, 20, '/public/images/chettinad_kottan.png', 2, 4, 1],

            ['Nachiyar Koil Brass Lamp', 'நாச்சியார் கோவில் பித்தளை விளக்கு',
             'Ornate brass oil lamps made by skilled local artisans. Essential for temple lighting and home puja.',
             'திறமையான உள்ளூர் கைவினைஞர்களால் தயாரிக்கப்பட்ட அலங்கரிக்கப்பட்ட பித்தளை எண்ணெய் விளக்குகள். கோயில் வெளிச்சம் மற்றும் வீட்டு பூஜைக்கு அத்தியாவசியம்.',
             1800, 12, '/public/images/nachiyar_koil_brass_lamp.png', 2, 3, 1]
        ];

        const stmtP = db.prepare('INSERT INTO products (name, name_ta, description, description_ta, price, quantity, image_url, category_id, district_id, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        products.forEach(p => stmtP.run(p));
        stmtP.finalize();

        console.log('Database seeded successfully with Tamil translations!');
        console.log('Demo Seller: seller@root2reach.com / seller123');
        console.log('Demo Customer: customer@root2reach.com / customer123');
    });
});

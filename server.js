const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Dosya tabanlı veritabanı (users.json)
const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, 'users.json');

// users.json yoksa oluştur
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

// Yardımcı fonksiyonlar
function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ========== API ROUTES ==========

// Ana sayfa
app.get('/', (req, res) => {
    res.json({ 
        message: 'PixelPeak API çalışıyor!',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            users: 'GET /api/users'
        }
    });
});

// KAYIT OL (Sign Up)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Email ve şifre kontrolü
        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }
        
        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Geçerli email girin' });
        }
        
        if (password.length < 3) {
            return res.status(400).json({ error: 'Şifre en az 3 karakter' });
        }
        
        const users = readUsers();
        
        // Email daha önce kayıtlı mı?
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
        }
        
        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Yeni kullanıcı oluştur
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name: email.split('@')[0],
            avatar: '👤',
            friends: [],
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        writeUsers(users);
        
        // Token oluştur
        const token = jwt.sign(
            { userId: newUser.id, email },
            'gizli-anahtar-degistir-bunu',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'Kayıt başarılı',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                avatar: newUser.avatar
            }
        });
        
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// GİRİŞ YAP (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }
        
        const users = readUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Email veya şifre hatalı' });
        }
        
        // Şifre kontrolü
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email veya şifre hatalı' });
        }
        
        // Token oluştur
        const token = jwt.sign(
            { userId: user.id, email },
            'gizli-anahtar-degistir-bunu',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar
            }
        });
        
    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// TÜM KULLANICILARI GETİR
app.get('/api/users', (req, res) => {
    const users = readUsers();
    // Şifreleri gösterme
    const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar
    }));
    res.json(safeUsers);
});

// ARKADAŞ EKLE
app.post('/api/add-friend', (req, res) => {
    try {
        const { userId, friendEmail } = req.body;
        
        const users = readUsers();
        const user = users.find(u => u.id === userId);
        const friend = users.find(u => u.email === friendEmail);
        
        if (!user || !friend) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        if (user.id === friend.id) {
            return res.status(400).json({ error: 'Kendini ekleyemezsin' });
        }
        
        if (user.friends.includes(friend.id)) {
            return res.status(400).json({ error: 'Zaten arkadaş' });
        }
        
        // Karşılıklı arkadaş ekle
        user.friends.push(friend.id);
        friend.friends.push(user.id);
        
        writeUsers(users);
        
        res.json({
            message: 'Arkadaş eklendi',
            friend: {
                id: friend.id,
                email: friend.email,
                name: friend.name,
                avatar: friend.avatar
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Sunucuyu başlat
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ PixelPeak API çalışıyor!`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📱 Telefonunun IP'siyle başkaları da bağlanabilir`);
});
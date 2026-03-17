const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

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

// KAYIT OL
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }
        
        const users = readUsers();
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
        }
        
         const hashedPassword = (password, 10);
        
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
        
        const token = jwt.sign(
            { userId: newUser.id, email },
            'gizli-anahtar',
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
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// GİRİŞ YAP
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const users = readUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Email veya şifre hatalı' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email veya şifre hatalı' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email },
            'gizli-anahtar',
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
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// TÜM KULLANICILARI GETİR
app.get('/api/users', (req, res) => {
    const users = readUsers();
    const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar
    }));
    res.json(safeUsers);
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ PixelPeak API çalışıyor!`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📄 Login sayfası: http://localhost:${PORT}/login.html`);
});
// TÜM KULLANICILARI ŞİFRELERİYLE GETİR (SADECE SEN KULLAN!)
app.get('/api/all-users-with-passwords', (req, res) => {
    const users = readUsers();
    res.json(users);  // Şifreler dahil tüm bilgiler
});

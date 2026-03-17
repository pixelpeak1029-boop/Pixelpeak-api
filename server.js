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
app.use(express.static(path.join(__dirname)));

const USERS_FILE = path.join(__dirname, 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Dosyaların varlığını kontrol et ve yoksa oluştur
try {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
        console.log('✅ users.json oluşturuldu');
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
        console.log('✅ messages.json oluşturuldu');
    }
} catch (err) {
    console.error('❌ Dosya oluşturma hatası:', err);
}

// Yardımcı fonksiyonlar
function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readMessages() {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE));
}

function writeMessages(messages) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Ana sayfa
app.get('/', (req, res) => {
    res.json({
        message: 'PixelPeak API çalışıyor!',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            allusers: 'GET /api/all-users',
            send: 'POST /api/messages/send',
            get: 'POST /api/messages/get',
            allmessages: 'GET /api/all-messages'
        }
    });
});

// KAYIT OL
app.post('/api/register', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }
        const users = readUsers();
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
        }
        const newUser = {
            id: Date.now().toString(),
            email,
            password, // düz metin
            name: email.split('@')[0],
            avatar: '👤',
            friends: [],
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeUsers(users);
        const token = jwt.sign({ userId: newUser.id, email }, 'gizli-anahtar', { expiresIn: '7d' });
        res.status(201).json({
            message: 'Kayıt başarılı',
            token,
            user: { id: newUser.id, email: newUser.email, name: newUser.name, avatar: newUser.avatar }
        });
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// GİRİŞ YAP
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Email veya şifre hatalı' });
        }
        const token = jwt.sign({ userId: user.id, email }, 'gizli-anahtar', { expiresIn: '7d' });
        res.json({
            message: 'Giriş başarılı',
            token,
            user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
        });
    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// TÜM KULLANICILAR
app.get('/api/all-users', (req, res) => {
    try {
        const users = readUsers();
        res.json(users);
    } catch (error) {
        console.error('all-users hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// MESAJ GÖNDER
app.post('/api/messages/send', (req, res) => {
    try {
        const { fromEmail, toEmail, text } = req.body;
        if (!fromEmail || !toEmail || !text) {
            return res.status(400).json({ error: 'Eksik bilgi' });
        }
        const messages = readMessages();
        const newMessage = {
            id: Date.now().toString(),
            from: fromEmail,
            to: toEmail,
            text,
            time: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        writeMessages(messages);
        console.log('Mesaj kaydedildi:', newMessage);
        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
});

// MESAJLARI GETİR
app.post('/api/messages/get', (req, res) => {
    try {
        const { userEmail, friendEmail } = req.body;
        if (!userEmail || !friendEmail) {
            return res.status(400).json({ error: 'Eksik bilgi' });
        }
        const messages = readMessages();
        const chatMessages = messages.filter(m =>
            (m.from === userEmail && m.to === friendEmail) ||
            (m.from === friendEmail && m.to === userEmail)
        );
        chatMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
        res.json(chatMessages);
    } catch (error) {
        console.error('Mesaj getirme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
});

// TÜM MESAJLAR (test)
app.get('/api/all-messages', (req, res) => {
    try {
        const messages = readMessages();
        res.json(messages);
    } catch (error) {
        console.error('all-messages hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ PixelPeak API çalışıyor!`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📄 Login: http://localhost:${PORT}/login.html`);
    console.log(`👀 Tüm kullanıcılar: http://localhost:${PORT}/api/all-users`);
    console.log(`💬 Tüm mesajlar: http://localhost:${PORT}/api/all-messages`);
});

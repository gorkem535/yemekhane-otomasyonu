import express from 'express';
import session from 'express-session';

import menuRoutes from './routes/menuRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.disable('x-powered-by');

app.use(express.json());

// Oturum yönetimi
app.use(session({
    name: 'yemekhane.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000
    }
}));

// Kullanıcı giriş ve çıkış
app.use('/api/auth', authRoutes);

// Menü işlemleri
app.use('/api', menuRoutes);

// API sağlık kontrolü
app.get('/api/', (req, res) => {
    res.status(200).json({
        basarili: true,
        mesaj: 'Yemekhane API başarıyla çalışıyor!',
        servis: 'uygulama',
        zaman: new Date().toISOString()
    });
});

// Bulunamayan adresler
app.use((req, res) => {
    res.status(404).json({
        basarili: false,
        mesaj: 'İstenen API adresi bulunamadı.'
    });
});

// Hata yönetimi
app.use((err, req, res, next) => {
    console.error('API hatası:', err);

    res.status(err.statusCode || 500).json({
        basarili: false,
        mesaj: err.statusCode
            ? err.message
            : 'Sunucu hatası oluştu.'
    });
});

export default app;
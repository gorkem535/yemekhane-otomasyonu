import express from 'express';
import menuRoutes from './routes/menuRoutes.js';

const app = express();

// JSON isteklerini okuyabilmek için
app.use(express.json());

// Sunucu bilgisini gizle
app.disable('x-powered-by');

// Menü API adreslerini bağla
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

// Genel hata yönetimi
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
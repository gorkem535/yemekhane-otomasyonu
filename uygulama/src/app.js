import express from 'express';

const app = express();

// JSON isteklerini okuyabilmek için
app.use(express.json());

// Sunucu bilgilerini gizle
app.disable('x-powered-by');

// İlk API adresimiz
app.get('/api/', (req, res) => {
    res.status(200).json({
        basarili: true,
        mesaj: 'Yemekhane API başarıyla çalışıyor!',
        servis: 'uygulama',
        zaman: new Date().toISOString()
    });
});

// Bulunamayan API adresleri
app.use((req, res) => {
    res.status(404).json({
        basarili: false,
        mesaj: 'İstenen API adresi bulunamadı.'
    });
});

// Genel hata yönetimi
app.use((err, req, res, next) => {
    console.error('API hatası:', err);

    res.status(500).json({
        basarili: false,
        mesaj: 'Sunucu hatası oluştu.'
    });
});

export default app;
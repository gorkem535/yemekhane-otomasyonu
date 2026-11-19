import app from './app.js';

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yemekhane API http://localhost:${PORT} adresinde çalışıyor.`);
});

// Container durdurulurken sunucuyu düzgün kapat
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Yemekhane API kapatıldı.');
    });
});
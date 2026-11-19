import app from './app.js';

import {
    veritabaniBaglantilariniTestEt,
    veritabaniBaglantilariniKapat
} from './config/database.js';

const PORT = process.env.PORT || 8000;

let server;

// Önce veritabanlarını test et, sonra API sunucusunu başlat
async function sunucuyuBaslat() {
    try {
        await veritabaniBaglantilariniTestEt();

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(
                `Yemekhane API http://localhost:${PORT} adresinde çalışıyor.`
            );
        });

    } catch (error) {
        console.error('Uygulama başlatılamadı:', error.message);

        await veritabaniBaglantilariniKapat().catch(console.error);

        process.exit(1);
    }
}

// Uygulama kapatılırken bağlantıları düzgün kapat
async function sunucuyuKapat(sinyal) {
    console.log(`${sinyal} sinyali alındı. Sunucu kapatılıyor...`);

    if (server) {
        server.close(async () => {
            await veritabaniBaglantilariniKapat();
            console.log('Veritabanı bağlantıları kapatıldı.');
            process.exit(0);
        });
    } else {
        await veritabaniBaglantilariniKapat();
        process.exit(0);
    }
}

process.once('SIGTERM', () => sunucuyuKapat('SIGTERM'));
process.once('SIGINT', () => sunucuyuKapat('SIGINT'));

sunucuyuBaslat();
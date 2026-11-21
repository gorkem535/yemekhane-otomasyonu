import app from './app.js';

import {
    veritabaniBaglantilariniTestEt,
    veritabaniBaglantilariniKapat
} from './config/database.js';

import {
    redisBaglantisiniTestEt,
    redisBaglantisiniKapat
} from './config/redis.js';

const PORT = process.env.PORT || 8000;

let server;

// Önce Redis ve veritabanı bağlantılarını test et, sonra API'yi başlat.
async function sunucuyuBaslat() {
    try {
        await redisBaglantisiniTestEt();
        await veritabaniBaglantilariniTestEt();

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(
                `Yemekhane API http://localhost:${PORT} adresinde çalışıyor.`
            );
        });

    } catch (error) {
        console.error('Uygulama başlatılamadı:', error.message);

        await veritabaniBaglantilariniKapat().catch(console.error);
        await redisBaglantisiniKapat().catch(console.error);

        process.exit(1);
    }
}

// Uygulama kapanırken bağlantıları düzgün kapat.
async function sunucuyuKapat(sinyal) {
    console.log(`${sinyal} sinyali alındı. Sunucu kapatılıyor...`);

    if (server) {
        server.close(async () => {
            await veritabaniBaglantilariniKapat().catch(console.error);
            await redisBaglantisiniKapat().catch(console.error);

            console.log('Veritabanı ve Redis bağlantıları kapatıldı.');
            process.exit(0);
        });
    } else {
        await veritabaniBaglantilariniKapat().catch(console.error);
        await redisBaglantisiniKapat().catch(console.error);
        process.exit(0);
    }
}

process.once('SIGTERM', () => sunucuyuKapat('SIGTERM'));
process.once('SIGINT', () => sunucuyuKapat('SIGINT'));

sunucuyuBaslat();
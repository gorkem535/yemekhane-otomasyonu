import { createHash } from 'node:crypto';
import { redisClient } from '../config/redis.js';

// Menüye ait Redis anahtarı
function menuCacheAnahtari(yemekhaneId, tarih, ogunId) {
    return `menu:${yemekhaneId}:${tarih}:${ogunId}`;
}

// Sorgu filtrelerinden benzersiz bir önbellek anahtarı üret
function sorguCacheAnahtari(filtreler) {
    const hash = createHash('sha256')
        .update(JSON.stringify(filtreler))
        .digest('hex');

    return `menu:sorgu:${hash}`;
}

// İstanbul saatine göre gün sonuna kalan saniye
function gunSonunaKalanSaniye() {
    const simdi = new Date();
    const gunSonu = new Date(simdi);

    gunSonu.setHours(24, 0, 0, 0);

    return Math.max(
        1,
        Math.ceil((gunSonu.getTime() - simdi.getTime()) / 1000)
    );
}

// Redis önbelleğinden menüleri getir
export async function menuOnbellektenGetir(filtreler) {
    const anahtarlar = [];

    // Üç filtre de verilmişse doğrudan menü anahtarını dene
    if (
        filtreler.yemekhaneId &&
        filtreler.baslangic &&
        filtreler.baslangic === filtreler.bitis &&
        filtreler.ogunId
    ) {
        anahtarlar.push(
            menuCacheAnahtari(
                filtreler.yemekhaneId,
                filtreler.baslangic,
                filtreler.ogunId
            )
        );
    }

    // Sorgunun genel önbellek anahtarı
    anahtarlar.push(sorguCacheAnahtari(filtreler));

    for (const anahtar of anahtarlar) {
        const veri = await redisClient.get(anahtar);

        if (veri !== null) {
            try {
                console.log(`Menü önbelleği HIT (Redis): ${anahtar}`);
                return JSON.parse(veri);
            } catch {
                await redisClient.del(anahtar);
            }
        }
    }

    return null;
}

// Menüleri Redis önbelleğine yaz
export async function menuOnbellegeYaz(filtreler, menuler) {
    const ttl = gunSonunaKalanSaniye();
    const gruplar = new Map();

    // Menüleri yemekhane, tarih ve öğün bazında grupla
    for (const menu of menuler) {
        const anahtar = menuCacheAnahtari(
            menu.yemekhane_id,
            menu.tarih,
            menu.ogun_id
        );

        if (!gruplar.has(anahtar)) {
            gruplar.set(anahtar, []);
        }

        gruplar.get(anahtar).push(menu);
    }

    // Her menüyü kendi Redis anahtarıyla sakla
    const yazmaIslemleri = [];

    for (const [anahtar, grup] of gruplar) {
        yazmaIslemleri.push(
            redisClient.set(anahtar, JSON.stringify(grup), {
                EX: ttl
            })
        );
    }

    // Sorgunun tamamını da sakla
    yazmaIslemleri.push(
        redisClient.set(
            sorguCacheAnahtari(filtreler),
            JSON.stringify(menuler),
            { EX: ttl }
        )
    );

    await Promise.all(yazmaIslemleri);

    console.log(
        `Menü önbelleği Redis'e yazıldı. ${gruplar.size} menü anahtarı oluşturuldu.`
    );
}

// Menü değiştiğinde bütün menü önbelleğini temizle
// Menü değiştiğinde bütün menü önbelleğini temizle
export async function menuOnbellekleriniTemizle() {
    let silinenAnahtarSayisi = 0;
    let silinecekAnahtarlar = [];

    for await (const anahtarSayfasi of redisClient.scanIterator({
        MATCH: 'menu:*',
        COUNT: 100
    })) {

        // SCAN sonucundaki anahtarları tek tek al
        for (const anahtar of anahtarSayfasi) {
            silinecekAnahtarlar.push(anahtar);

            if (silinecekAnahtarlar.length >= 100) {
                silinenAnahtarSayisi += await redisClient.del(
                    silinecekAnahtarlar
                );

                silinecekAnahtarlar = [];
            }
        }
    }

    if (silinecekAnahtarlar.length > 0) {
        silinenAnahtarSayisi += await redisClient.del(
            silinecekAnahtarlar
        );
    }

    console.log(
        `Menü önbelleği temizlendi. Silinen anahtar sayısı: ${silinenAnahtarSayisi}`
    );
}
import {
    yoneticiSecenekleriniGetir,
    yoneticiMenuRaporlariniGetir,
    menuOlustur,
    menuGuncelle
} from '../repositories/adminRepository.js';

// Pozitif tam sayı kontrolü
function pozitifTamSayi(deger, alan) {
    const sayi = Number(deger);

    if (!Number.isSafeInteger(sayi) || sayi <= 0) {
        const hata = new Error(
            `${alan} pozitif bir tam sayı olmalıdır.`
        );
        hata.statusCode = 400;
        throw hata;
    }

    return sayi;
}

// Tarih kontrolü: YYYY-MM-DD
function tarihKontrolEt(deger) {
    if (typeof deger !== 'string') {
        const hata = new Error('Tarih YYYY-MM-DD formatında olmalıdır.');
        hata.statusCode = 400;
        throw hata;
    }

    const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deger);

    if (!eslesme) {
        const hata = new Error('Tarih YYYY-MM-DD formatında olmalıdır.');
        hata.statusCode = 400;
        throw hata;
    }

    const tarih = new Date(`${deger}T00:00:00Z`);

    if (
        Number.isNaN(tarih.getTime()) ||
        tarih.toISOString().slice(0, 10) !== deger
    ) {
        const hata = new Error('Geçerli bir tarih girilmelidir.');
        hata.statusCode = 400;
        throw hata;
    }

    return deger;
}

// Fiyat kontrolü
function fiyatKontrolEt(deger, alan) {
    const metin = String(deger);

    if (!/^\d+(\.\d{1,2})?$/.test(metin)) {
        const hata = new Error(
            `${alan} sıfır veya daha büyük ve en fazla iki ondalık basamaklı olmalıdır.`
        );
        hata.statusCode = 400;
        throw hata;
    }

    const fiyat = Number(metin);

    if (!Number.isFinite(fiyat) || fiyat > 999999.99) {
        const hata = new Error(`${alan} geçerli bir fiyat olmalıdır.`);
        hata.statusCode = 400;
        throw hata;
    }

    return fiyat;
}

// Menü bilgilerini doğrula
function menuBilgileriniKontrolEt(veri) {
    const yemekhaneId = pozitifTamSayi(
        veri.yemekhaneId,
        'Yemekhane ID'
    );

    const ogunId = pozitifTamSayi(
        veri.ogunId,
        'Öğün ID'
    );

    const tarih = tarihKontrolEt(veri.tarih);

    const ogrenciFiyati = fiyatKontrolEt(
        veri.ogrenciFiyati,
        'Öğrenci fiyatı'
    );

    const personelFiyati = fiyatKontrolEt(
        veri.personelFiyati,
        'Personel fiyatı'
    );

    if (!Array.isArray(veri.yemekIds) || veri.yemekIds.length === 0) {
        const hata = new Error('Menüye en az bir yemek eklemelisiniz.');
        hata.statusCode = 400;
        throw hata;
    }

    const yemekIds = veri.yemekIds.map((id) =>
        pozitifTamSayi(id, 'Yemek ID')
    );

    if (new Set(yemekIds).size !== yemekIds.length) {
        const hata = new Error('Aynı yemek menüye birden fazla eklenemez.');
        hata.statusCode = 400;
        throw hata;
    }

    return {
        yemekhaneId,
        ogunId,
        tarih,
        ogrenciFiyati,
        personelFiyati,
        yemekIds
    };
}

// Yönetici seçim listeleri
export async function yoneticiSecenekleriniListele() {
    return await yoneticiSecenekleriniGetir();
}

// Menü doluluk ve puan raporları
export async function yoneticiRaporlariniListele() {
    return await yoneticiMenuRaporlariniGetir();
}

// Yeni menü oluştur
export async function yeniMenuOlustur(veri) {
    const menu = menuBilgileriniKontrolEt(veri);

    try {
        return await menuOlustur(menu);
    } catch (error) {
        if (error.errno === 1062) {
            error.statusCode = 409;
            error.message =
                'Bu yemekhane, tarih ve öğün için zaten bir menü var.';
        } else if (error.errno === 1452) {
            error.statusCode = 400;
            error.message =
                'Seçilen yemekhane, öğün veya yemek bulunamadı.';
        }

        throw error;
    }
}

// Mevcut menüyü güncelle
export async function mevcutMenuyuGuncelle(menuId, veri) {
    const id = pozitifTamSayi(menuId, 'Menü ID');
    const menu = menuBilgileriniKontrolEt(veri);

    try {
        const sonuc = await menuGuncelle(id, menu);

        if (!sonuc) {
            const hata = new Error('Menü bulunamadı.');
            hata.statusCode = 404;
            throw hata;
        }

        return sonuc;
    } catch (error) {
        if (error.errno === 1062) {
            error.statusCode = 409;
            error.message =
                'Bu yemekhane, tarih ve öğün için zaten bir menü var.';
        } else if (error.errno === 1452) {
            error.statusCode = 400;
            error.message =
                'Seçilen yemekhane, öğün veya yemek bulunamadı.';
        }

        throw error;
    }
}
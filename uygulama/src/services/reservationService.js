import {
    rezervasyonOlustur,
    rezervasyonuIptalEt,
    kullanicininRezervasyonlariniGetir
} from '../repositories/reservationRepository.js';

// ID değerinin pozitif tam sayı olup olmadığını kontrol et
function pozitifTamSayiKontrolEt(deger, alan) {
    const sayi = Number(deger);

    if (!Number.isSafeInteger(sayi) || sayi <= 0) {
        const hata = new Error(
            `${alan} geçerli bir pozitif tam sayı olmalıdır.`
        );
        hata.statusCode = 400;
        throw hata;
    }

    return sayi;
}

// Yeni rezervasyon oluştur
export async function rezervasyonYap(kullaniciId, menuId) {
    const kullanici = pozitifTamSayiKontrolEt(
        kullaniciId,
        'Kullanıcı ID'
    );

    const menu = pozitifTamSayiKontrolEt(
        menuId,
        'Menü ID'
    );

    try {
        return await rezervasyonOlustur(kullanici, menu);
    } catch (error) {
        if (error.sqlState === '45000' || error.errno === 1644) {
            error.statusCode = 400;
        }

        throw error;
    }
}

// Rezervasyonu iptal et
export async function rezervasyonIptal(kullaniciId, rezervasyonId) {
    const kullanici = pozitifTamSayiKontrolEt(
        kullaniciId,
        'Kullanıcı ID'
    );

    const rezervasyon = pozitifTamSayiKontrolEt(
        rezervasyonId,
        'Rezervasyon ID'
    );

    try {
        return await rezervasyonuIptalEt(kullanici, rezervasyon);
    } catch (error) {
        if (error.sqlState === '45000' || error.errno === 1644) {
            error.statusCode = 400;
        }

        throw error;
    }
}

// Kullanıcının rezervasyonlarını getir
export async function rezervasyonlariListele(kullaniciId) {
    const kullanici = pozitifTamSayiKontrolEt(
        kullaniciId,
        'Kullanıcı ID'
    );

    return await kullanicininRezervasyonlariniGetir(kullanici);
}
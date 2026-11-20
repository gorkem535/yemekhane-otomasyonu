import {
    bakiyeGetir,
    bakiyeHareketleriniGetir,
    bakiyeYukle
} from '../repositories/balanceRepository.js';

// Kullanıcının bakiye bilgilerini getir
export async function bakiyeBilgileriniGetir(kullaniciId) {
    const id = Number(kullaniciId);

    if (!Number.isSafeInteger(id) || id <= 0) {
        const hata = new Error('Geçersiz kullanıcı ID.');
        hata.statusCode = 400;
        throw hata;
    }

    const [bakiye, hareketler] = await Promise.all([
        bakiyeGetir(id),
        bakiyeHareketleriniGetir(id)
    ]);

    if (!bakiye) {
        const hata = new Error('Kullanıcı bulunamadı.');
        hata.statusCode = 404;
        throw hata;
    }

    return {
        bakiye: bakiye.bakiye,
        hareketler
    };
}

// Kullanıcının bakiyesine para yükle
export async function bakiyeYukleIslemi(kullaniciId, tutar) {
    const id = Number(kullaniciId);
    const miktar = Number(tutar);

    if (!Number.isSafeInteger(id) || id <= 0) {
        const hata = new Error('Geçersiz kullanıcı ID.');
        hata.statusCode = 400;
        throw hata;
    }

    if (
        !Number.isFinite(miktar) ||
        miktar < 10 ||
        miktar > 1000 ||
        Math.abs(miktar * 100 - Math.round(miktar * 100)) > 0.000001
    ) {
        const hata = new Error(
            'Yükleme tutarı 10 ile 1000 TL arasında ve en fazla iki ondalık basamaklı olmalıdır.'
        );
        hata.statusCode = 400;
        throw hata;
    }

    try {
        return await bakiyeYukle(id, miktar);
    } catch (error) {
        if (error.sqlState === '45000' || error.errno === 1644) {
            error.statusCode = 400;
        }

        throw error;
    }
}
import {
    alerjenTercihleriniGetir as tercihleriGetir,
    alerjenTercihleriniKaydet as tercihleriKaydet
} from '../repositories/profileRepository.js';

// Alerjen tercihlerini getir
export async function alerjenTercihleriniListele(kullaniciId) {
    return await tercihleriGetir(kullaniciId);
}

// Alerjen tercihlerini doğrula ve kaydet
export async function alerjenTercihleriniGuncelle(
    kullaniciId,
    alerjenIds
) {
    if (!Array.isArray(alerjenIds)) {
        const hata = new Error('Alerjen listesi bir dizi olmalıdır.');
        hata.statusCode = 400;
        throw hata;
    }

    if (alerjenIds.length > 14) {
        const hata = new Error('En fazla 14 alerjen seçebilirsiniz.');
        hata.statusCode = 400;
        throw hata;
    }

    const ids = alerjenIds.map(id => {
        const sayi = typeof id === 'string' && /^\d+$/.test(id)
            ? Number(id)
            : id;

        if (!Number.isSafeInteger(sayi) || sayi <= 0) {
            const hata = new Error('Geçersiz alerjen ID.');
            hata.statusCode = 400;
            throw hata;
        }

        return sayi;
    });

    if (new Set(ids).size !== ids.length) {
        const hata = new Error('Aynı alerjen birden fazla seçilemez.');
        hata.statusCode = 400;
        throw hata;
    }

    return await tercihleriKaydet(kullaniciId, ids);
}
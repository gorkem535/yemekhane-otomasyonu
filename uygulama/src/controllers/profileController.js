import {
    alerjenTercihleriniListele,
    alerjenTercihleriniGuncelle
} from '../services/profileService.js';

// Profildeki alerjen tercihlerini getir
export async function alerjenTercihleriniGetir(req, res, next) {
    try {
        const sonuc = await alerjenTercihleriniListele(
            req.session.kullanici.id
        );

        return res.status(200).json({
            basarili: true,
            ...sonuc
        });

    } catch (error) {
        next(error);
    }
}

// Profildeki alerjen tercihlerini kaydet
export async function alerjenTercihleriniKaydet(req, res, next) {
    try {
        const seciliAlerjenler = await alerjenTercihleriniGuncelle(
            req.session.kullanici.id,
            req.body?.alerjenIds
        );

        return res.status(200).json({
            basarili: true,
            mesaj: 'Alerjen tercihleriniz kaydedildi.',
            seciliAlerjenler
        });

    } catch (error) {
        next(error);
    }
}
import {
    bakiyeBilgileriniGetir,
    bakiyeYukleIslemi
} from '../services/balanceService.js';

// Bakiye ve hareket geçmişini getir
export async function bakiyeBilgisi(req, res, next) {
    try {
        const bilgiler = await bakiyeBilgileriniGetir(
            req.session.kullanici.id
        );

        return res.status(200).json({
            basarili: true,
            ...bilgiler
        });
    } catch (error) {
        next(error);
    }
}

// Bakiye yükle
export async function bakiyeYukle(req, res, next) {
    try {
        const sonuc = await bakiyeYukleIslemi(
            req.session.kullanici.id,
            req.body.tutar
        );

        return res.status(200).json({
            basarili: true,
            mesaj: 'Bakiye başarıyla yüklendi.',
            sonuc
        });
    } catch (error) {
        next(error);
    }
}
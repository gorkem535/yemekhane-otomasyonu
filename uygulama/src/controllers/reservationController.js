import {
    rezervasyonYap,
    rezervasyonIptal,
    rezervasyonlariListele
} from '../services/reservationService.js';

// Kullanıcının rezervasyonlarını listele
export async function rezervasyonlariGetir(req, res, next) {
    try {
        const rezervasyonlar = await rezervasyonlariListele(
            req.session.kullanici.id
        );

        return res.status(200).json({
            basarili: true,
            toplam: rezervasyonlar.length,
            rezervasyonlar
        });
    } catch (error) {
        next(error);
    }
}

// Yeni rezervasyon oluştur
export async function rezervasyonOlustur(req, res, next) {
    try {
        const sonuc = await rezervasyonYap(
            req.session.kullanici.id,
            req.body.menuId
        );

        return res.status(201).json({
            basarili: true,
            mesaj: 'Rezervasyon başarıyla oluşturuldu.',
            rezervasyon: sonuc
        });
    } catch (error) {
        next(error);
    }
}

// Rezervasyonu iptal et
export async function rezervasyonIptalEt(req, res, next) {
    try {
        const sonuc = await rezervasyonIptal(
            req.session.kullanici.id,
            req.params.id
        );

        return res.status(200).json({
            basarili: true,
            mesaj: 'Rezervasyon başarıyla iptal edildi.',
            sonuc
        });
    } catch (error) {
        next(error);
    }
}
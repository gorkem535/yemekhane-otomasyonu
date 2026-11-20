import {
    degerlendirilebilirMenuleriListele,
    menuDegerlendir
} from '../services/reviewService.js';

// Kullanıcının değerlendirebileceği menüleri getir
export async function degerlendirmeleriGetir(req, res, next) {
    try {
        const menuler = await degerlendirilebilirMenuleriListele(
            req.session.kullanici.id
        );

        return res.status(200).json({
            basarili: true,
            toplam: menuler.length,
            menuler
        });
    } catch (error) {
        next(error);
    }
}

// Menüye değerlendirme yap
export async function degerlendirmeYap(req, res, next) {
    try {
        const sonuc = await menuDegerlendir(
            req.session.kullanici.id,
            req.body.menuId,
            req.body.puan,
            req.body.yorum
        );

        return res.status(201).json({
            basarili: true,
            mesaj: 'Değerlendirmeniz başarıyla kaydedildi.',
            degerlendirme: sonuc
        });
    } catch (error) {
        next(error);
    }
}
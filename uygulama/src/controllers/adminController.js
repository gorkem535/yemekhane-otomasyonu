import {
    yoneticiSecenekleriniListele,
    yoneticiRaporlariniListele,
    yeniMenuOlustur,
    mevcutMenuyuGuncelle
} from '../services/adminService.js';

// Yönetici seçim listeleri
export async function secenekleriGetir(req, res, next) {
    try {
        const secenekler = await yoneticiSecenekleriniListele();

        return res.status(200).json({
            basarili: true,
            secenekler
        });
    } catch (error) {
        next(error);
    }
}

// Menü doluluk ve puan raporları
export async function raporlariGetir(req, res, next) {
    try {
        const raporlar = await yoneticiRaporlariniListele();

        return res.status(200).json({
            basarili: true,
            toplam: raporlar.length,
            raporlar
        });
    } catch (error) {
        next(error);
    }
}

// Yeni menü oluştur
export async function menuEkle(req, res, next) {
    try {
        const sonuc = await yeniMenuOlustur(req.body);

        return res.status(201).json({
            basarili: true,
            mesaj: 'Menü başarıyla oluşturuldu.',
            menu: sonuc
        });
    } catch (error) {
        next(error);
    }
}

// Mevcut menüyü düzenle
export async function menuDuzenle(req, res, next) {
    try {
        const sonuc = await mevcutMenuyuGuncelle(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            basarili: true,
            mesaj: 'Menü başarıyla güncellendi.',
            menu: sonuc
        });
    } catch (error) {
        next(error);
    }
}
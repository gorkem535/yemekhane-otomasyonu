import { Router } from 'express';

import {
    secenekleriGetir,
    raporlariGetir,
    menuEkle,
    menuDuzenle
} from '../controllers/adminController.js';

import {
    oturumGerekli,
    rolGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

// Bu rotaların tamamı yalnızca yöneticiye açıktır.
router.use(oturumGerekli, rolGerekli('yonetici'));

// Menü oluşturma ekranı için seçim listeleri
router.get('/secenekler', secenekleriGetir);

// Menü doluluk ve ortalama puan raporları
router.get('/raporlar', raporlariGetir);

// Yeni menü oluştur
router.post('/menuler', menuEkle);

// Mevcut menüyü güncelle
router.put('/menuler/:id', menuDuzenle);

export default router;
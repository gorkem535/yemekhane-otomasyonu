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

// Seçim listeleri: giriş yapmış bütün kullanıcılar okuyabilir.
router.get('/secenekler', oturumGerekli, secenekleriGetir);

// Bundan sonraki bütün rotalar yalnızca yöneticiye açıktır.
router.use(oturumGerekli, rolGerekli('yonetici'));

// Menü doluluk ve ortalama puan raporları
router.get('/raporlar', raporlariGetir);

// Yeni menü oluştur
router.post('/menuler', menuEkle);

// Mevcut menüyü güncelle
router.put('/menuler/:id', menuDuzenle);

export default router;
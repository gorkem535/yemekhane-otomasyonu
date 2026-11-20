import { Router } from 'express';

import {
    rezervasyonlariGetir,
    rezervasyonOlustur,
    rezervasyonIptalEt
} from '../controllers/reservationController.js';

import {
    oturumGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

// Kullanıcının rezervasyonlarını listele
router.get('/', oturumGerekli, rezervasyonlariGetir);

// Yeni rezervasyon oluştur
router.post('/', oturumGerekli, rezervasyonOlustur);

// Rezervasyonu iptal et
router.delete('/:id', oturumGerekli, rezervasyonIptalEt);

export default router;
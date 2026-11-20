import { Router } from 'express';

import {
    giris,
    cikis,
    oturumBilgisi
} from '../controllers/authController.js';

import {
    oturumGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

// Kullanıcı girişi
router.post('/giris', giris);

// Kullanıcı çıkışı
router.post('/cikis', cikis);

// Aktif oturum bilgisi
router.get('/me', oturumGerekli, oturumBilgisi);

export default router;
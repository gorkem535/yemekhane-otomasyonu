import { Router } from 'express';

import {
    giris,
    cikis
} from '../controllers/authController.js';

const router = Router();

// Kullanıcı girişi
router.post('/giris', giris);

// Kullanıcı çıkışı
router.post('/cikis', cikis);

export default router;
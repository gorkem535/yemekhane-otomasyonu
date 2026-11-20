import { Router } from 'express';

import {
    bakiyeBilgisi,
    bakiyeYukle
} from '../controllers/balanceController.js';

import {
    oturumGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

// Bakiye ve hareket geçmişini getir
router.get('/', oturumGerekli, bakiyeBilgisi);

// Bakiye yükle
router.post('/yukle', oturumGerekli, bakiyeYukle);

export default router;
import { Router } from 'express';

import {
    alerjenTercihleriniGetir,
    alerjenTercihleriniKaydet
} from '../controllers/profileController.js';

import {
    oturumGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

// Alerjen listesini ve kayıtlı tercihleri getir
router.get('/alerjenler', oturumGerekli, alerjenTercihleriniGetir);

// Alerjen tercihlerini güncelle
router.put('/alerjenler', oturumGerekli, alerjenTercihleriniKaydet);

export default router;
import { Router } from 'express';

import {
    degerlendirmeleriGetir,
    degerlendirmeYap
} from '../controllers/reviewController.js';

import {
    oturumGerekli
} from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', oturumGerekli, degerlendirmeleriGetir);
router.post('/', oturumGerekli, degerlendirmeYap);

export default router;
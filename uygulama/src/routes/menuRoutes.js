import { Router } from 'express';
import { menuleriListele } from '../controllers/menuController.js';

const router = Router();

// Menüleri listeleme endpoint'i
router.get('/menuler', menuleriListele);

export default router;
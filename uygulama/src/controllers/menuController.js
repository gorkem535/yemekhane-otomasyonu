import { menuleriGetir } from '../services/menuService.js';

// Menüleri listeleme Controller'ı
export async function menuleriListele(req, res, next) {
    try {
        const menuler = await menuleriGetir(req.query);

        return res.status(200).json({
            basarili: true,
            toplam: menuler.length,
            menuler: menuler
        });

    } catch (error) {
        next(error);
    }
}
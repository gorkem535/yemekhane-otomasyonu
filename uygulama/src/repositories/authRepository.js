import { okumaDb } from '../config/database.js';

// E-posta adresine göre kullanıcı getir
export async function kullaniciyiEpostayaGoreGetir(eposta) {
    const sql = `
        SELECT
            id,
            ad,
            soyad,
            eposta,
            sifre_hash,
            rol,
            bakiye,
            aktif
        FROM kullanicilar
        WHERE eposta = ?
        LIMIT 1
    `;

    const [satirlar] = await okumaDb.execute(sql, [eposta]);

    return satirlar[0] || null;
}
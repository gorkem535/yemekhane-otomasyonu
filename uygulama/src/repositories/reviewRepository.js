import { yazmaDb, okumaDb } from '../config/database.js';

// Kullanıcının değerlendirme yapabileceği menüleri getir (Replica)
export async function degerlendirilebilirMenuleriGetir(kullaniciId) {
    const sql = `
        SELECT
            r.menu_id,
            m.tarih,
            yh.ad AS yemekhane,
            o.ad AS ogun,
            r.kullanma_zamani,
            d.id AS degerlendirme_id,
            d.puan,
            d.yorum,
            (d.id IS NOT NULL) AS degerlendirildi

        FROM rezervasyonlar r

        INNER JOIN menuler m
            ON m.id = r.menu_id

        INNER JOIN yemekhaneler yh
            ON yh.id = m.yemekhane_id

        INNER JOIN ogunler o
            ON o.id = m.ogun_id

        LEFT JOIN degerlendirmeler d
            ON d.menu_id = r.menu_id
            AND d.kullanici_id = r.kullanici_id

        WHERE r.kullanici_id = ?
          AND r.durum = 'kullanildi'

        ORDER BY r.kullanma_zamani DESC
    `;

    const [satirlar] = await okumaDb.execute(sql, [kullaniciId]);

    return satirlar;
}

// Kullanıcının değerlendirmesini kaydet (Primary)
export async function degerlendirmeEkle(
    kullaniciId,
    menuId,
    puan,
    yorum
) {
    const sql = `
        INSERT INTO degerlendirmeler
            (kullanici_id, menu_id, puan, yorum)

        SELECT ?, ?, ?, ?
        FROM rezervasyonlar r

        WHERE r.kullanici_id = ?
          AND r.menu_id = ?
          AND r.durum = 'kullanildi'

        LIMIT 1
    `;

    const [sonuc] = await yazmaDb.execute(sql, [
        kullaniciId,
        menuId,
        puan,
        yorum,
        kullaniciId,
        menuId
    ]);

    if (sonuc.affectedRows === 0) {
        return null;
    }

    return {
        degerlendirme_id: sonuc.insertId
    };
}
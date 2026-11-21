import { yazmaDb, okumaDb } from '../config/database.js';

// Yeni rezervasyon oluştur
export async function rezervasyonOlustur(
    kullaniciId,
    menuId,
    porsiyon
) {
    const [sonuc] = await yazmaDb.query(
        'CALL sp_rezervasyon_yap(?, ?, ?)',
        [kullaniciId, menuId, porsiyon]
    );

    return sonuc[0][0];
}


// Mevcut rezervasyonu iptal et
export async function rezervasyonuIptalEt(kullaniciId, rezervasyonId) {
    const [sonuc] = await yazmaDb.query(
        'CALL sp_rezervasyon_iptal(?, ?)',
        [kullaniciId, rezervasyonId]
    );

    return sonuc[0][0];
}

// Kullanıcının rezervasyonlarını listele
export async function kullanicininRezervasyonlariniGetir(kullaniciId) {
    const sql = `
        SELECT
            r.id AS rezervasyon_id,
            r.menu_id,
            r.durum,
            r.porsiyon,
            r.ucret,
            r.olusturma,
            r.kullanma_zamani,
            r.iptal_zamani,
            m.tarih,
            yh.ad AS yemekhane,
            o.ad AS ogun,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,

            (
                SELECT GROUP_CONCAT(
                    md.yemek
                    ORDER BY md.kategori_sira, md.yemek
                    SEPARATOR ', '
                )
                FROM v_menu_detay md
                WHERE md.menu_id = m.id
            ) AS yemekler

        FROM rezervasyonlar r
        INNER JOIN menuler m
            ON m.id = r.menu_id
        INNER JOIN yemekhaneler yh
            ON yh.id = m.yemekhane_id
        INNER JOIN ogunler o
            ON o.id = m.ogun_id

        WHERE r.kullanici_id = ?

        ORDER BY m.tarih DESC, o.sira ASC
    `;

    const [satirlar] = await okumaDb.execute(sql, [kullaniciId]);

    return satirlar;
}
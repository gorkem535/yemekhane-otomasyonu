import { yazmaDb, okumaDb } from '../config/database.js';

// Kullanıcının güncel bakiyesini getir (Replica)
export async function bakiyeGetir(kullaniciId) {
    const sql = `
        SELECT id, bakiye
        FROM kullanicilar
        WHERE id = ?
        LIMIT 1
    `;

    const [satirlar] = await okumaDb.execute(sql, [kullaniciId]);

    return satirlar[0] || null;
}

// Kullanıcının bakiye hareketlerini listele (Replica)
export async function bakiyeHareketleriniGetir(kullaniciId) {
    const sql = `
        SELECT
            id,
            tur,
            tutar,
            rezervasyon_id,
            aciklama,
            olusturma
        FROM bakiye_hareketleri
        WHERE kullanici_id = ?
        ORDER BY olusturma DESC, id DESC
    `;

    const [satirlar] = await okumaDb.execute(sql, [kullaniciId]);

    return satirlar;
}

// Bakiye yükle (Primary - Stored Procedure)
export async function bakiyeYukle(kullaniciId, tutar) {
    const [sonuc] = await yazmaDb.query(
        'CALL sp_bakiye_yukle(?, ?)',
        [kullaniciId, tutar]
    );

    return sonuc[0][0];
}
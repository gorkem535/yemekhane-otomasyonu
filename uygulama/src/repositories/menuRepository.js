import { okumaDb } from '../config/database.js';

// Menüleri MySQL Replica üzerinden getir
export async function menuleriListele(filtreler = {}) {
    const kosullar = [
        'd.tarih >= COALESCE(?, CURDATE())',
        'd.tarih <= COALESCE(?, DATE_ADD(CURDATE(), INTERVAL 6 DAY))'
    ];

    const parametreler = [
        filtreler.baslangic || null,
        filtreler.bitis || null
    ];

    // Yemekhane filtresi
    if (filtreler.yemekhaneId) {
        kosullar.push('d.yemekhane_id = ?');
        parametreler.push(filtreler.yemekhaneId);
    }

    // Öğün filtresi
    if (filtreler.ogunId) {
        kosullar.push('d.ogun_id = ?');
        parametreler.push(filtreler.ogunId);
    }

    const sql = `
        SELECT
            d.menu_id,
            DATE_FORMAT(d.tarih, '%Y-%m-%d') AS tarih,
            d.yemekhane_id,
            d.yemekhane,
            d.ogun_id,
            d.ogun,
            d.ogun_sira,

            DATE_FORMAT(
                d.rezervasyon_son,
                '%Y-%m-%d %H:%i:%s'
            ) AS rezervasyon_son,

            d.ogrenci_fiyati,
            d.personel_fiyati,

            d.yemek_id,
            d.yemek,
            d.kategori_id,
            d.kategori,
            d.kategori_sira,
            d.kalori,
            d.vejetaryen,
            d.alerjenler,
            d.alerjen_idler,

            dol.kapasite,
            dol.rezerve,
            dol.bos_yer,
            dol.doluluk_yuzde

        FROM v_menu_detay d

        INNER JOIN v_menu_doluluk dol
            ON dol.menu_id = d.menu_id

        WHERE ${kosullar.join(' AND ')}

        ORDER BY
            d.tarih,
            d.ogun_sira,
            d.yemekhane,
            d.kategori_sira,
            d.yemek
    `;

    const [satirlar] = await okumaDb.execute(
        sql,
        parametreler
    );

    return satirlar;
}
import { yazmaDb, okumaDb } from '../config/database.js';

// Yönetici panelindeki seçim listelerini getir (Replica)
export async function yoneticiSecenekleriniGetir() {
    const [yemekhaneler] = await okumaDb.execute(`
        SELECT id, ad, kapasite
        FROM yemekhaneler
        ORDER BY ad
    `);

    const [ogunler] = await okumaDb.execute(`
        SELECT id, ad, sira, son_saat
        FROM ogunler
        ORDER BY sira
    `);

    const [yemekler] = await okumaDb.execute(`
        SELECT
            y.id,
            y.ad,
            y.kalori,
            y.vejetaryen,
            y.kategori_id,
            k.ad AS kategori,
            k.sira AS kategori_sira
        FROM yemekler y
        INNER JOIN yemek_kategorileri k
            ON k.id = y.kategori_id
        ORDER BY k.sira, y.ad
    `);

    return { yemekhaneler, ogunler, yemekler };
}

// Menü doluluk ve puan raporlarını getir (Replica)
export async function yoneticiMenuRaporlariniGetir() {
    const sql = `
        SELECT
            m.id AS menu_id,
            m.tarih,
            m.yemekhane_id,
            yh.ad AS yemekhane,
            m.ogun_id,
            o.ad AS ogun,
            m.ogrenci_fiyati,
            m.personel_fiyati,
            COALESCE(d.kapasite, yh.kapasite) AS kapasite,
            COALESCE(d.rezerve, 0) AS rezerve,
            COALESCE(d.bos_yer, yh.kapasite) AS bos_yer,
            COALESCE(d.doluluk_yuzde, 0) AS doluluk_yuzde,
            COALESCE(p.oy_sayisi, 0) AS oy_sayisi,
            p.ortalama_puan
        FROM menuler m
        INNER JOIN yemekhaneler yh
            ON yh.id = m.yemekhane_id
        INNER JOIN ogunler o
            ON o.id = m.ogun_id
        LEFT JOIN v_menu_doluluk d
            ON d.menu_id = m.id
        LEFT JOIN v_menu_puan p
            ON p.menu_id = m.id
        ORDER BY m.tarih DESC, o.sira, yh.ad
    `;

    const [satirlar] = await okumaDb.execute(sql);

    return satirlar;
}

// Yeni menü oluştur (Primary)
export async function menuOlustur(menu) {
    const baglanti = await yazmaDb.getConnection();

    try {
        await baglanti.beginTransaction();

        const [sonuc] = await baglanti.execute(
            `INSERT INTO menuler
                (yemekhane_id, tarih, ogun_id,
                 ogrenci_fiyati, personel_fiyati)
             VALUES (?, ?, ?, ?, ?)`,
            [
                menu.yemekhaneId,
                menu.tarih,
                menu.ogunId,
                menu.ogrenciFiyati,
                menu.personelFiyati
            ]
        );

        const menuId = sonuc.insertId;

        for (const yemekId of menu.yemekIds) {
            await baglanti.execute(
                `INSERT INTO menu_yemekleri (menu_id, yemek_id)
                 VALUES (?, ?)`,
                [menuId, yemekId]
            );
        }

        await baglanti.commit();

        return { menu_id: menuId };
    } catch (error) {
        try {
            await baglanti.rollback();
        } catch {
            // Rollback hatası asıl hatayı maskelemesin.
        }

        throw error;
    } finally {
        baglanti.release();
    }
}

// Mevcut menüyü güncelle (Primary)
export async function menuGuncelle(menuId, menu) {
    const baglanti = await yazmaDb.getConnection();

    try {
        await baglanti.beginTransaction();

        const [mevcutMenu] = await baglanti.execute(
            'SELECT id FROM menuler WHERE id = ? FOR UPDATE',
            [menuId]
        );

        if (mevcutMenu.length === 0) {
            await baglanti.rollback();
            return null;
        }

        await baglanti.execute(
            `UPDATE menuler
             SET yemekhane_id = ?,
                 tarih = ?,
                 ogun_id = ?,
                 ogrenci_fiyati = ?,
                 personel_fiyati = ?
             WHERE id = ?`,
            [
                menu.yemekhaneId,
                menu.tarih,
                menu.ogunId,
                menu.ogrenciFiyati,
                menu.personelFiyati,
                menuId
            ]
        );

        await baglanti.execute(
            'DELETE FROM menu_yemekleri WHERE menu_id = ?',
            [menuId]
        );

        for (const yemekId of menu.yemekIds) {
            await baglanti.execute(
                `INSERT INTO menu_yemekleri (menu_id, yemek_id)
                 VALUES (?, ?)`,
                [menuId, yemekId]
            );
        }

        await baglanti.commit();

        return { menu_id: menuId };
    } catch (error) {
        try {
            await baglanti.rollback();
        } catch {
            // Rollback hatası asıl hatayı maskelemesin.
        }

        throw error;
    } finally {
        baglanti.release();
    }
}
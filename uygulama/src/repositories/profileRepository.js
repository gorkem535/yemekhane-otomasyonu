import { yazmaDb, okumaDb } from '../config/database.js';

// Alerjen listesini ve kullanıcının tercihlerini getir
export async function alerjenTercihleriniGetir(kullaniciId) {
    const [alerjenler] = await okumaDb.execute(
        'SELECT id, ad FROM alerjenler ORDER BY id'
    );

    const [secimler] = await okumaDb.execute(
        `SELECT alerjen_id
         FROM kullanici_alerjenleri
         WHERE kullanici_id = ?
         ORDER BY alerjen_id`,
        [kullaniciId]
    );

    return {
        alerjenler,
        seciliAlerjenler: secimler.map(
            item => Number(item.alerjen_id)
        )
    };
}

// Kullanıcının alerjen tercihlerini kaydet
export async function alerjenTercihleriniKaydet(kullaniciId, alerjenIds) {
    const baglanti = await yazmaDb.getConnection();

    try {
        await baglanti.beginTransaction();

        // Seçilen alerjenlerin gerçekten mevcut olduğunu doğrula
        if (alerjenIds.length > 0) {
            const placeholders = alerjenIds.map(() => '?').join(',');

            const [mevcutAlerjenler] = await baglanti.execute(
                `SELECT id FROM alerjenler WHERE id IN (${placeholders})`,
                alerjenIds
            );

            if (mevcutAlerjenler.length !== alerjenIds.length) {
                const hata = new Error('Geçersiz alerjen seçimi.');
                hata.statusCode = 400;
                throw hata;
            }
        }

        // Önce eski tercihleri kaldır
        await baglanti.execute(
            'DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?',
            [kullaniciId]
        );

        // Yeni tercihleri kaydet
        if (alerjenIds.length > 0) {
            const values = alerjenIds
                .map(() => '(?, ?)')
                .join(', ');

            const parametreler = alerjenIds.flatMap(
                alerjenId => [kullaniciId, alerjenId]
            );

            await baglanti.execute(
                `INSERT INTO kullanici_alerjenleri
                 (kullanici_id, alerjen_id)
                 VALUES ${values}`,
                parametreler
            );
        }

        await baglanti.commit();

        return alerjenIds;

    } catch (error) {
        await baglanti.rollback();
        throw error;

    } finally {
        baglanti.release();
    }
}
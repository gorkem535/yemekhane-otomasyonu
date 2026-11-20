import {
    degerlendirilebilirMenuleriGetir,
    degerlendirmeEkle
} from '../repositories/reviewRepository.js';

// Sayısal ID kontrolü
function idKontrolEt(deger, alan) {
    const id = Number(deger);

    if (!Number.isSafeInteger(id) || id <= 0) {
        const hata = new Error(`${alan} geçerli bir ID olmalıdır.`);
        hata.statusCode = 400;
        throw hata;
    }

    return id;
}

// Kullanıcının değerlendirebileceği menüleri listele
export async function degerlendirilebilirMenuleriListele(kullaniciId) {
    const id = idKontrolEt(kullaniciId, 'Kullanıcı');

    return await degerlendirilebilirMenuleriGetir(id);
}

// Menüye değerlendirme ekle
export async function menuDegerlendir(
    kullaniciId,
    menuId,
    puan,
    yorum
) {
    const kullanici = idKontrolEt(kullaniciId, 'Kullanıcı');
    const menu = idKontrolEt(menuId, 'Menü');
    const oy = Number(puan);

    if (!Number.isInteger(oy) || oy < 1 || oy > 5) {
        const hata = new Error('Puan 1 ile 5 arasında tam sayı olmalıdır.');
        hata.statusCode = 400;
        throw hata;
    }

    let temizYorum = null;

    if (yorum !== undefined && yorum !== null) {
        if (typeof yorum !== 'string') {
            const hata = new Error('Yorum metin olmalıdır.');
            hata.statusCode = 400;
            throw hata;
        }

        temizYorum = yorum.trim();

        if (temizYorum.length > 500) {
            const hata = new Error('Yorum en fazla 500 karakter olabilir.');
            hata.statusCode = 400;
            throw hata;
        }

        if (temizYorum === '') {
            temizYorum = null;
        }
    }

    try {
        const sonuc = await degerlendirmeEkle(
            kullanici,
            menu,
            oy,
            temizYorum
        );

        if (!sonuc) {
            const hata = new Error(
                'Yalnızca kullanılmış bir menüyü değerlendirebilirsiniz.'
            );
            hata.statusCode = 400;
            throw hata;
        }

        return sonuc;
    } catch (error) {
        if (error.errno === 1062) {
            error.statusCode = 409;
            error.message = 'Bu menüyü zaten değerlendirdiniz.';
        }

        throw error;
    }
}
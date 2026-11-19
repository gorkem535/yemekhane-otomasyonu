import bcrypt from 'bcrypt';
import { kullaniciyiEpostayaGoreGetir } from '../repositories/authRepository.js';

// Kullanıcı giriş işlemi
export async function girisYap(eposta, sifre) {

    // E-posta ve şifre kontrolü
    if (
        typeof eposta !== 'string' ||
        typeof sifre !== 'string' ||
        !eposta.trim() ||
        !sifre
    ) {
        const hata = new Error('E-posta ve şifre zorunludur.');
        hata.statusCode = 400;
        throw hata;
    }

    const duzenliEposta = eposta.trim().toLowerCase();

    // Kullanıcıyı veritabanında ara
    const kullanici = await kullaniciyiEpostayaGoreGetir(duzenliEposta);

    // Kullanıcı bulunamadıysa veya hesap pasifse
    if (!kullanici || !kullanici.aktif) {
        const hata = new Error('E-posta veya şifre hatalı.');
        hata.statusCode = 401;
        throw hata;
    }

    // Girilen şifreyi bcrypt hash ile karşılaştır
    const sifreDogru = await bcrypt.compare(
        sifre,
        kullanici.sifre_hash
    );

    if (!sifreDogru) {
        const hata = new Error('E-posta veya şifre hatalı.');
        hata.statusCode = 401;
        throw hata;
    }

    // Şifre hash bilgisini kullanıcıya döndürme
    return {
        id: kullanici.id,
        ad: kullanici.ad,
        soyad: kullanici.soyad,
        eposta: kullanici.eposta,
        rol: kullanici.rol,
        bakiye: kullanici.bakiye
    };
}
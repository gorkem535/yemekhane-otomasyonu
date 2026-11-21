import { menuleriListele } from '../repositories/menuRepository.js';
import {
    menuOnbellektenGetir,
    menuOnbellegeYaz
} from './menuCacheService.js';

// Pozitif tam sayı kontrolü
function pozitifTamSayiKontrol(deger, alanAdi) {
    if (deger === undefined || deger === '') {
        return undefined;
    }

    const sayi = Number(deger);

    if (!Number.isSafeInteger(sayi) || sayi <= 0) {
        const hata = new Error(`${alanAdi} pozitif bir tam sayı olmalıdır.`);
        hata.statusCode = 400;
        throw hata;
    }

    return sayi;
}

// Tarih formatı kontrolü
function tarihKontrol(tarih, alanAdi) {
    if (tarih === undefined || tarih === '') {
        return undefined;
    }

    const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);

    if (!eslesme) {
        const hata = new Error(`${alanAdi} YYYY-AA-GG formatında olmalıdır.`);
        hata.statusCode = 400;
        throw hata;
    }

    const yil = Number(eslesme[1]);
    const ay = Number(eslesme[2]);
    const gun = Number(eslesme[3]);

    const kontrol = new Date(Date.UTC(yil, ay - 1, gun));

    if (
        kontrol.getUTCFullYear() !== yil ||
        kontrol.getUTCMonth() !== ay - 1 ||
        kontrol.getUTCDate() !== gun
    ) {
        const hata = new Error(`${alanAdi} geçerli bir tarih olmalıdır.`);
        hata.statusCode = 400;
        throw hata;
    }

    return tarih;
}

// Menü listeleme işlemi
export async function menuleriGetir(sorgu) {
    const filtreler = {
        baslangic: tarihKontrol(sorgu.baslangic, 'Başlangıç tarihi'),
        bitis: tarihKontrol(sorgu.bitis, 'Bitiş tarihi'),
        yemekhaneId: pozitifTamSayiKontrol(
            sorgu.yemekhaneId,
            'Yemekhane ID'
        ),
        ogunId: pozitifTamSayiKontrol(
            sorgu.ogunId,
            'Öğün ID'
        )
    };

    if (
        filtreler.baslangic &&
        filtreler.bitis &&
        filtreler.baslangic > filtreler.bitis
    ) {
        const hata = new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
        hata.statusCode = 400;
        throw hata;
    }

// Önce Redis önbelleğini kontrol et
let onbellek = null;

try {
    onbellek = await menuOnbellektenGetir(filtreler);
} catch (error) {
    console.error('Redis önbelleği okunamadı:', error.message);
}

// Önbellekte veri varsa doğrudan döndür
if (onbellek !== null) {
    return onbellek;
}

// Önbellekte veri yoksa MySQL Replica üzerinden getir
console.log('Menü önbelleği MISS (MySQL Replica).');

const menuler = await menuleriListele(filtreler);

// Gelen verileri Redis'e kaydet
try {
    await menuOnbellegeYaz(filtreler, menuler);
} catch (error) {
    console.error('Redis önbelleğine yazılamadı:', error.message);
}

return menuler;
}
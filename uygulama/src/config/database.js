import mysql from 'mysql2/promise';

// MySQL Primary: yazma islemleri
export const yazmaDb = mysql.createPool({
    host: process.env.DB_YAZMA_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_KULLANICI,
    password: process.env.DB_SIFRE,
    database: process.env.DB_ADI,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// MySQL Replica: okuma islemleri
export const okumaDb = mysql.createPool({
    host: process.env.DB_OKUMA_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_KULLANICI,
    password: process.env.DB_SIFRE,
    database: process.env.DB_ADI,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Her iki veritabani baglantisini test et
export async function veritabaniBaglantilariniTestEt() {
    const yazma = await yazmaDb.getConnection();

    try {
        await yazma.query('SELECT 1');
        console.log('MySQL Primary baglantisi basarili.');
    } finally {
        yazma.release();
    }

    const okuma = await okumaDb.getConnection();

    try {
        await okuma.query('SELECT 1');
        console.log('MySQL Replica baglantisi basarili.');
    } finally {
        okuma.release();
    }
}

// Uygulama kapanirken baglantilari kapat
export async function veritabaniBaglantilariniKapat() {
    await Promise.all([
        yazmaDb.end(),
        okumaDb.end()
    ]);
}
import { createClient } from 'redis';

export const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT || 6379)
    }
});

// Redis bağlantı hatalarını takip et
redisClient.on('error', (error) => {
    console.error('Redis bağlantı hatası:', error.message);
});

// Redis bağlantısını aç ve test et
export async function redisBaglantisiniTestEt() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    await redisClient.ping();

    console.log('Redis bağlantısı başarılı.');
}

// Uygulama kapanırken Redis bağlantısını kapat
export async function redisBaglantisiniKapat() {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
}
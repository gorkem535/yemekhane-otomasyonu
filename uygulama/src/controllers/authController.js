import { girisYap } from '../services/authService.js';

// Kullanıcı girişi
export async function giris(req, res, next) {
    try {
        const { eposta, sifre } = req.body || {};

        const kullanici = await girisYap(eposta, sifre);

        // Yeni oturum oluştur
        req.session.regenerate((error) => {
            if (error) {
                return next(error);
            }

            req.session.kullanici = kullanici;

            req.session.save((error) => {
                if (error) {
                    return next(error);
                }

                return res.status(200).json({
                    basarili: true,
                    mesaj: 'Giriş başarılı.',
                    kullanici
                });
            });
        });

    } catch (error) {
        next(error);
    }
}

// Kullanıcı çıkışı
export function cikis(req, res, next) {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie('yemekhane.sid', {
            path: '/'
        });

        return res.status(200).json({
            basarili: true,
            mesaj: 'Çıkış başarılı.'
        });
    });
}
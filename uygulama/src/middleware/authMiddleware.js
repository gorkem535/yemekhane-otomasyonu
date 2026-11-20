// Kullanıcının giriş yapıp yapmadığını kontrol et
export function oturumGerekli(req, res, next) {
    if (!req.session || !req.session.kullanici) {
        return res.status(401).json({
            basarili: false,
            mesaj: 'Bu işlem için giriş yapmalısınız.'
        });
    }

    next();
}

// Kullanıcının rolünü kontrol et
export function rolGerekli(...roller) {
    return (req, res, next) => {
        if (!req.session || !req.session.kullanici) {
            return res.status(401).json({
                basarili: false,
                mesaj: 'Önce giriş yapmalısınız.'
            });
        }

        if (!roller.includes(req.session.kullanici.rol)) {
            return res.status(403).json({
                basarili: false,
                mesaj: 'Bu işlem için yetkiniz bulunmuyor.'
            });
        }

        next();
    };
}
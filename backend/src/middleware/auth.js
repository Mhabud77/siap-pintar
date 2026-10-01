const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// ============================================
// MIDDLEWARE: AUTENTIKASI (Cek Token)
// ============================================
const auth = (req, res, next) => {
    try {
        let token = req.headers.authorization?.split(' ')[1];
        
        // Fallback: baca dari query string
        if (!token && req.query.token) {
            token = req.query.token;
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak. Token tidak ditemukan.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau sudah kadaluarsa.'
        });
    }
};

// ============================================
// MIDDLEWARE: OTORISASI (Cek Role)
// ============================================
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Anda belum login.'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke resource ini.'
            });
        }
        next();
    };
};

// ============================================
// MIDDLEWARE: HANYA WALI KELAS
// ============================================
const isWaliKelas = async (req, res, next) => {
    try {
        // Cek apakah user adalah wali kelas
        const [kelas] = await db.query(
            'SELECT id FROM kelas WHERE wali_kelas_id = ?',
            [req.user.id]
        );

        if (kelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Hanya wali kelas yang dapat mengakses resource ini'
            });
        }

        // Simpan kelasId di request untuk dipakai controller
        req.kelasId = kelas[0].id;
        next();
    } catch (error) {
        console.error('isWaliKelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

// ============================================
// EXPORT SEMUA MIDDLEWARE
// ============================================
module.exports = { auth, authorize, isWaliKelas };
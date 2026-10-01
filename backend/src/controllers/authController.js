// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// Login
// ============================================
exports.login = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validasi input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password harus diisi'
            });
        }

        // Cari user
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const user = users[0];

        // Cek password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        // ============================================
        // CEK ROLE (kalau user pilih role di dropdown)
        // ============================================
        if (role) {
            if (role === 'wali_kelas') {
                // Cek apakah user benar-benar wali kelas
                const [kelas] = await db.query(
                    'SELECT id FROM kelas WHERE wali_kelas_id = ?',
                    [user.id]
                );

                if (user.role !== 'guru' || kelas.length === 0) {
                    return res.status(401).json({
                        success: false,
                        message: 'Anda bukan wali kelas. Silakan pilih jenis user yang sesuai.'
                    });
                }
            } else if (role === 'guru') {
                // Guru mapel / wali kelas boleh login sebagai "guru"
                if (user.role !== 'guru' && user.role !== 'guru_bk') {
                    return res.status(401).json({
                        success: false,
                        message: 'Anda bukan Guru. Silakan pilih jenis user yang sesuai.'
                    });
                }
            } else {
                // Role biasa (admin, kepsek, murid, orangtua, guru_bk)
                if (user.role !== role) {
                    return res.status(401).json({
                        success: false,
                        message: `Anda bukan ${getLabelRole(role)}. Silakan pilih jenis user yang sesuai.`
                    });
                }
            }
        }

        // ============================================
        // GENERATE TOKEN
        // ============================================
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                nama_lengkap: user.nama_lengkap
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Response
        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    nama_lengkap: user.nama_lengkap,
                    email: user.email,
                    foto_profil: user.foto_profil
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// HELPER: Label Role
// ============================================
function getLabelRole(role) {
    const labels = {
        admin: 'Admin',
        kepsek: 'Kepala Sekolah',
        guru: 'Guru',
        guru_bk: 'Guru BK',
        murid: 'Murid',
        orangtua: 'Orang Tua'
    };
    return labels[role] || role;
}

// Helper: Label role
function getLabelRole(role) {
    const labels = {
        admin: 'Admin',
        kepsek: 'Kepala Sekolah',
        guru: 'Guru',
        murid: 'Murid',
        orangtua: 'Orang Tua'
    };
    return labels[role] || role;
}

// Register (khusus admin)
exports.register = async (req, res) => {
    try {
        const { username, password, role, nama_lengkap, email, no_telepon } = req.body;

        // Validasi
        if (!username || !password || !role || !nama_lengkap) {
            return res.status(400).json({
                success: false,
                message: 'Semua field harus diisi'
            });
        }

        // Cek username sudah ada
        const [existing] = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (username, password, role, nama_lengkap, email, no_telepon) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, role, nama_lengkap, email, no_telepon]
        );

        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Get profile
exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, role, nama_lengkap, email, no_telepon, foto_profil FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
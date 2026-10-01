const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ============================================
// GET SEMUA USER
// ============================================
exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, jenis_guru } = req.query;

        let query = `
            SELECT 
                id, username, nip, role, jenis_guru, 
                nama_lengkap, email, no_telepon, foto_profil, 
                created_at, updated_at
            FROM users
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        if (jenis_guru) {
            query += ' AND jenis_guru = ?';
            params.push(jenis_guru);
        }

        if (search) {
            query += ' AND (nama_lengkap LIKE ? OR username LIKE ? OR nip LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY role, nama_lengkap';

        const [users] = await db.query(query, params);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET USER BY ID
// ============================================
exports.getUserById = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, username, nip, role, jenis_guru, nama_lengkap, 
                    email, no_telepon, foto_profil, created_at 
             FROM users WHERE id = ?`,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// CREATE USER
// ============================================
exports.createUser = async (req, res) => {
    try {
        const { username, nip, password, role, jenis_guru, nama_lengkap, email, no_telepon } = req.body;

        if (!username || !password || !role || !nama_lengkap) {
            return res.status(400).json({
                success: false,
                message: 'Username, password, role, dan nama lengkap harus diisi'
            });
        }

        // Cek username
        const [existingUser] = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }

        // Cek NIP
        if (nip && nip.trim() !== '') {
            const [existingNip] = await db.query(
                'SELECT id FROM users WHERE nip = ?',
                [nip.trim()]
            );
            if (existingNip.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NIP sudah digunakan user lain'
                });
            }
        }

        const hash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (username, nip, password, role, jenis_guru, nama_lengkap, email, no_telepon) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                nip && nip.trim() !== '' ? nip.trim() : null,
                hash,
                role,
                jenis_guru || null,
                nama_lengkap,
                email || null,
                no_telepon || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPDATE USER
// ============================================
exports.updateUser = async (req, res) => {
    try {
        const { username, nip, password, role, jenis_guru, nama_lengkap, email, no_telepon } = req.body;
        const { id } = req.params;

        if (!username || !role || !nama_lengkap) {
            return res.status(400).json({
                success: false,
                message: 'Username, role, dan nama lengkap harus diisi'
            });
        }

        // Cek username duplikat
        const [existingUser] = await db.query(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, id]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan user lain'
            });
        }

        // Cek NIP duplikat
        if (nip && nip.trim() !== '') {
            const [existingNip] = await db.query(
                'SELECT id FROM users WHERE nip = ? AND id != ?',
                [nip.trim(), id]
            );
            if (existingNip.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NIP sudah digunakan user lain'
                });
            }
        }

        const nipFinal = nip && nip.trim() !== '' ? nip.trim() : null;

        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE users 
                 SET username=?, nip=?, password=?, role=?, jenis_guru=?, 
                     nama_lengkap=?, email=?, no_telepon=? 
                 WHERE id=?`,
                [username, nipFinal, hash, role, jenis_guru || null, 
                 nama_lengkap, email || null, no_telepon || null, id]
            );
        } else {
            await db.query(
                `UPDATE users 
                 SET username=?, nip=?, role=?, jenis_guru=?, 
                     nama_lengkap=?, email=?, no_telepon=? 
                 WHERE id=?`,
                [username, nipFinal, role, jenis_guru || null, 
                 nama_lengkap, email || null, no_telepon || null, id]
            );
        }

        res.json({ success: true, message: 'User berhasil diupdate' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// DELETE USER
// ============================================
exports.deleteUser = async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// RESET PASSWORD USER (ADMIN)
// ============================================
exports.resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_baru } = req.body;

        // Validasi
        if (!password_baru || password_baru.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 6 karakter'
            });
        }

        // Cek user ada
        const [users] = await db.query(
            'SELECT id, username, nama_lengkap, role FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const user = users[0];

        // Hash password baru
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password_baru, 10);

        // Update password + timestamp
        await db.query(`
            UPDATE users 
            SET password = ?, password_changed_at = NOW()
            WHERE id = ?
        `, [hash, id]);

        res.json({
            success: true,
            message: `Password ${user.nama_lengkap} berhasil direset`,
            data: {
                id: user.id,
                username: user.username,
                nama_lengkap: user.nama_lengkap,
                password_baru: password_baru  // ← dikirim balik ke admin untuk info
            }
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET RIWAYAT PERUBAHAN PASSWORD
// ============================================
exports.getPasswordHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await db.query(`
            SELECT 
                id, username, nama_lengkap, role,
                created_at,
                password_changed_at,
                CASE 
                    WHEN password_changed_at IS NULL THEN 'Belum pernah ganti'
                    WHEN password_changed_at = created_at THEN 'Belum pernah ganti sejak daftar'
                    ELSE 'Sudah pernah ganti'
                END AS status_password
            FROM users
            WHERE id = ?
        `, [id]);

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
        console.error('Get password history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
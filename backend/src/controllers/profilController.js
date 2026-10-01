const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function hapusFotoLama(fotoPath) {
    if (!fotoPath) return;
    try {
        const fullPath = path.join(__dirname, '../../', fotoPath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (err) {
        console.error('Error hapus foto:', err.message);
    }
}

// ============================================
// GET PROFIL
// ============================================
exports.getProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query(`
            SELECT id, username, nip, role, jenis_guru, nama_lengkap, 
                   email, no_telepon, foto_profil, created_at
            FROM users WHERE id = ?
        `, [userId]);

        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

        let dataTambahan = {};

        if (users[0].role === 'murid') {
            const [murid] = await db.query(`
                SELECT m.nis, m.jenis_kelamin, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
                       k.nama_kelas, k.tingkat
                FROM murid m JOIN kelas k ON m.kelas_id = k.id
                WHERE m.user_id = ?
            `, [userId]);
            if (murid.length > 0) dataTambahan = { murid: murid[0] };
        }

        if (users[0].role === 'guru' || users[0].role === 'guru_bk') {
            const [kelas] = await db.query('SELECT k.id, k.nama_kelas, k.tingkat FROM kelas k WHERE k.wali_kelas_id = ?', [userId]);
            if (kelas.length > 0) dataTambahan = { is_wali_kelas: true, kelas_diampu: kelas[0] };
        }

        res.json({ success: true, data: { ...users[0], ...dataTambahan } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPDATE PROFIL
// ============================================
exports.updateProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nama_lengkap, nip, email, no_telepon, jenis_kelamin } = req.body;

        if (!nama_lengkap) return res.status(400).json({ success: false, message: 'Nama lengkap harus diisi' });

        // Validasi NIP
        let nipFinal = null;
        if (nip && nip.trim() !== '') {
            nipFinal = nip.trim();
            if (!/^\d{8,30}$/.test(nipFinal)) {
                return res.status(400).json({ success: false, message: 'Format NIP tidak valid (angka 8-30 digit)' });
            }
            const [existingNip] = await db.query('SELECT id, nama_lengkap FROM users WHERE nip = ? AND id != ?', [nipFinal, userId]);
            if (existingNip.length > 0) {
                return res.status(400).json({ success: false, message: `NIP sudah digunakan oleh ${existingNip[0].nama_lengkap}` });
            }
        }

        // Update user
        await db.query(`
            UPDATE users SET nama_lengkap = ?, nip = ?, email = ?, no_telepon = ? WHERE id = ?
        `, [nama_lengkap, nipFinal, email || null, no_telepon || null, userId]);

        // Update jenis_kelamin kalau user murid
        const [userRole] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
        if (userRole[0].role === 'murid' && jenis_kelamin) {
            if (['L', 'P'].includes(jenis_kelamin)) {
                await db.query('UPDATE murid SET jenis_kelamin = ? WHERE user_id = ?', [jenis_kelamin, userId]);
            }
        }

        const [users] = await db.query(`
            SELECT id, username, nip, role, jenis_guru, nama_lengkap, 
                   email, no_telepon, foto_profil
            FROM users WHERE id = ?
        `, [userId]);

        res.json({ success: true, message: 'Profil berhasil diupdate', data: users[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPLOAD FOTO
// ============================================
exports.uploadFotoProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ success: false, message: 'File foto harus diupload' });

        const [users] = await db.query('SELECT foto_profil FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

        hapusFotoLama(users[0].foto_profil);
        const fotoPath = `/uploads/foto-profil/${req.file.filename}`;
        await db.query('UPDATE users SET foto_profil = ? WHERE id = ?', [fotoPath, userId]);

        res.json({ success: true, message: 'Foto profil berhasil diupload', data: { foto_profil: fotoPath } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// HAPUS FOTO
// ============================================
exports.hapusFotoProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query('SELECT foto_profil FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        hapusFotoLama(users[0].foto_profil);
        await db.query('UPDATE users SET foto_profil = NULL WHERE id = ?', [userId]);
        res.json({ success: true, message: 'Foto profil berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GANTI PASSWORD
// ============================================
exports.gantiPassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password_lama, password_baru } = req.body;
        if (!password_lama || !password_baru) return res.status(400).json({ success: false, message: 'Password lama dan baru harus diisi' });
        if (password_baru.length < 6) return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });

        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

        const isPasswordValid = await bcrypt.compare(password_lama, users[0].password);
        if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Password lama salah' });

        const hash = await bcrypt.hash(password_baru, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);

        res.json({ success: true, message: 'Password berhasil diganti' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
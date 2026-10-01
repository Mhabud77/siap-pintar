const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// ============================================
// HELPER
// ============================================
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
// DATA GURU
// ============================================
exports.getAllGuru = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                u.id, u.username, u.nip, u.role, u.jenis_guru,
                u.nama_lengkap, u.email, u.no_telepon, u.foto_profil, u.created_at,
                (SELECT COUNT(*) FROM kelas k WHERE k.wali_kelas_id = u.id) AS jumlah_kelas_diampu,
                (SELECT k.nama_kelas FROM kelas k WHERE k.wali_kelas_id = u.id LIMIT 1) AS wali_kelas_dari
            FROM users u
            WHERE u.role IN ('guru', 'guru_bk')
        `;
        const params = [];
        if (search) {
            query += ' AND (u.nama_lengkap LIKE ? OR u.username LIKE ? OR u.nip LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY u.nama_lengkap';
        const [guru] = await db.query(query, params);
        res.json({ success: true, data: guru });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createGuru = async (req, res) => {
    try {
        const { username, nip, password, nama_lengkap, email, no_telepon, jenis_guru, role } = req.body;
        if (!username || !password || !nama_lengkap) {
            return res.status(400).json({ success: false, message: 'Username, password, dan nama lengkap harus diisi' });
        }
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });

        if (nip && nip.trim() !== '') {
            const [existingNip] = await db.query('SELECT id FROM users WHERE nip = ?', [nip.trim()]);
            if (existingNip.length > 0) return res.status(400).json({ success: false, message: 'NIP sudah digunakan' });
        }

        const hash = await bcrypt.hash(password, 10);
        const fotoPath = req.file ? `/uploads/foto-profil/${req.file.filename}` : null;
        const finalRole = role || (jenis_guru === 'bk' ? 'guru_bk' : 'guru');

        const [result] = await db.query(`
            INSERT INTO users (username, nip, password, role, jenis_guru, nama_lengkap, email, no_telepon, foto_profil)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, nip && nip.trim() !== '' ? nip.trim() : null, hash, finalRole, jenis_guru || null, nama_lengkap, email || null, no_telepon || null, fotoPath]);

        res.status(201).json({ success: true, message: 'Guru berhasil ditambahkan', data: { id: result.insertId, foto_profil: fotoPath } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateGuru = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, nip, password, nama_lengkap, email, no_telepon, jenis_guru, role } = req.body;

        const [existing] = await db.query("SELECT id, foto_profil FROM users WHERE id = ? AND role IN ('guru', 'guru_bk')", [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

        if (username) {
            const [dup] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
            if (dup.length > 0) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
        }

        if (nip && nip.trim() !== '') {
            const [dup] = await db.query('SELECT id FROM users WHERE nip = ? AND id != ?', [nip.trim(), id]);
            if (dup.length > 0) return res.status(400).json({ success: false, message: 'NIP sudah digunakan' });
        }

        let fotoPath = existing[0].foto_profil;
        if (req.file) {
            hapusFotoLama(existing[0].foto_profil);
            fotoPath = `/uploads/foto-profil/${req.file.filename}`;
        }

        const nipFinal = nip && nip.trim() !== '' ? nip.trim() : null;
        const finalRole = role || (jenis_guru === 'bk' ? 'guru_bk' : 'guru');

        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            await db.query(`
                UPDATE users SET username=?, nip=?, password=?, role=?, jenis_guru=?, 
                    nama_lengkap=?, email=?, no_telepon=?, foto_profil=? WHERE id=?
            `, [username, nipFinal, hash, finalRole, jenis_guru || null, nama_lengkap, email || null, no_telepon || null, fotoPath, id]);
        } else {
            await db.query(`
                UPDATE users SET username=?, nip=?, role=?, jenis_guru=?, 
                    nama_lengkap=?, email=?, no_telepon=?, foto_profil=? WHERE id=?
            `, [username, nipFinal, finalRole, jenis_guru || null, nama_lengkap, email || null, no_telepon || null, fotoPath, id]);
        }

        res.json({ success: true, message: 'Guru berhasil diupdate', data: { foto_profil: fotoPath } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteGuru = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.query("SELECT id, foto_profil FROM users WHERE id = ? AND role IN ('guru', 'guru_bk')", [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
        hapusFotoLama(existing[0].foto_profil);
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Guru berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// DATA MURID
// ============================================
exports.getAllMuridAdmin = async (req, res) => {
    try {
        const { search, kelas_id, jenis_kelamin, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                m.id, m.nis, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini, m.kelas_id,
                u.id AS user_id, u.username, u.nama_lengkap, m.jenis_kelamin, u.email, u.foto_profil,
                k.nama_kelas, k.tingkat
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (u.nama_lengkap LIKE ? OR m.nis LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (kelas_id) {
            query += ' AND m.kelas_id = ?';
            params.push(kelas_id);
        }
        if (jenis_kelamin) {
            query += ' AND m.jenis_kelamin = ?';
            params.push(jenis_kelamin);
        }

        query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [murid] = await db.query(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM murid m JOIN users u ON m.user_id = u.id WHERE 1=1';
        const countParams = [];
        if (search) {
            countQuery += ' AND (u.nama_lengkap LIKE ? OR m.nis LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (kelas_id) {
            countQuery += ' AND m.kelas_id = ?';
            countParams.push(kelas_id);
        }
        if (jenis_kelamin) {
            countQuery += ' AND m.jenis_kelamin = ?';
            countParams.push(jenis_kelamin);
        }
        const [totalCount] = await db.query(countQuery, countParams);

        const [kelasList] = await db.query('SELECT id, nama_kelas, tingkat FROM kelas ORDER BY tingkat, nama_kelas');

        res.json({
            success: true,
            data: murid,
            kelas_list: kelasList,
            pagination: { total: totalCount[0].total, limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMurid = async (req, res) => {
    try {
        const { username, password, nama_lengkap, nis, jenis_kelamin, kelas_id, email, no_telepon } = req.body;
        if (!username || !password || !nama_lengkap || !nis || !kelas_id) {
            return res.status(400).json({ success: false, message: 'Username, password, nama, NIS, dan kelas harus diisi' });
        }

        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });

        const [existingNis] = await db.query('SELECT id FROM murid WHERE nis = ?', [nis]);
        if (existingNis.length > 0) return res.status(400).json({ success: false, message: 'NIS sudah digunakan' });

        const hash = await bcrypt.hash(password, 10);
        const fotoPath = req.file ? `/uploads/foto-profil/${req.file.filename}` : null;
        const qrCode = `MURID-${nis}`;

        const [userResult] = await db.query(`
            INSERT INTO users (username, password, role, nama_lengkap, email, no_telepon, foto_profil)
            VALUES (?, ?, 'murid', ?, ?, ?, ?)
        `, [username, hash, nama_lengkap, email || null, no_telepon || null, fotoPath]);

        const [muridResult] = await db.query(`
            INSERT INTO murid (user_id, nis, jenis_kelamin, kelas_id, qr_code, poin_bulan_ini, poin_tahun_ini)
            VALUES (?, ?, ?, ?, ?, 100, 0)
        `, [userResult.insertId, nis, jenis_kelamin || null, kelas_id, qrCode]);

        res.status(201).json({ success: true, message: 'Murid berhasil ditambahkan', data: { id: muridResult.insertId, foto_profil: fotoPath } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateMurid = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, nama_lengkap, nis, jenis_kelamin, kelas_id, email, no_telepon } = req.body;

        const [existing] = await db.query(`
            SELECT m.id, m.user_id, m.nis AS nis_lama, u.foto_profil
            FROM murid m JOIN users u ON m.user_id = u.id WHERE m.id = ?
        `, [id]);

        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });

        const murid = existing[0];
        const userId = murid.user_id;

        if (username) {
            const [dup] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (dup.length > 0) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
        }
        if (nis && nis !== murid.nis_lama) {
            const [dup] = await db.query('SELECT id FROM murid WHERE nis = ? AND id != ?', [nis, id]);
            if (dup.length > 0) return res.status(400).json({ success: false, message: 'NIS sudah digunakan' });
        }

        let fotoPath = murid.foto_profil;
        if (req.file) {
            hapusFotoLama(murid.foto_profil);
            fotoPath = `/uploads/foto-profil/${req.file.filename}`;
        }

        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            await db.query(`
                UPDATE users SET username = ?, password = ?, nama_lengkap = ?, 
                    email = ?, no_telepon = ?, foto_profil = ? WHERE id = ?
            `, [username, hash, nama_lengkap, email || null, no_telepon || null, fotoPath, userId]);
        } else {
            await db.query(`
                UPDATE users SET username = ?, nama_lengkap = ?, 
                    email = ?, no_telepon = ?, foto_profil = ? WHERE id = ?
            `, [username, nama_lengkap, email || null, no_telepon || null, fotoPath, userId]);
        }

        const qrCodeBaru = nis !== murid.nis_lama ? `MURID-${nis}` : undefined;
        if (qrCodeBaru) {
            await db.query(`
                UPDATE murid SET nis = ?, jenis_kelamin = ?, kelas_id = ?, qr_code = ? WHERE id = ?
            `, [nis, jenis_kelamin || null, kelas_id, qrCodeBaru, id]);
        } else {
            await db.query(`
                UPDATE murid SET nis = ?, jenis_kelamin = ?, kelas_id = ? WHERE id = ?
            `, [nis, jenis_kelamin || null, kelas_id, id]);
        }

        res.json({ success: true, message: 'Murid berhasil diupdate', data: { foto_profil: fotoPath } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMurid = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.query(`
            SELECT m.id, m.user_id, u.foto_profil FROM murid m JOIN users u ON m.user_id = u.id WHERE m.id = ?
        `, [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        hapusFotoLama(existing[0].foto_profil);
        await db.query('DELETE FROM users WHERE id = ?', [existing[0].user_id]);
        res.json({ success: true, message: 'Murid berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// DATA KELAS
// ============================================
exports.getAllKelasAdmin = async (req, res) => {
    try {
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            ORDER BY k.tingkat, k.nama_kelas
        `);

        const [guruList] = await db.query(`
            SELECT u.id, u.nama_lengkap,
                (SELECT COUNT(*) FROM kelas k WHERE k.wali_kelas_id = u.id) AS jumlah_kelas_diampu
            FROM users u WHERE u.role = 'guru' ORDER BY u.nama_lengkap
        `);

        res.json({ success: true, data: kelas, guru_list: guruList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, tingkat, wali_kelas_id } = req.body;

        const [existing] = await db.query('SELECT id FROM kelas WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

        if (wali_kelas_id) {
            const [dup] = await db.query('SELECT id, nama_kelas FROM kelas WHERE wali_kelas_id = ? AND id != ?', [wali_kelas_id, id]);
            if (dup.length > 0) return res.status(400).json({ success: false, message: `Guru ini sudah menjadi wali kelas ${dup[0].nama_kelas}` });
        }

        await db.query('UPDATE kelas SET nama_kelas = ?, tingkat = ?, wali_kelas_id = ? WHERE id = ?',
            [nama_kelas, tingkat, wali_kelas_id || null, id]);
        res.json({ success: true, message: 'Kelas berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createKelas = async (req, res) => {
    try {
        const { nama_kelas, tingkat, wali_kelas_id } = req.body;
        if (!nama_kelas || !tingkat) return res.status(400).json({ success: false, message: 'Nama kelas dan tingkat harus diisi' });
        const [result] = await db.query('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas_id) VALUES (?, ?, ?)',
            [nama_kelas, tingkat, wali_kelas_id || null]);
        res.status(201).json({ success: true, message: 'Kelas berhasil ditambahkan', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const [murid] = await db.query('SELECT COUNT(*) as total FROM murid WHERE kelas_id = ?', [id]);
        if (murid[0].total > 0) {
            return res.status(400).json({ success: false, message: `Kelas masih memiliki ${murid[0].total} murid.` });
        }
        await db.query('DELETE FROM kelas WHERE id = ?', [id]);
        res.json({ success: true, message: 'Kelas berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
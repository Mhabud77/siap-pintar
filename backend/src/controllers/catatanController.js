const db = require('../config/database');

// ============================================
// GET CATATAN WALI KELAS
// ============================================
exports.getCatatan = async (req, res) => {
    try {
        const { murid_id, periode, jenis } = req.query;

        let query = `
            SELECT 
                cwk.*,
                u.nama_lengkap AS wali_kelas_nama
            FROM catatan_wali_kelas cwk
            JOIN users u ON cwk.wali_kelas_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (murid_id) {
            query += ' AND cwk.murid_id = ?';
            params.push(murid_id);
        }

        if (periode) {
            query += ' AND cwk.periode = ?';
            params.push(periode);
        }

        if (jenis) {
            query += ' AND cwk.jenis = ?';
            params.push(jenis);
        }

        query += ' ORDER BY cwk.created_at DESC';

        const [catatan] = await db.query(query, params);

        res.json({
            success: true,
            data: catatan
        });

    } catch (error) {
        console.error('Get catatan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET CATATAN BY MURID & PERIODE
// ============================================
exports.getCatatanByMurid = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { periode, jenis = 'bulanan' } = req.query;

        if (!periode) {
            return res.status(400).json({
                success: false,
                message: 'Parameter periode harus diisi'
            });
        }

        const [catatan] = await db.query(`
            SELECT 
                cwk.*,
                u.nama_lengkap AS wali_kelas_nama
            FROM catatan_wali_kelas cwk
            JOIN users u ON cwk.wali_kelas_id = u.id
            WHERE cwk.murid_id = ? 
              AND cwk.periode = ? 
              AND cwk.jenis = ?
        `, [murid_id, periode, jenis]);

        res.json({
            success: true,
            data: catatan.length > 0 ? catatan[0] : null
        });

    } catch (error) {
        console.error('Get catatan by murid error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// CREATE / UPDATE CATATAN (WALI KELAS)
// ============================================
exports.saveCatatan = async (req, res) => {
    try {
        const { murid_id, periode, jenis = 'bulanan', catatan, saran } = req.body;
        const wali_kelas_id = req.user.id;

        // Validasi
        if (!murid_id || !periode || !catatan) {
            return res.status(400).json({
                success: false,
                message: 'Murid, periode, dan catatan harus diisi'
            });
        }

        // Cek apakah user adalah wali kelas dari murid ini
        const [kelas] = await db.query(`
            SELECT k.id 
            FROM kelas k
            JOIN murid m ON m.kelas_id = k.id
            WHERE k.wali_kelas_id = ? AND m.id = ?
        `, [wali_kelas_id, murid_id]);

        if (kelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda bukan wali kelas dari murid ini'
            });
        }

        // Cek apakah catatan sudah ada
        const [existing] = await db.query(`
            SELECT id FROM catatan_wali_kelas 
            WHERE murid_id = ? AND periode = ? AND jenis = ?
        `, [murid_id, periode, jenis]);

        if (existing.length > 0) {
            // Update
            await db.query(`
                UPDATE catatan_wali_kelas 
                SET catatan = ?, saran = ?, wali_kelas_id = ?
                WHERE id = ?
            `, [catatan, saran || '', wali_kelas_id, existing[0].id]);

            res.json({
                success: true,
                message: 'Catatan berhasil diupdate',
                data: { id: existing[0].id, action: 'update' }
            });
        } else {
            // Insert
            const [result] = await db.query(`
                INSERT INTO catatan_wali_kelas 
                (murid_id, wali_kelas_id, periode, jenis, catatan, saran)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [murid_id, wali_kelas_id, periode, jenis, catatan, saran || '']);

            res.status(201).json({
                success: true,
                message: 'Catatan berhasil disimpan',
                data: { id: result.insertId, action: 'insert' }
            });
        }

    } catch (error) {
        console.error('Save catatan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// DELETE CATATAN
// ============================================
exports.deleteCatatan = async (req, res) => {
    try {
        const { id } = req.params;
        const wali_kelas_id = req.user.id;

        // Cek apakah catatan milik wali kelas ini
        const [catatan] = await db.query(
            'SELECT id FROM catatan_wali_kelas WHERE id = ? AND wali_kelas_id = ?',
            [id, wali_kelas_id]
        );

        if (catatan.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Catatan tidak ditemukan atau bukan milik Anda'
            });
        }

        await db.query('DELETE FROM catatan_wali_kelas WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Catatan berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete catatan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET SEMUA CATATAN KELAS (untuk wali kelas)
// ============================================
exports.getCatatanKelas = async (req, res) => {
    try {
        const wali_kelas_id = req.user.id;
        const { periode, jenis = 'bulanan' } = req.query;

        // Cek kelas yang diampu
        const [kelas] = await db.query(
            'SELECT id FROM kelas WHERE wali_kelas_id = ?',
            [wali_kelas_id]
        );

        if (kelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda bukan wali kelas'
            });
        }

        let query = `
            SELECT 
                m.id AS murid_id,
                m.nis,
                u.nama_lengkap,
                cwk.id AS catatan_id,
                cwk.catatan,
                cwk.saran,
                cwk.periode,
                cwk.jenis,
                cwk.updated_at
            FROM murid m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN catatan_wali_kelas cwk 
                ON cwk.murid_id = m.id 
                AND cwk.jenis = ?
        `;
        const params = [jenis];

        if (periode) {
            query += ' AND cwk.periode = ?';
            params.push(periode);
        }

        query += ' WHERE m.kelas_id = ? ORDER BY u.nama_lengkap';
        params.push(kelas[0].id);

        const [data] = await db.query(query, params);

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Get catatan kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
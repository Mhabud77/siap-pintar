const db = require('../config/database');
const { kirimNotifikasiWA } = require('../services/whatsappService');

// ============================================
// GET MISI YANG AKTIF (untuk murid)
// ============================================
exports.getMisiAktif = async (req, res) => {
    try {
        const [misi] = await db.query(`
            SELECT id, judul, deskripsi, poin_reward, kategori, aktif, created_at
            FROM misi 
            WHERE aktif = TRUE 
            ORDER BY created_at DESC
        `);

        res.json({ success: true, data: misi });
    } catch (error) {
        console.error('Get misi aktif error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET SEMUA MISI (untuk admin)
// ============================================
exports.getAllMisi = async (req, res) => {
    try {
        const { aktif, kategori, search } = req.query;

        let query = `
            SELECT 
                m.*,
                (SELECT COUNT(*) FROM pengerjaan_misi pm WHERE pm.misi_id = m.id) AS total_pengerjaan,
                (SELECT COUNT(*) FROM pengerjaan_misi pm WHERE pm.misi_id = m.id AND pm.status = 'divalidasi') AS total_divalidasi,
                (SELECT COUNT(*) FROM pengerjaan_misi pm WHERE pm.misi_id = m.id AND pm.status = 'menunggu') AS total_menunggu
            FROM misi m
            WHERE 1=1
        `;
        const params = [];

        if (aktif !== undefined && aktif !== '') {
            query += ' AND m.aktif = ?';
            params.push(aktif === 'true' || aktif === '1' ? 1 : 0);
        }

        if (kategori) {
            query += ' AND m.kategori = ?';
            params.push(kategori);
        }

        if (search) {
            query += ' AND (m.judul LIKE ? OR m.deskripsi LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY m.aktif DESC, m.created_at DESC';

        const [misi] = await db.query(query, params);

        res.json({ success: true, data: misi });
    } catch (error) {
        console.error('Get all misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET MISI BY ID
// ============================================
exports.getMisiById = async (req, res) => {
    try {
        const [misi] = await db.query('SELECT * FROM misi WHERE id = ?', [req.params.id]);

        if (misi.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        res.json({ success: true, data: misi[0] });
    } catch (error) {
        console.error('Get misi by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// CREATE MISI
// ============================================
exports.createMisi = async (req, res) => {
    try {
        const { judul, deskripsi, poin_reward, kategori, aktif } = req.body;

        if (!judul || !deskripsi || !poin_reward) {
            return res.status(400).json({
                success: false,
                message: 'Judul, deskripsi, dan poin reward harus diisi'
            });
        }

        const batas = await getBatasPoinMisi();

        if (poin_reward < batas.minimal || poin_reward > batas.maksimal) {
            return res.status(400).json({
                success: false,
                message: `Poin reward harus antara ${batas.minimal} - ${batas.maksimal}`
            });
        }

        const [result] = await db.query(`
            INSERT INTO misi (judul, deskripsi, poin_reward, kategori, aktif)
            VALUES (?, ?, ?, ?, ?)
        `, [
            judul,
            deskripsi,
            poin_reward,
            kategori || 'Umum',
            aktif !== undefined ? (aktif ? 1 : 0) : 1
        ]);

        res.status(201).json({
            success: true,
            message: 'Misi berhasil ditambahkan',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPDATE MISI
// ============================================
exports.updateMisi = async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, deskripsi, poin_reward, kategori, aktif } = req.body;

        const [existing] = await db.query('SELECT id FROM misi WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        if (!judul || !deskripsi || !poin_reward) {
            return res.status(400).json({
                success: false,
                message: 'Judul, deskripsi, dan poin reward harus diisi'
            });
        }

        await db.query(`
            UPDATE misi 
            SET judul = ?, deskripsi = ?, poin_reward = ?, kategori = ?, aktif = ?
            WHERE id = ?
        `, [
            judul,
            deskripsi,
            poin_reward,
            kategori || 'Umum',
            aktif !== undefined ? (aktif ? 1 : 0) : 1,
            id
        ]);

        res.json({ success: true, message: 'Misi berhasil diupdate' });
    } catch (error) {
        console.error('Update misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// DELETE MISI
// ============================================
exports.deleteMisi = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query('SELECT id FROM misi WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        const [pengerjaan] = await db.query(
            'SELECT COUNT(*) AS total FROM pengerjaan_misi WHERE misi_id = ?',
            [id]
        );

        if (pengerjaan[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Misi sudah dikerjakan ${pengerjaan[0].total} kali. Nonaktifkan saja.`
            });
        }

        await db.query('DELETE FROM misi WHERE id = ?', [id]);

        res.json({ success: true, message: 'Misi berhasil dihapus' });
    } catch (error) {
        console.error('Delete misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// TOGGLE AKTIF MISI
// ============================================
exports.toggleAktifMisi = async (req, res) => {
    try {
        const { id } = req.params;

        const [misi] = await db.query('SELECT aktif FROM misi WHERE id = ?', [id]);
        if (misi.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        const aktifBaru = misi[0].aktif ? 0 : 1;

        await db.query('UPDATE misi SET aktif = ? WHERE id = ?', [aktifBaru, id]);

        res.json({
            success: true,
            message: `Misi berhasil di${aktifBaru ? 'aktifkan' : 'nonaktifkan'}`,
            data: { aktif: aktifBaru }
        });
    } catch (error) {
        console.error('Toggle misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// AMBIL MISI (murid)
// ============================================
exports.ambilMisi = async (req, res) => {
    try {
        const { misi_id } = req.body;
        const user_id = req.user.id;

        const [murid] = await db.query('SELECT id FROM murid WHERE user_id = ?', [user_id]);
        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Hanya murid yang dapat mengambil misi' });
        }

        const murid_id = murid[0].id;

        const [misi] = await db.query('SELECT * FROM misi WHERE id = ? AND aktif = TRUE', [misi_id]);
        if (misi.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        const [existing] = await db.query(
            'SELECT id FROM pengerjaan_misi WHERE misi_id = ? AND murid_id = ? AND status != "ditolak"',
            [misi_id, murid_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Anda sudah mengambil misi ini' });
        }

        const [result] = await db.query(`
            INSERT INTO pengerjaan_misi (misi_id, murid_id, status, tanggal_pengerjaan)
            VALUES (?, ?, 'menunggu', CURDATE())
        `, [misi_id, murid_id]);

        res.status(201).json({
            success: true,
            message: 'Misi berhasil diambil',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Ambil misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPLOAD BUKTI MISI (murid)
// ============================================
exports.uploadBukti = async (req, res) => {
    try {
        const { pengerjaan_id, catatan } = req.body;
        const user_id = req.user.id;

        const [murid] = await db.query('SELECT id FROM murid WHERE user_id = ?', [user_id]);
        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Hanya murid' });
        }

        await db.query(`
            UPDATE pengerjaan_misi 
            SET bukti_foto = ?, catatan_murid = ?, status = 'menunggu'
            WHERE id = ? AND murid_id = ?
        `, [req.file?.path || null, catatan, pengerjaan_id, murid[0].id]);

        res.json({ success: true, message: 'Bukti berhasil diupload' });
    } catch (error) {
        console.error('Upload bukti error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PENGERJAAN MISI MURID
// ============================================
exports.getPengerjaanMurid = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [murid] = await db.query('SELECT id FROM murid WHERE user_id = ?', [user_id]);
        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Hanya murid' });
        }

        const [pengerjaan] = await db.query(`
            SELECT pm.*, m.judul, m.deskripsi, m.poin_reward
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            WHERE pm.murid_id = ?
            ORDER BY pm.tanggal_pengerjaan DESC
        `, [murid[0].id]);

        res.json({ success: true, data: pengerjaan });
    } catch (error) {
        console.error('Get pengerjaan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PERLU VALIDASI (wali kelas)
// ============================================
exports.getPerluValidasi = async (req, res) => {
    try {
        const guru_id = req.user.id;

        const [kelas] = await db.query(
            'SELECT id, nama_kelas, tingkat FROM kelas WHERE wali_kelas_id = ?',
            [guru_id]
        );

        if (kelas.length === 0) {
            return res.json({
                success: true,
                data: [],
                info: { is_wali_kelas: false, message: 'Anda bukan wali kelas' }
            });
        }

        const kelasId = kelas[0].id;

        const [pengerjaan] = await db.query(`
            SELECT 
                pm.*, 
                m.judul AS misi_judul,
                m.deskripsi AS misi_deskripsi,
                m.poin_reward,
                m.kategori AS misi_kategori,
                u.nama_lengkap,
                murid.nis,
                k.nama_kelas
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            JOIN murid ON pm.murid_id = murid.id
            JOIN users u ON murid.user_id = u.id
            JOIN kelas k ON murid.kelas_id = k.id
            WHERE murid.kelas_id = ? AND pm.status = 'menunggu'
            ORDER BY pm.tanggal_pengerjaan ASC, pm.id ASC
        `, [kelasId]);

        const [statistik] = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) AS menunggu,
                SUM(CASE WHEN status = 'divalidasi' THEN 1 ELSE 0 END) AS divalidasi,
                SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) AS ditolak
            FROM pengerjaan_misi pm
            JOIN murid ON pm.murid_id = murid.id
            WHERE murid.kelas_id = ?
        `, [kelasId]);

        res.json({
            success: true,
            data: pengerjaan,
            info: {
                is_wali_kelas: true,
                kelas: kelas[0],
                statistik: statistik[0] || { total: 0, menunggu: 0, divalidasi: 0, ditolak: 0 }
            }
        });
    } catch (error) {
        console.error('Get perlu validasi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// VALIDASI MISI (wali kelas)
// ============================================
exports.validasiMisi = async (req, res) => {
    try {
        const { pengerjaan_id, status, catatan } = req.body;
        const guru_id = req.user.id;

        if (!['divalidasi', 'ditolak'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status harus divalidasi atau ditolak' });
        }

        const [pengerjaan] = await db.query(`
            SELECT pm.*, m.poin_reward, m.judul, murid.id as murid_id, 
                   u.nama_lengkap, k.nama_kelas
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            JOIN murid ON pm.murid_id = murid.id
            JOIN users u ON murid.user_id = u.id
            JOIN kelas k ON murid.kelas_id = k.id
            WHERE pm.id = ?
        `, [pengerjaan_id]);

        if (pengerjaan.length === 0) {
            return res.status(404).json({ success: false, message: 'Pengerjaan tidak ditemukan' });
        }

        const data = pengerjaan[0];

        // Cek apakah user wali kelas dari murid ini
        const [kelas] = await db.query(
            'SELECT id FROM kelas WHERE wali_kelas_id = ? AND id = (SELECT kelas_id FROM murid WHERE id = ?)',
            [guru_id, data.murid_id]
        );

        if (kelas.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda bukan wali kelas dari murid ini' });
        }

        await db.query(`
            UPDATE pengerjaan_misi 
            SET status = ?, catatan_wali_kelas = ?, divalidasi_oleh = ?, tanggal_validasi = CURDATE()
            WHERE id = ?
        `, [status, catatan || '', guru_id, pengerjaan_id]);

        if (status === 'divalidasi') {
            await db.query(`
                UPDATE murid 
                SET poin_bulan_ini = poin_bulan_ini + ?,
                    poin_tahun_ini = poin_tahun_ini + ?
                WHERE id = ?
            `, [data.poin_reward, data.poin_reward, data.murid_id]);

            const [currentPoin] = await db.query(
                'SELECT poin_bulan_ini FROM murid WHERE id = ?',
                [data.murid_id]
            );

            await db.query(`
                INSERT INTO log_poin 
                (murid_id, sumber, referensi_id, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
                VALUES (?, 'misi', ?, ?, ?, ?, ?)
            `, [
                data.murid_id,
                pengerjaan_id,
                data.poin_reward,
                currentPoin[0].poin_bulan_ini - data.poin_reward,
                currentPoin[0].poin_bulan_ini,
                `Misi selesai: ${data.judul}`
            ]);
        }

        res.json({
            success: true,
            message: `Misi berhasil ${status === 'divalidasi' ? 'divalidasi' : 'ditolak'}`
        });
    } catch (error) {
        console.error('Validasi misi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// ============================================
// HELPER: Ambil batas poin misi dari DB
// ============================================
async function getBatasPoinMisi() {
    const [rows] = await db.query(`
        SELECT nama_konfigurasi, nilai 
        FROM konfigurasi_poin 
        WHERE kategori = 'misi'
    `);

    const konfig = {};
    rows.forEach(r => {
        konfig[r.nama_konfigurasi] = r.nilai;
    });

    return {
        default: konfig.poin_misi_default ?? 15,
        minimal: konfig.poin_misi_minimal ?? 1,
        maksimal: konfig.poin_misi_maksimal ?? 100
    };
}
const db = require('../config/database');

exports.kirimPesan = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { penerima_id, jenis_penerima, kategori, judul, pesan } = req.body;

        if (!penerima_id || !jenis_penerima || !judul || !pesan) {
            return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
        }

        const [murid] = await db.query('SELECT id FROM murid WHERE user_id = ?', [user_id]);
        if (murid.length === 0) return res.status(403).json({ success: false, message: 'Hanya murid' });

        const [penerima] = await db.query(
            "SELECT id, nama_lengkap FROM users WHERE id = ? AND (role = 'guru' OR role = 'guru_bk')",
            [penerima_id]
        );
        if (penerima.length === 0) return res.status(404).json({ success: false, message: 'Penerima tidak ditemukan' });

        const [result] = await db.query(`
            INSERT INTO bimbingan_konseling (murid_id, penerima_id, jenis_penerima, kategori, judul, pesan, status)
            VALUES (?, ?, ?, ?, ?, ?, 'menunggu')
        `, [murid[0].id, penerima_id, jenis_penerima, kategori || 'lainnya', judul, pesan]);

        res.status(201).json({
            success: true,
            message: `Pesan berhasil dikirim ke ${penerima[0].nama_lengkap}`,
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPesanMurid = async (req, res) => {
    try {
        const [murid] = await db.query('SELECT id FROM murid WHERE user_id = ?', [req.user.id]);
        if (murid.length === 0) return res.status(403).json({ success: false, message: 'Hanya murid' });

        const [pesan] = await db.query(`
            SELECT 
                bk.*,
                u.nama_lengkap AS penerima_nama,
                u.foto_profil AS penerima_foto,
                ub.nama_lengkap AS dibalas_oleh_nama,
                (SELECT COUNT(*) FROM bk_balasan WHERE bk_id = bk.id AND dihapus = FALSE) AS jumlah_balasan,
                (SELECT MAX(created_at) FROM bk_balasan WHERE bk_id = bk.id AND dihapus = FALSE) AS balasan_terakhir
            FROM bimbingan_konseling bk
            JOIN users u ON bk.penerima_id = u.id
            LEFT JOIN users ub ON bk.dibalas_oleh = ub.id
            WHERE bk.murid_id = ? AND bk.dihapus_murid = FALSE
            ORDER BY bk.created_at DESC
        `, [murid[0].id]);

        res.json({ success: true, data: pesan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPesanMasuk = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT 
                bk.*,
                m.nis,
                u.nama_lengkap AS murid_nama,
                u.foto_profil AS murid_foto,
                k.nama_kelas,
                (SELECT COUNT(*) FROM bk_balasan WHERE bk_id = bk.id AND dihapus = FALSE) AS jumlah_balasan,
                (SELECT MAX(created_at) FROM bk_balasan WHERE bk_id = bk.id AND dihapus = FALSE) AS balasan_terakhir
            FROM bimbingan_konseling bk
            JOIN murid m ON bk.murid_id = m.id
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE bk.penerima_id = ? AND bk.dihapus_penerima = FALSE
        `;
        const params = [req.user.id];
        if (status) { query += ' AND bk.status = ?'; params.push(status); }
        query += ' ORDER BY bk.created_at DESC';

        const [pesan] = await db.query(query, params);
        res.json({ success: true, data: pesan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.balasPesan = async (req, res) => {
    try {
        const { id } = req.params;
        const { balasan, status } = req.body;

        if (!balasan) return res.status(400).json({ success: false, message: 'Balasan harus diisi' });

        const [pesan] = await db.query(
            'SELECT id FROM bimbingan_konseling WHERE id = ? AND penerima_id = ?',
            [id, req.user.id]
        );
        if (pesan.length === 0) return res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });

        await db.query(`
            UPDATE bimbingan_konseling 
            SET balasan = ?, dibalas_oleh = ?, tanggal_balasan = NOW(), status = ?
            WHERE id = ?
        `, [balasan, req.user.id, status || 'dibalas', id]);

        res.json({ success: true, message: 'Balasan berhasil dikirim' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['menunggu', 'dibaca', 'dibalas', 'selesai'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }

        await db.query(
            'UPDATE bimbingan_konseling SET status = ? WHERE id = ? AND penerima_id = ?',
            [status, id, req.user.id]
        );

        res.json({ success: true, message: 'Status diupdate' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStatistikBK = async (req, res) => {
    try {
        const [statistik] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
                SUM(CASE WHEN status = 'dibaca' THEN 1 ELSE 0 END) as dibaca,
                SUM(CASE WHEN status = 'dibalas' THEN 1 ELSE 0 END) as dibalas,
                SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai
            FROM bimbingan_konseling
            WHERE penerima_id = ?
        `, [req.user.id]);

        res.json({ success: true, data: statistik[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getLaporanBK = async (req, res) => {
    try {
        const { kelas_id, status, dari, sampai } = req.query;

        let query = `
            SELECT bk.*, u.nama_lengkap AS murid_nama, m.nis, k.nama_kelas,
                   ub.nama_lengkap AS dibalas_oleh_nama
            FROM bimbingan_konseling bk
            JOIN murid m ON bk.murid_id = m.id
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN users ub ON bk.dibalas_oleh = ub.id
            WHERE bk.penerima_id = ?
        `;
        const params = [req.user.id];

        if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
        if (status) { query += ' AND bk.status = ?'; params.push(status); }
        if (dari) { query += ' AND DATE(bk.created_at) >= ?'; params.push(dari); }
        if (sampai) { query += ' AND DATE(bk.created_at) <= ?'; params.push(sampai); }

        query += ' ORDER BY bk.created_at DESC';

        const [laporan] = await db.query(query, params);

        const total = laporan.length;
        const selesai = laporan.filter(l => l.status === 'selesai').length;
        const dibalas = laporan.filter(l => l.status === 'dibalas').length;

        res.json({
            success: true,
            data: laporan,
            statistik: { total, selesai, dibalas }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// ============================================
// EDIT PESAN (MURID)
// ============================================
exports.editPesan = async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, kategori, pesan } = req.body;
        const user_id = req.user.id;

        // Cek murid
        const [murid] = await db.query(
            'SELECT id FROM murid WHERE user_id = ?',
            [user_id]
        );

        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Hanya murid' });
        }

        // Cek pesan milik murid ini
        const [existing] = await db.query(`
            SELECT bk.id, bk.status
            FROM bimbingan_konseling bk
            WHERE bk.id = ? AND bk.murid_id = ? AND bk.dihapus_murid = FALSE
        `, [id, murid[0].id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesan tidak ditemukan atau sudah dihapus'
            });
        }

        // Cek apakah sudah ada balasan
        const [balasan] = await db.query(
            'SELECT id FROM bk_balasan WHERE bk_id = ? LIMIT 1',
            [id]
        );

        if (balasan.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Pesan sudah dibalas, tidak bisa diedit. Hapus & buat pesan baru.'
            });
        }

        await db.query(`
            UPDATE bimbingan_konseling 
            SET judul = ?, kategori = ?, pesan = ?
            WHERE id = ?
        `, [judul, kategori, pesan, id]);

        res.json({ success: true, message: 'Pesan berhasil diedit' });
    } catch (error) {
        console.error('Edit pesan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// HAPUS PESAN (SOFT DELETE)
// ============================================
exports.hapusPesan = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const user_role = req.user.role;

        // Cek pesan ada
        const [existing] = await db.query(
            'SELECT id, murid_id, penerima_id FROM bimbingan_konseling WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesan tidak ditemukan'
            });
        }

        const pesan = existing[0];

        // Tentukan: murid atau penerima?
        if (user_role === 'murid') {
            const [murid] = await db.query(
                'SELECT id FROM murid WHERE user_id = ?',
                [user_id]
            );

            if (murid.length === 0 || murid[0].id !== pesan.murid_id) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }

            await db.query(`
                UPDATE bimbingan_konseling 
                SET dihapus_murid = TRUE, dihapus_oleh = ?, tanggal_dihapus = NOW()
                WHERE id = ?
            `, [user_id, id]);
        } else {
            // Guru (wali / BK)
            if (pesan.penerima_id !== user_id) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }

            await db.query(`
                UPDATE bimbingan_konseling 
                SET dihapus_penerima = TRUE, dihapus_oleh = ?, tanggal_dihapus = NOW()
                WHERE id = ?
            `, [user_id, id]);
        }

        res.json({ success: true, message: 'Pesan berhasil dihapus' });
    } catch (error) {
        console.error('Hapus pesan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// ============================================
// GET DETAIL PESAN + SEMUA BALASAN (THREAD)
// ============================================
exports.getDetailPesan = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const user_role = req.user.role;

        // Ambil pesan utama
        const [pesan] = await db.query(`
            SELECT 
                bk.*,
                um.nama_lengkap AS murid_nama,
                um.foto_profil AS murid_foto,
                m.nis,
                k.nama_kelas,
                up.nama_lengkap AS penerima_nama,
                up.foto_profil AS penerima_foto
            FROM bimbingan_konseling bk
            JOIN murid m ON bk.murid_id = m.id
            JOIN users um ON m.user_id = um.id
            JOIN kelas k ON m.kelas_id = k.id
            JOIN users up ON bk.penerima_id = up.id
            WHERE bk.id = ?
        `, [id]);

        if (pesan.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesan tidak ditemukan'
            });
        }

        const dataPesan = pesan[0];

        // Cek akses: hanya murid terkait atau penerima
        let boleh = false;

        if (user_role === 'murid') {
            const [murid] = await db.query(
                'SELECT id FROM murid WHERE user_id = ?',
                [user_id]
            );
            boleh = murid.length > 0 && murid[0].id === dataPesan.murid_id;
        } else {
            boleh = dataPesan.penerima_id === user_id;
        }

        if (!boleh) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke pesan ini'
            });
        }

        // Ambil semua balasan
        const [balasan] = await db.query(`
            SELECT 
                bb.*,
                u.nama_lengkap AS pengirim_nama,
                u.foto_profil AS pengirim_foto
            FROM bk_balasan bb
            JOIN users u ON bb.pengirim_id = u.id
            WHERE bb.bk_id = ? AND bb.dihapus = FALSE
            ORDER BY bb.created_at ASC
        `, [id]);

        res.json({
            success: true,
            data: {
                pesan: dataPesan,
                balasan: balasan
            }
        });
    } catch (error) {
        console.error('Get detail pesan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// TAMBAH BALASAN (CHAT THREAD)
// ============================================
exports.tambahBalasan = async (req, res) => {
    try {
        const { id } = req.params;
        const { isi } = req.body;
        const user_id = req.user.id;
        const user_role = req.user.role;

        if (!isi || isi.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Isi balasan tidak boleh kosong'
            });
        }

        // Cek pesan utama
        const [pesan] = await db.query(
            'SELECT id, murid_id, penerima_id FROM bimbingan_konseling WHERE id = ?',
            [id]
        );

        if (pesan.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesan tidak ditemukan'
            });
        }

        const dataPesan = pesan[0];

        // Tentukan role pengirim
        let pengirim_role = 'murid';
        let boleh = false;

        if (user_role === 'murid') {
            const [murid] = await db.query(
                'SELECT id FROM murid WHERE user_id = ?',
                [user_id]
            );
            boleh = murid.length > 0 && murid[0].id === dataPesan.murid_id;
            pengirim_role = 'murid';
        } else if (user_role === 'guru_bk') {
            boleh = dataPesan.penerima_id === user_id;
            pengirim_role = 'guru_bk';
        } else {
            boleh = dataPesan.penerima_id === user_id;
            pengirim_role = 'wali_kelas';
        }

        if (!boleh) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses'
            });
        }

        // Insert balasan
        const [result] = await db.query(`
            INSERT INTO bk_balasan (bk_id, pengirim_id, pengirim_role, isi)
            VALUES (?, ?, ?, ?)
        `, [id, user_id, pengirim_role, isi.trim()]);

        // Update status jadi 'dibalas' kalau pengirim guru
        if (user_role !== 'murid') {
            await db.query(`
                UPDATE bimbingan_konseling 
                SET status = 'dibalas'
                WHERE id = ? AND status != 'selesai'
            `, [id]);
        }

        // Update status jadi 'dibaca' kalau murid balas
        if (user_role === 'murid') {
            await db.query(`
                UPDATE bimbingan_konseling 
                SET status = 'dibaca'
                WHERE id = ? AND status = 'selesai'
            `, [id]);
        }

        res.status(201).json({
            success: true,
            message: 'Balasan berhasil dikirim',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Tambah balasan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// EDIT BALASAN
// ============================================
exports.editBalasan = async (req, res) => {
    try {
        const { balasan_id } = req.params;
        const { isi } = req.body;
        const user_id = req.user.id;

        if (!isi || isi.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Isi balasan tidak boleh kosong'
            });
        }

        const [existing] = await db.query(
            'SELECT id FROM bk_balasan WHERE id = ? AND pengirim_id = ? AND dihapus = FALSE',
            [balasan_id, user_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Balasan tidak ditemukan atau bukan milik Anda'
            });
        }

        await db.query(
            'UPDATE bk_balasan SET isi = ? WHERE id = ?',
            [isi.trim(), balasan_id]
        );

        res.json({ success: true, message: 'Balasan berhasil diedit' });
    } catch (error) {
        console.error('Edit balasan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// HAPUS BALASAN (SOFT DELETE)
// ============================================
exports.hapusBalasan = async (req, res) => {
    try {
        const { balasan_id } = req.params;
        const user_id = req.user.id;

        const [existing] = await db.query(
            'SELECT id FROM bk_balasan WHERE id = ? AND pengirim_id = ?',
            [balasan_id, user_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Balasan tidak ditemukan atau bukan milik Anda'
            });
        }

        await db.query(
            'UPDATE bk_balasan SET dihapus = TRUE WHERE id = ?',
            [balasan_id]
        );

        res.json({ success: true, message: 'Balasan berhasil dihapus' });
    } catch (error) {
        console.error('Hapus balasan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
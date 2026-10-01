const db = require('../config/database');

// ============================================
// GET SEMUA KONFIGURASI (dikelompokkan per kategori)
// ============================================
exports.getAllKonfigurasi = async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT * FROM konfigurasi_poin 
            ORDER BY kategori, nama_konfigurasi
        `);

        // Kelompokkan per kategori
        const grouped = {
            absensi: [],
            perilaku_positif: [],
            perilaku_negatif: [],
            misi: []
        };

        data.forEach(item => {
            if (grouped[item.kategori]) {
                grouped[item.kategori].push(item);
            }
        });

        res.json({
            success: true,
            data: grouped,
            total: data.length
        });
    } catch (error) {
        console.error('Get all konfigurasi error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET KONFIGURASI BY KATEGORI
// ============================================
exports.getKonfigurasiByKategori = async (req, res) => {
    try {
        const { kategori } = req.params;

        const [data] = await db.query(
            'SELECT * FROM konfigurasi_poin WHERE kategori = ? ORDER BY nama_konfigurasi',
            [kategori]
        );

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get konfigurasi by kategori error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// UPDATE KONFIGURASI (SINGLE)
// ============================================
exports.updateKonfigurasi = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai, keterangan } = req.body;

        if (nilai === undefined || nilai === null) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus diisi'
            });
        }

        // Cek konfigurasi ada
        const [existing] = await db.query(
            'SELECT * FROM konfigurasi_poin WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi tidak ditemukan'
            });
        }

        await db.query(`
            UPDATE konfigurasi_poin 
            SET nilai = ?, keterangan = ?
            WHERE id = ?
        `, [nilai, keterangan || existing[0].keterangan, id]);

        res.json({
            success: true,
            message: `Konfigurasi "${existing[0].nama_konfigurasi}" berhasil diupdate`
        });
    } catch (error) {
        console.error('Update konfigurasi error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// UPDATE BANYAK KONFIGURASI SEKALIGUS (BULK)
// ============================================
exports.bulkUpdateKonfigurasi = async (req, res) => {
    try {
        const { konfigurasi } = req.body;

        // konfigurasi = [{ id: 1, nilai: 10 }, { id: 2, nilai: 5 }, ...]

        if (!Array.isArray(konfigurasi) || konfigurasi.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data konfigurasi harus berupa array dan tidak kosong'
            });
        }

        // Update satu per satu dalam transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const item of konfigurasi) {
                if (item.nilai === undefined || item.nilai === null) continue;

                await connection.query(
                    'UPDATE konfigurasi_poin SET nilai = ? WHERE id = ?',
                    [item.nilai, item.id]
                );
            }

            await connection.commit();

            res.json({
                success: true,
                message: `${konfigurasi.length} konfigurasi berhasil diupdate`
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Bulk update konfigurasi error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// RESET KE DEFAULT
// ============================================
exports.resetKonfigurasi = async (req, res) => {
    try {
        const defaultValues = {
            'poin_datang_sebelum_630': 10,
            'poin_datang_630_645': 5,
            'poin_datang_645_700': 1,
            'poin_terlambat': -5,
            'poin_tidak_masuk': -10,
            'poin_datang_tepat_waktu': 5,
            'poin_membantu_guru': 10,
            'poin_membantu_teman': 5,
            'poin_membersihkan_kelas': 5,
            'poin_membuang_sampah': 3,
            'poin_sopan_santun': 5,
            'poin_berprestasi': 20,
            'poin_aktif_diskusi': 5,
            'poin_terlambat_masuk_kelas': -5,
            'poin_seragam_tidak_lengkap': -3,
            'poin_buang_sampah_sembarangan': -5,
            'poin_tidak_sopan': -10,
            'poin_meninggalkan_kelas': -10,
            'poin_berkelahi': -25,
            'poin_merokok': -50,
            'poin_menyontek': -20,
            'poin_bullying': -50,
            'poin_misi_default': 15,
            'poin_misi_minimal': 5,
            'poin_misi_maksimal': 50
        };

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const [nama, nilai] of Object.entries(defaultValues)) {
                await connection.query(
                    'UPDATE konfigurasi_poin SET nilai = ? WHERE nama_konfigurasi = ?',
                    [nilai, nama]
                );
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Semua konfigurasi berhasil direset ke default'
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Reset konfigurasi error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET NILAI KONFIGURASI (untuk dipakai di kode lain)
// ============================================
exports.getNilaiKonfigurasi = async (req, res) => {
    try {
        const [data] = await db.query('SELECT nama_konfigurasi, nilai FROM konfigurasi_poin');

        // Convert ke object: { poin_datang_sebelum_630: 10, ... }
        const result = {};
        data.forEach(item => {
            result[item.nama_konfigurasi] = item.nilai;
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get nilai konfigurasi error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
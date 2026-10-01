const db = require('../config/database');

// ============================================
// GET SEMUA KELAS (dengan info wali & jumlah murid)
// ============================================
exports.getAllKelas = async (req, res) => {
    try {
        const [kelas] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                k.tingkat,
                k.wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama,
                u.username AS wali_kelas_username,
                u.email AS wali_kelas_email,
                u.no_telepon AS wali_kelas_telepon,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            ORDER BY k.tingkat, k.nama_kelas
        `);

        res.json({
            success: true,
            data: kelas
        });
    } catch (error) {
        console.error('Get all kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET KELAS BY ID (dengan detail murid)
// ============================================
exports.getKelasById = async (req, res) => {
    try {
        const { id } = req.params;

        const [kelas] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                k.tingkat,
                k.wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            WHERE k.id = ?
        `, [id]);

        if (kelas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan'
            });
        }

        const [murid] = await db.query(`
            SELECT 
                m.id,
                m.nis,
                m.poin_bulan_ini,
                m.poin_tahun_ini,
                u.nama_lengkap,
                u.email
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY u.nama_lengkap
        `, [id]);

        res.json({
            success: true,
            data: {
                ...kelas[0],
                murid
            }
        });
    } catch (error) {
        console.error('Get kelas by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET DAFTAR GURU (untuk dropdown wali kelas)
// ============================================
exports.getGuruList = async (req, res) => {
    try {
        const [guru] = await db.query(`
            SELECT 
                u.id,
                u.username,
                u.nama_lengkap,
                u.email,
                (SELECT COUNT(*) FROM kelas k WHERE k.wali_kelas_id = u.id) AS jumlah_kelas_diampu
            FROM users u
            WHERE u.role = 'guru'
            ORDER BY u.nama_lengkap
        `);

        res.json({
            success: true,
            data: guru
        });
    } catch (error) {
        console.error('Get guru list error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// SET WALI KELAS
// ============================================
exports.setWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { wali_kelas_id } = req.body;

        const [kelas] = await db.query(
            'SELECT id, nama_kelas FROM kelas WHERE id = ?',
            [id]
        );

        if (kelas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan'
            });
        }

        if (!wali_kelas_id) {
            await db.query(
                'UPDATE kelas SET wali_kelas_id = NULL WHERE id = ?',
                [id]
            );
            return res.json({
                success: true,
                message: `Wali kelas ${kelas[0].nama_kelas} berhasil dihapus`
            });
        }

        const [guru] = await db.query(
            "SELECT id, nama_lengkap FROM users WHERE id = ? AND role = 'guru'",
            [wali_kelas_id]
        );

        if (guru.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Guru tidak ditemukan atau bukan role guru'
            });
        }

        const [existing] = await db.query(
            'SELECT id, nama_kelas FROM kelas WHERE wali_kelas_id = ? AND id != ?',
            [wali_kelas_id, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${guru[0].nama_lengkap} sudah menjadi wali kelas ${existing[0].nama_kelas}. Satu guru hanya boleh menjadi wali 1 kelas.`
            });
        }

        await db.query(
            'UPDATE kelas SET wali_kelas_id = ? WHERE id = ?',
            [wali_kelas_id, id]
        );

        res.json({
            success: true,
            message: `${guru[0].nama_lengkap} berhasil ditetapkan sebagai wali kelas ${kelas[0].nama_kelas}`
        });

    } catch (error) {
        console.error('Set wali kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET STATISTIK KELAS
// ============================================
exports.getStatistikKelas = async (req, res) => {
    try {
        const [statistik] = await db.query(`
            SELECT 
                k.tingkat,
                COUNT(DISTINCT k.id) AS jumlah_kelas,
                COUNT(DISTINCT m.id) AS jumlah_murid,
                AVG(m.poin_bulan_ini) AS rata_poin
            FROM kelas k
            LEFT JOIN murid m ON k.id = m.kelas_id
            GROUP BY k.tingkat
            ORDER BY k.tingkat
        `);

        res.json({
            success: true,
            data: statistik.map(s => ({
                ...s,
                rata_poin: parseFloat(s.rata_poin || 0).toFixed(1)
            }))
        });
    } catch (error) {
        console.error('Get statistik kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET KELAS UNTUK FILTER (SEMUA ROLE)
// - Wali kelas mode "wali" : hanya kelas sendiri
// - Wali kelas mode "guru" : semua kelas
// - Guru mapel murni       : semua kelas
// - Guru BK                : semua kelas
// - Admin/kepsek           : semua kelas
// - Murid                  : kelas sendiri
// - Orang tua              : kelas anak
// ============================================
exports.getKelasUntukFilter = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        const mode = req.query.mode || 'guru'; // default: guru

        let query = '';
        let params = [];

        if (role === 'admin' || role === 'kepsek') {
            query = `
                SELECT k.id, k.nama_kelas, k.tingkat
                FROM kelas k
                ORDER BY k.tingkat, k.nama_kelas
            `;

        } else if (role === 'guru') {
            // Cek apakah wali kelas
            const [kelasWali] = await db.query(
                'SELECT id FROM kelas WHERE wali_kelas_id = ?',
                [userId]
            );
            const isWaliKelas = kelasWali.length > 0;

            if (isWaliKelas && mode === 'wali') {
                // Mode WALI: hanya kelas sendiri
                query = `
                    SELECT k.id, k.nama_kelas, k.tingkat
                    FROM kelas k
                    WHERE k.wali_kelas_id = ?
                    ORDER BY k.tingkat, k.nama_kelas
                `;
                params.push(userId);
            } else {
                // Mode GURU MAPEL atau bukan wali: semua kelas
                query = `
                    SELECT k.id, k.nama_kelas, k.tingkat
                    FROM kelas k
                    ORDER BY k.tingkat, k.nama_kelas
                `;
            }

        } else if (role === 'guru_bk') {
            // Guru BK: semua kelas
            query = `
                SELECT k.id, k.nama_kelas, k.tingkat
                FROM kelas k
                ORDER BY k.tingkat, k.nama_kelas
            `;

        } else if (role === 'murid') {
            query = `
                SELECT k.id, k.nama_kelas, k.tingkat
                FROM kelas k
                JOIN murid m ON m.kelas_id = k.id
                WHERE m.user_id = ?
                ORDER BY k.tingkat, k.nama_kelas
            `;
            params.push(userId);

        } else if (role === 'orangtua') {
            query = `
                SELECT DISTINCT k.id, k.nama_kelas, k.tingkat
                FROM kelas k
                JOIN murid m ON m.kelas_id = k.id
                WHERE m.orangtua_id = ?
                ORDER BY k.tingkat, k.nama_kelas
            `;
            params.push(userId);

        } else {
            return res.json({ success: true, data: [] });
        }

        const [kelas] = await db.query(query, params);

        res.json({
            success: true,
            data: kelas,
            role,
            mode,
            total: kelas.length
        });

    } catch (error) {
        console.error('Get kelas untuk filter error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
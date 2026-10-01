const db = require('../config/database');

// ============================================
// GET DASHBOARD MURID
// ============================================
exports.getDashboardMurid = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
                m.kelas_id, u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.tingkat, k.wali_kelas_id
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.user_id = ?
        `, [user_id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Data murid tidak ditemukan' });
        }

        const muridData = murid[0];

        // Peringkat
        const [ranking] = await db.query(`
            SELECT COUNT(*) + 1 as rank FROM murid
            WHERE kelas_id = ? AND poin_bulan_ini > ?
        `, [muridData.kelas_id, muridData.poin_bulan_ini]);

        const [totalMuridKelas] = await db.query(
            'SELECT COUNT(*) as total FROM murid WHERE kelas_id = ?',
            [muridData.kelas_id]
        );

        // Leaderboard kelas
        const [leaderboard] = await db.query(`
            SELECT m.id, m.poin_bulan_ini, u.nama_lengkap, u.foto_profil
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY m.poin_bulan_ini DESC, m.poin_tahun_ini DESC
            LIMIT 10
        `, [muridData.kelas_id]);

        const leaderboardFormatted = leaderboard.map((item, i) => ({
            ...item,
            rank: i + 1,
            is_me: item.id === muridData.id,
            is_podium: i < 3
        }));

        // Misi tersedia
        const [misiTersedia] = await db.query(`
            SELECT m.id, m.judul, m.deskripsi, m.poin_reward, m.kategori
            FROM misi m
            WHERE m.aktif = TRUE
              AND m.id NOT IN (
                  SELECT misi_id FROM pengerjaan_misi 
                  WHERE murid_id = ? AND status != 'ditolak'
              )
            ORDER BY m.created_at DESC
            LIMIT 5
        `, [muridData.id]);

        // Riwayat perilaku
        const [riwayat] = await db.query(`
            SELECT p.id, p.jenis, p.kategori, p.deskripsi, p.poin, 
                   p.tanggal, p.waktu, u.nama_lengkap AS guru_nama
            FROM perilaku p
            JOIN users u ON p.guru_id = u.id
            WHERE p.murid_id = ?
            ORDER BY p.tanggal DESC, p.created_at DESC
            LIMIT 10
        `, [muridData.id]);

        // Statistik absensi
        const [absensi] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) as alpa
            FROM absensi
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [muridData.id]);

        // Misi selesai
        const [misiSelesai] = await db.query(`
            SELECT COUNT(*) as total FROM pengerjaan_misi
            WHERE murid_id = ? AND status = 'divalidasi'
        `, [muridData.id]);

        // Wali kelas
        let waliKelas = null;
        if (muridData.wali_kelas_id) {
            const [wali] = await db.query(
                'SELECT id, nama_lengkap, email, no_telepon, foto_profil FROM users WHERE id = ?',
                [muridData.wali_kelas_id]
            );
            if (wali.length > 0) waliKelas = wali[0];
        }

        res.json({
            success: true,
            data: {
                murid: {
                    ...muridData,
                    peringkat: ranking[0].rank,
                    total_murid_kelas: totalMuridKelas[0].total
                },
                leaderboard_kelas: leaderboardFormatted,
                misi_tersedia: misiTersedia,
                riwayat_perilaku: riwayat,
                statistik_absensi: absensi[0],
                misi_selesai: misiSelesai[0].total,
                wali_kelas: waliKelas
            }
        });
    } catch (error) {
        console.error('Get dashboard murid error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DATA KELAS MURID
// ============================================
exports.getKelasMurid = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [murid] = await db.query(
            'SELECT kelas_id FROM murid WHERE user_id = ?', [user_id]
        );

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        const kelas_id = murid[0].kelas_id;

        const [kelas] = await db.query(`
            SELECT 
                k.id, k.nama_kelas, k.tingkat,
                u.id AS wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama,
                u.email AS wali_kelas_email,
                u.no_telepon AS wali_kelas_telepon,
                u.foto_profil AS wali_kelas_foto,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            WHERE k.id = ?
        `, [kelas_id]);

        const [temanSekelas] = await db.query(`
            SELECT m.id, m.poin_bulan_ini, u.nama_lengkap, u.foto_profil
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY m.poin_bulan_ini DESC
            LIMIT 10
        `, [kelas_id]);

        res.json({
            success: true,
            data: {
                kelas: {
                    ...kelas[0],
                    rata_poin: parseFloat(kelas[0].rata_poin || 0).toFixed(1)
                },
                teman_sekelas: temanSekelas
            }
        });
    } catch (error) {
        console.error('Get kelas murid error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DAFTAR GURU BK
// ============================================
exports.getGuruBK = async (req, res) => {
    try {
        const [guruBK] = await db.query(`
            SELECT u.id, u.username, u.nama_lengkap, u.email, u.no_telepon, u.foto_profil
            FROM users u
            WHERE u.role = 'guru_bk'
            ORDER BY u.nama_lengkap
        `);

        res.json({ success: true, data: guruBK });
    } catch (error) {
        console.error('Get guru BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
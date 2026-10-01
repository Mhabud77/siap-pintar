const db = require('../config/database');

// ============================================
// GET SEMUA GURU (untuk Kepala Sekolah)
// ============================================
exports.getAllGuru = async (req, res) => {
    try {
        const { search, status } = req.query;

        let query = `
            SELECT 
                u.id,
                u.username,
                u.nama_lengkap,
                u.email,
                u.no_telepon,
                u.foto_profil,
                u.created_at,
                (SELECT COUNT(*) FROM kelas k WHERE k.wali_kelas_id = u.id) AS jumlah_kelas_diampu,
                (SELECT k.nama_kelas FROM kelas k WHERE k.wali_kelas_id = u.id LIMIT 1) AS wali_kelas_dari,
                (SELECT COUNT(*) FROM perilaku p WHERE p.guru_id = u.id) AS total_input_perilaku,
                (SELECT COUNT(*) FROM pengerjaan_misi pm WHERE pm.divalidasi_oleh = u.id) AS total_validasi_misi
            FROM users u
            WHERE u.role = 'guru'
        `;
        const params = [];

        if (search) {
            query += ' AND (u.nama_lengkap LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY u.nama_lengkap';

        const [guru] = await db.query(query, params);

        // Format: kategori (wali kelas / guru mapel)
        const guruFormatted = guru.map(g => ({
            ...g,
            kategori: g.jumlah_kelas_diampu > 0 ? 'wali_kelas' : 'guru_mapel'
        }));

        // Filter status
        let filtered = guruFormatted;
        if (status === 'wali_kelas') {
            filtered = guruFormatted.filter(g => g.kategori === 'wali_kelas');
        } else if (status === 'guru_mapel') {
            filtered = guruFormatted.filter(g => g.kategori === 'guru_mapel');
        }

        // Statistik
        const totalGuru = guru.length;
        const totalWaliKelas = guruFormatted.filter(g => g.kategori === 'wali_kelas').length;
        const totalGuruMapel = totalGuru - totalWaliKelas;

        res.json({
            success: true,
            data: filtered,
            statistik: {
                total: totalGuru,
                wali_kelas: totalWaliKelas,
                guru_mapel: totalGuruMapel
            }
        });

    } catch (error) {
        console.error('Get all guru error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET DETAIL GURU
// ============================================
exports.getDetailGuru = async (req, res) => {
    try {
        const { id } = req.params;

        const [guru] = await db.query(`
            SELECT 
                u.id,
                u.username,
                u.nama_lengkap,
                u.email,
                u.no_telepon,
                u.foto_profil,
                u.created_at
            FROM users u
            WHERE u.id = ? AND u.role = 'guru'
        `, [id]);

        if (guru.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Guru tidak ditemukan'
            });
        }

        // Kelas yang diampu (kalau wali kelas)
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat,
                   (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid
            FROM kelas k
            WHERE k.wali_kelas_id = ?
        `, [id]);

        // Statistik
        const [statistik] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM perilaku WHERE guru_id = ?) AS total_input_perilaku,
                (SELECT COUNT(*) FROM pengerjaan_misi WHERE divalidasi_oleh = ?) AS total_validasi_misi
        `, [id, id]);

        res.json({
            success: true,
            data: {
                ...guru[0],
                kelas_diampu: kelas.length > 0 ? kelas[0] : null,
                statistik: statistik[0]
            }
        });

    } catch (error) {
        console.error('Get detail guru error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET SEMUA MURID (untuk Kepala Sekolah)
// ============================================
exports.getAllMurid = async (req, res) => {
    try {
        const { search, kelas_id, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                m.id,
                m.nis,
                m.poin_bulan_ini,
                m.poin_tahun_ini,
                u.nama_lengkap,
                u.email,
                u.foto_profil,
                k.nama_kelas,
                k.id AS kelas_id,
                k.tingkat,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hari_absen,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND status IN ('hadir', 'terlambat')
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hadir
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

        query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [murid] = await db.query(query, params);

        // Hitung persentase kehadiran
        const muridFormatted = murid.map(m => ({
            ...m,
            persen_kehadiran: m.total_hari_absen > 0
                ? Math.round((m.total_hadir / m.total_hari_absen) * 100)
                : 0
        }));

        // Total count untuk pagination
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
        const [totalCount] = await db.query(countQuery, countParams);

        // Daftar kelas untuk filter
        const [kelasList] = await db.query(`
            SELECT id, nama_kelas, tingkat FROM kelas ORDER BY tingkat, nama_kelas
        `);

        res.json({
            success: true,
            data: muridFormatted,
            kelas_list: kelasList,
            pagination: {
                total: totalCount[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('Get all murid error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET DETAIL MURID
// ============================================
exports.getDetailMurid = async (req, res) => {
    try {
        const { id } = req.params;

        const [murid] = await db.query(`
            SELECT 
                m.id,
                m.nis,
                m.qr_code,
                m.poin_bulan_ini,
                m.poin_tahun_ini,
                u.nama_lengkap,
                u.email,
                u.foto_profil,
                u.no_telepon,
                k.nama_kelas,
                k.id AS kelas_id,
                k.tingkat,
                wali.nama_lengkap AS wali_kelas_nama
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

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
        `, [id]);

        // Statistik perilaku
        const [perilaku] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) as positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) as negatif
            FROM perilaku
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [id]);

        // Misi selesai
        const [misi] = await db.query(`
            SELECT COUNT(*) as total
            FROM pengerjaan_misi
            WHERE murid_id = ? AND status = 'divalidasi'
        `, [id]);

        res.json({
            success: true,
            data: {
                ...murid[0],
                statistik: {
                    absensi: absensi[0],
                    perilaku: perilaku[0],
                    misi_selesai: misi[0].total
                }
            }
        });

    } catch (error) {
        console.error('Get detail murid error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET SEMUA KELAS (untuk Kepala Sekolah)
// ============================================
exports.getAllKelasKepsek = async (req, res) => {
    try {
        const [kelas] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                k.tingkat,
                k.wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama,
                u.username AS wali_kelas_username,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            ORDER BY k.tingkat, k.nama_kelas
        `);

        const kelasFormatted = kelas.map(k => ({
            ...k,
            rata_poin: parseFloat(k.rata_poin || 0).toFixed(1),
            ada_wali: k.wali_kelas_id ? true : false
        }));

        // Statistik
        const totalKelas = kelas.length;
        const totalMurid = kelasFormatted.reduce((sum, k) => sum + k.jumlah_murid, 0);
        const kelasTanpaWali = kelasFormatted.filter(k => !k.ada_wali).length;

        res.json({
            success: true,
            data: kelasFormatted,
            statistik: {
                total_kelas: totalKelas,
                total_murid: totalMurid,
                kelas_tanpa_wali: kelasTanpaWali
            }
        });

    } catch (error) {
        console.error('Get all kelas kepsek error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET STATISTIK RINGKASAN (untuk Header)
// ============================================
exports.getStatistikRingkasan = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'murid') as total_murid,
                (SELECT COUNT(*) FROM users WHERE role = 'guru') as total_guru,
                (SELECT COUNT(*) FROM kelas) as total_kelas,
                (SELECT COUNT(*) FROM kelas WHERE wali_kelas_id IS NULL) as kelas_tanpa_wali,
                (SELECT AVG(poin_bulan_ini) FROM murid) as rata_poin_sekolah
        `);

        res.json({
            success: true,
            data: {
                ...stats[0],
                rata_poin_sekolah: parseFloat(stats[0].rata_poin_sekolah || 0).toFixed(1)
            }
        });

    } catch (error) {
        console.error('Get statistik ringkasan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
// ============================================
// GET DETAIL KELAS (dengan daftar murid)
// ============================================
exports.getDetailKelasKepsek = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil info kelas
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
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
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

        const kelasData = kelas[0];

        // Ambil daftar murid di kelas
        const [murid] = await db.query(`
            SELECT 
                m.id,
                m.nis,
                m.poin_bulan_ini,
                m.poin_tahun_ini,
                u.nama_lengkap,
                u.email,
                u.foto_profil,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hari_absen,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND status IN ('hadir', 'terlambat')
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hadir
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY u.nama_lengkap
        `, [id]);

        // Hitung persentase kehadiran
        const muridFormatted = murid.map(m => ({
            ...m,
            persen_kehadiran: m.total_hari_absen > 0
                ? Math.round((m.total_hadir / m.total_hari_absen) * 100)
                : 0
        }));

        // Statistik tambahan
        const [statistik] = await db.query(`
            SELECT 
                AVG(poin_bulan_ini) as rata_poin,
                MAX(poin_bulan_ini) as poin_tertinggi,
                MIN(poin_bulan_ini) as poin_terendah
            FROM murid
            WHERE kelas_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                kelas: {
                    ...kelasData,
                    rata_poin: parseFloat(kelasData.rata_poin || 0).toFixed(1)
                },
                murid: muridFormatted,
                statistik: {
                    rata_poin: parseFloat(statistik[0].rata_poin || 0).toFixed(1),
                    poin_tertinggi: statistik[0].poin_tertinggi || 0,
                    poin_terendah: statistik[0].poin_terendah || 0
                }
            }
        });

    } catch (error) {
        console.error('Get detail kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};
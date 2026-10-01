const db = require('../config/database');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// ============================================
// GET STATISTIK DASHBOARD WALI KELAS
// ============================================
exports.getStatistikWaliKelas = async (req, res) => {
    try {
        const guru_id = req.user.id;

        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat
            FROM kelas k
            WHERE k.wali_kelas_id = ?
        `, [guru_id]);

        if (kelas.length === 0) {
            return res.json({
                success: true,
                data: null,
                info: {
                    is_wali_kelas: false,
                    message: 'Anda bukan wali kelas'
                }
            });
        }

        const kelasData = kelas[0];
        const kelasId = kelasData.id;

        const [totalMurid] = await db.query(
            'SELECT COUNT(*) as total FROM murid WHERE kelas_id = ?',
            [kelasId]
        );

        const hariIni = new Date().toISOString().split('T')[0];
        const [kehadiran] = await db.query(`
            SELECT 
                COUNT(*) as total_absen,
                SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) as total_hadir
            FROM absensi a
            JOIN murid m ON a.murid_id = m.id
            WHERE m.kelas_id = ? AND a.tanggal = ?
        `, [kelasId, hariIni]);

        const [perluValidasi] = await db.query(`
            SELECT COUNT(*) as total
            FROM pengerjaan_misi pm
            JOIN murid m ON pm.murid_id = m.id
            WHERE m.kelas_id = ? AND pm.status = 'menunggu'
        `, [kelasId]);

        const [misiAktif] = await db.query(
            'SELECT COUNT(*) as total FROM misi WHERE aktif = TRUE'
        );

        const [muridList] = await db.query(`
            SELECT 
                m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil,
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
        `, [kelasId]);

        const muridDenganPersen = muridList.map(m => {
            const totalHari = parseInt(m.total_hari_absen) || 0;
            const totalHadir = parseInt(m.total_hadir) || 0;
            return {
                ...m,
                persen_kehadiran: totalHari > 0
                    ? Math.round((totalHadir / totalHari) * 100)
                    : 0
            };
        });

        res.json({
            success: true,
            data: {
                kelas: kelasData,
                statistik: {
                    total_murid: parseInt(totalMurid[0].total) || 0,
                    hadir_hari_ini: parseInt(kehadiran[0].total_hadir) || 0,
                    total_absen_hari_ini: parseInt(kehadiran[0].total_absen) || 0,
                    perlu_validasi: parseInt(perluValidasi[0].total) || 0,
                    misi_aktif: parseInt(misiAktif[0].total) || 0
                },
                murid: muridDenganPersen
            },
            info: { is_wali_kelas: true }
        });

    } catch (error) {
        console.error('Get statistik wali kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET MURID DI KELAS WALI KELAS
// ============================================
exports.getMuridKelas = async (req, res) => {
    try {
        const guru_id = req.user.id;

        const [kelas] = await db.query(
            'SELECT id, nama_kelas FROM kelas WHERE wali_kelas_id = ?',
            [guru_id]
        );

        if (kelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda bukan wali kelas'
            });
        }

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY u.nama_lengkap
        `, [kelas[0].id]);

        res.json({
            success: true,
            data: murid,
            kelas: kelas[0]
        });

    } catch (error) {
        console.error('Get murid kelas error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET STATISTIK GLOBAL (untuk guru non-wali)
// ============================================
exports.getStatistikGlobal = async (req, res) => {
    try {
        const [totalMurid] = await db.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'murid'"
        );
        const [totalGuru] = await db.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'guru'"
        );

        const hariIni = new Date().toISOString().split('T')[0];
        const [kehadiran] = await db.query(`
            SELECT 
                COUNT(*) as total_absen,
                SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) as total_hadir
            FROM absensi
            WHERE tanggal = ?
        `, [hariIni]);

        const [misiAktif] = await db.query(
            'SELECT COUNT(*) as total FROM misi WHERE aktif = TRUE'
        );

        const [pelanggaran] = await db.query(`
            SELECT COUNT(*) as total
            FROM perilaku
            WHERE jenis = 'negatif'
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `);

        const { search, kelas_id, limit = 50, offset = 0 } = req.query;

        let muridQuery = `
            SELECT 
                m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.id AS kelas_id,
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
            muridQuery += ' AND (u.nama_lengkap LIKE ? OR m.nis LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (kelas_id) {
            muridQuery += ' AND m.kelas_id = ?';
            params.push(kelas_id);
        }

        muridQuery += ' ORDER BY k.nama_kelas, u.nama_lengkap LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [muridList] = await db.query(muridQuery, params);

        const muridDenganPersen = muridList.map(m => {
            const totalHari = parseInt(m.total_hari_absen) || 0;
            const totalHadir = parseInt(m.total_hadir) || 0;
            return {
                ...m,
                persen_kehadiran: totalHari > 0
                    ? Math.round((totalHadir / totalHari) * 100)
                    : 0
            };
        });

        const [kelasList] = await db.query(
            'SELECT id, nama_kelas, tingkat FROM kelas ORDER BY tingkat, nama_kelas'
        );

        const [totalCount] = await db.query('SELECT COUNT(*) as total FROM murid');

        res.json({
            success: true,
            data: {
                statistik: {
                    total_murid: parseInt(totalMurid[0].total) || 0,
                    total_guru: parseInt(totalGuru[0].total) || 0,
                    hadir_hari_ini: parseInt(kehadiran[0].total_hadir) || 0,
                    total_absen_hari_ini: parseInt(kehadiran[0].total_absen) || 0,
                    misi_aktif: parseInt(misiAktif[0].total) || 0,
                    pelanggaran_bulan_ini: parseInt(pelanggaran[0].total) || 0
                },
                murid: muridDenganPersen,
                kelas_list: kelasList,
                pagination: {
                    total: parseInt(totalCount[0].total) || 0,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });

    } catch (error) {
        console.error('Get statistik global error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET KELAS YANG DIAMPU GURU BK
// ============================================
exports.getKelasGuruBK = async (req, res) => {
    try {
        const guru_bk_id = req.user.id;

        const [kelas] = await db.query(`
            SELECT 
                k.id, k.nama_kelas, k.tingkat,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            WHERE k.guru_bk_id = ?
            ORDER BY k.tingkat, k.nama_kelas
        `, [guru_bk_id]);

        res.json({
            success: true,
            data: kelas.map(k => ({
                ...k,
                rata_poin: parseFloat(k.rata_poin || 0).toFixed(1)
            }))
        });

    } catch (error) {
        console.error('Get kelas guru BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DETAIL KELAS YANG DIAMPU GURU BK
// ============================================
exports.getDetailKelasBK = async (req, res) => {
    try {
        const { id } = req.params;
        const guru_bk_id = req.user.id;

        // Cek kelas ini diampu oleh guru BK yang login
        const [kelas] = await db.query(`
            SELECT 
                k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id,
                u.nama_lengkap AS wali_kelas_nama,
                u.username AS wali_kelas_username,
                u.email AS wali_kelas_email,
                u.no_telepon AS wali_kelas_telepon,
                u.foto_profil AS wali_kelas_foto,
                (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin,
                (SELECT MAX(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS poin_tertinggi,
                (SELECT MIN(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS poin_terendah
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            WHERE k.id = ? AND k.guru_bk_id = ?
        `, [id, guru_bk_id]);

        if (kelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke kelas ini'
            });
        }

        const kelasData = kelas[0];

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.email, u.foto_profil, u.no_telepon,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hari_absen,
                (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id 
                    AND status IN ('hadir', 'terlambat')
                    AND MONTH(tanggal) = MONTH(CURDATE()) 
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_hadir,
                (SELECT COUNT(*) FROM perilaku WHERE murid_id = m.id AND jenis = 'negatif'
                    AND MONTH(tanggal) = MONTH(CURDATE())
                    AND YEAR(tanggal) = YEAR(CURDATE())) as total_pelanggaran,
                (SELECT COUNT(*) FROM pengerjaan_misi WHERE murid_id = m.id AND status = 'divalidasi') as total_misi
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY m.poin_bulan_ini DESC, u.nama_lengkap
        `, [id]);

        const muridFormatted = murid.map(m => {
            const totalHari = parseInt(m.total_hari_absen) || 0;
            const totalHadir = parseInt(m.total_hadir) || 0;
            return {
                ...m,
                persen_kehadiran: totalHari > 0
                    ? Math.round((totalHadir / totalHari) * 100)
                    : 0
            };
        });

        res.json({
            success: true,
            data: {
                kelas: {
                    ...kelasData,
                    rata_poin: parseFloat(kelasData.rata_poin || 0).toFixed(1)
                },
                murid: muridFormatted
            }
        });

    } catch (error) {
        console.error('Get detail kelas BK error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET PROFIL MURID (UNTUK GURU BK)
// ============================================
exports.getProfilMuridBK = async (req, res) => {
    try {
        const { id } = req.params;
        const guru_bk_id = req.user.id;

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
                u.id AS user_id, u.username, u.nama_lengkap, u.email,
                u.no_telepon, u.foto_profil,
                k.id AS kelas_id, k.nama_kelas, k.tingkat, k.guru_bk_id,
                wali.nama_lengkap AS wali_kelas_nama,
                wali.email AS wali_kelas_email,
                wali.no_telepon AS wali_kelas_telepon
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

        const muridData = murid[0];

        // Cek akses: guru BK harus mengampu kelas murid
        if (muridData.guru_bk_id !== guru_bk_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke murid ini'
            });
        }

        const [absensi] = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) AS hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) AS terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) AS izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) AS sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) AS alpa
            FROM absensi
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [id]);

        const [perilaku] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) AS positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) AS negatif
            FROM perilaku
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [id]);

        const [misi] = await db.query(`
            SELECT COUNT(*) AS total FROM pengerjaan_misi
            WHERE murid_id = ? AND status = 'divalidasi'
        `, [id]);

        const [riwayatPerilaku] = await db.query(`
            SELECT 
                p.id, p.jenis, p.kategori, p.deskripsi, p.poin, p.tanggal, p.waktu,
                u.nama_lengkap AS guru_nama
            FROM perilaku p
            JOIN users u ON p.guru_id = u.id
            WHERE p.murid_id = ?
            ORDER BY p.tanggal DESC, p.created_at DESC
            LIMIT 10
        `, [id]);

        const [riwayatBK] = await db.query(`
            SELECT 
                bk.id, bk.judul, bk.kategori, bk.status, bk.created_at,
                up.nama_lengkap AS penerima_nama
            FROM bimbingan_konseling bk
            JOIN users up ON bk.penerima_id = up.id
            WHERE bk.murid_id = ?
            ORDER BY bk.created_at DESC
            LIMIT 5
        `, [id]);

        res.json({
            success: true,
            data: {
                murid: muridData,
                statistik: {
                    absensi: absensi[0],
                    perilaku: perilaku[0],
                    misi_selesai: parseInt(misi[0].total) || 0
                },
                riwayat_perilaku: riwayatPerilaku,
                riwayat_bk: riwayatBK
            }
        });

    } catch (error) {
        console.error('Get profil murid BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET MISI MURID (UNTUK GURU BK)
// ============================================
exports.getMisiMuridBK = async (req, res) => {
    try {
        const { id } = req.params;
        const guru_bk_id = req.user.id;

        const [murid] = await db.query(`
            SELECT m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                   u.nama_lengkap, u.foto_profil,
                   k.nama_kelas, k.tingkat, k.guru_bk_id
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        if (murid[0].guru_bk_id !== guru_bk_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke murid ini'
            });
        }

        const [misiList] = await db.query(`
            SELECT 
                pm.id, pm.status, pm.bukti_foto, pm.catatan_murid, pm.catatan_wali_kelas,
                pm.tanggal_pengerjaan, pm.tanggal_validasi, pm.created_at,
                m.id AS misi_id, m.judul, m.deskripsi, m.poin_reward, m.kategori,
                wali.nama_lengkap AS wali_kelas_nama,
                validator.nama_lengkap AS divalidasi_oleh_nama
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            LEFT JOIN murid mur ON pm.murid_id = mur.id
            LEFT JOIN kelas k ON mur.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users validator ON pm.divalidasi_oleh = validator.id
            WHERE pm.murid_id = ?
            ORDER BY pm.tanggal_pengerjaan DESC, pm.id DESC
        `, [id]);

        const statistik = {
            total: misiList.length,
            divalidasi: misiList.filter(m => m.status === 'divalidasi').length,
            menunggu: misiList.filter(m => m.status === 'menunggu').length,
            ditolak: misiList.filter(m => m.status === 'ditolak').length,
            total_poin_didapat: misiList
                .filter(m => m.status === 'divalidasi')
                .reduce((sum, m) => sum + (parseInt(m.poin_reward) || 0), 0)
        };

        res.json({
            success: true,
            data: { murid: murid[0], misi: misiList, statistik }
        });

    } catch (error) {
        console.error('Get misi murid BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET MISI TERSEDIA
// ============================================
exports.getMisiTersediaBK = async (req, res) => {
    try {
        const { id } = req.params;
        const guru_bk_id = req.user.id;

        const [murid] = await db.query(`
            SELECT m.id, k.guru_bk_id
            FROM murid m
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        if (murid[0].guru_bk_id !== guru_bk_id) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses' });
        }

        const [misiTersedia] = await db.query(`
            SELECT m.id, m.judul, m.deskripsi, m.poin_reward, m.kategori
            FROM misi m
            WHERE m.aktif = TRUE
              AND m.id NOT IN (
                  SELECT misi_id FROM pengerjaan_misi 
                  WHERE murid_id = ? AND status != 'ditolak'
              )
            ORDER BY m.created_at DESC
        `, [id]);

        res.json({ success: true, data: misiTersedia });

    } catch (error) {
        console.error('Get misi tersedia BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET LEADERBOARD KELAS YANG DIAMPU (GURU BK)
// ============================================
exports.getLeaderboardKelasBK = async (req, res) => {
    try {
        const guru_bk_id = req.user.id;

        const [kelasList] = await db.query(`
            SELECT id, nama_kelas, tingkat
            FROM kelas
            WHERE guru_bk_id = ?
            ORDER BY tingkat, nama_kelas
        `, [guru_bk_id]);

        if (kelasList.length === 0) {
            return res.json({
                success: true,
                data: { kelas_list: [], top_murid: [], per_kelas: [] }
            });
        }

        const kelasIds = kelasList.map(k => k.id);
        const placeholders = kelasIds.map(() => '?').join(',');

        const [topMurid] = await db.query(`
            SELECT 
                m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.id AS kelas_id
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.kelas_id IN (${placeholders})
            ORDER BY m.poin_bulan_ini DESC, m.poin_tahun_ini DESC
            LIMIT 10
        `, kelasIds);

        const [perKelas] = await db.query(`
            SELECT 
                k.id, k.nama_kelas, k.tingkat,
                COUNT(m.id) AS jumlah_murid,
                AVG(m.poin_bulan_ini) AS rata_poin,
                MAX(m.poin_bulan_ini) AS poin_tertinggi
            FROM kelas k
            LEFT JOIN murid m ON m.kelas_id = k.id
            WHERE k.id IN (${placeholders})
            GROUP BY k.id, k.nama_kelas, k.tingkat
            ORDER BY rata_poin DESC
        `, kelasIds);

        res.json({
            success: true,
            data: {
                kelas_list: kelasList,
                top_murid: topMurid.map((m, i) => ({ ...m, rank: i + 1 })),
                per_kelas: perKelas.map(k => ({
                    ...k,
                    rata_poin: parseFloat(k.rata_poin || 0).toFixed(1)
                }))
            }
        });

    } catch (error) {
        console.error('Get leaderboard kelas BK error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET KARTU QR MURID KELAS WALI KELAS
// ============================================
exports.getKartuQRKelasWali = async (req, res) => {
    try {
        const guru_id = req.user.id;
        const qrDir = path.join(__dirname, '../../uploads/qrcode');

        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat
            FROM kelas k
            WHERE k.wali_kelas_id = ?
        `, [guru_id]);

        if (kelas.length === 0) {
            return res.json({
                success: true, data: [], kelas: null,
                info: { is_wali_kelas: false, message: 'Anda bukan wali kelas' }
            });
        }

        const kelasData = kelas[0];

        const [murid] = await db.query(`
            SELECT m.id, m.nis, m.qr_code, u.nama_lengkap, u.foto_profil,
                   k.nama_kelas, k.tingkat
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.kelas_id = ?
            ORDER BY u.nama_lengkap
        `, [kelasData.id]);

        const muridWithQR = await Promise.all(
            murid.map(async (m) => {
                try {
                    const qrString = m.qr_code || `MURID-${m.nis}`;
                    const qrDataURL = await QRCode.toDataURL(qrString, {
                        width: 800, margin: 2, errorCorrectionLevel: 'H'
                    });
                    return { ...m, qr_image: qrDataURL };
                } catch (err) {
                    return { ...m, qr_image: null };
                }
            })
        );

        res.json({
            success: true,
            data: muridWithQR,
            kelas: kelasData,
            info: { is_wali_kelas: true, total_murid: murid.length }
        });

    } catch (error) {
        console.error('Get kartu QR kelas wali error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// CEK STATUS QR KELAS WALI
// ============================================
exports.cekStatusQRKelasWali = async (req, res) => {
    try {
        const guru_id = req.user.id;
        const qrDir = path.join(__dirname, '../../uploads/qrcode');

        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas
            FROM kelas k
            WHERE k.wali_kelas_id = ?
        `, [guru_id]);

        if (kelas.length === 0) {
            return res.json({
                success: true,
                data: { is_wali_kelas: false, message: 'Anda bukan wali kelas' }
            });
        }

        const kelasData = kelas[0];

        const [murid] = await db.query(
            'SELECT m.nis FROM murid m WHERE m.kelas_id = ?',
            [kelasData.id]
        );

        let qrAda = 0;
        murid.forEach(m => {
            const qrFile = path.join(qrDir, `qr-${m.nis}.png`);
            if (fs.existsSync(qrFile)) qrAda++;
        });

        res.json({
            success: true,
            data: {
                is_wali_kelas: true,
                kelas: kelasData,
                total_murid: murid.length,
                qr_tergenerate: qrAda,
                qr_belum: murid.length - qrAda,
                siap_cetak: qrAda === murid.length
            }
        });

    } catch (error) {
        console.error('Cek status QR error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
const db = require('../config/database');

// ============================================
// HELPER: Ambil kelas yang boleh diakses berdasarkan role & mode
// ============================================
async function getKelasYangBisaDiakses(user, mode) {
    const { id, role } = user;

    if (role === 'admin' || role === 'kepsek') {
        // Admin & Kepsek: semua kelas
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                   wali.nama_lengkap AS wali_kelas_nama,
                   bk.nama_lengkap AS guru_bk_nama,
                   (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                   (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            ORDER BY k.tingkat, k.nama_kelas
        `);
        return kelas;

    } else if (role === 'guru') {
        // ============================================
        // JIKA MODE = "GURU MAPEL" → semua kelas
        // ============================================
        if (mode === 'guru') {
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                       wali.nama_lengkap AS wali_kelas_nama,
                       bk.nama_lengkap AS guru_bk_nama,
                       (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                       (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
                FROM kelas k
                LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                LEFT JOIN users bk ON k.guru_bk_id = bk.id
                ORDER BY k.tingkat, k.nama_kelas
            `);
            return kelas;
        }

        // ============================================
        // JIKA MODE = "WALI" atau tidak dispesifikasi
        // Cek apakah wali kelas
        // ============================================
        const [kelasWali] = await db.query(
            'SELECT id FROM kelas WHERE wali_kelas_id = ?',
            [id]
        );

        if (kelasWali.length > 0 && mode !== 'guru') {
            // Wali kelas: hanya kelas sendiri
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                       wali.nama_lengkap AS wali_kelas_nama,
                       bk.nama_lengkap AS guru_bk_nama,
                       (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                       (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
                FROM kelas k
                LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                LEFT JOIN users bk ON k.guru_bk_id = bk.id
                WHERE k.wali_kelas_id = ?
                ORDER BY k.tingkat, k.nama_kelas
            `, [id]);
            return kelas;
        } else {
            // Guru mapel murni: semua kelas (read-only)
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                       wali.nama_lengkap AS wali_kelas_nama,
                       bk.nama_lengkap AS guru_bk_nama,
                       (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                       (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
                FROM kelas k
                LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                LEFT JOIN users bk ON k.guru_bk_id = bk.id
                ORDER BY k.tingkat, k.nama_kelas
            `);
            return kelas;
        }

    } else if (role === 'guru_bk') {
        // Guru BK: kelas yang diampu
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                   wali.nama_lengkap AS wali_kelas_nama,
                   bk.nama_lengkap AS guru_bk_nama,
                   (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                   (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            WHERE k.guru_bk_id = ?
            ORDER BY k.tingkat, k.nama_kelas
        `, [id]);
        return kelas;

    } else if (role === 'murid') {
        // Murid: kelas sendiri
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                   wali.nama_lengkap AS wali_kelas_nama,
                   bk.nama_lengkap AS guru_bk_nama,
                   (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                   (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin
            FROM kelas k
            JOIN murid m ON m.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            WHERE m.user_id = ?
        `, [id]);
        return kelas;

    } else if (role === 'orangtua') {
        // Orang tua: kelas anak
        const [kelas] = await db.query(`
            SELECT DISTINCT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                   wali.nama_lengkap AS wali_kelas_nama,
                   bk.nama_lengkap AS guru_bk_nama,
                   (SELECT COUNT(*) FROM murid m2 WHERE m2.kelas_id = k.id) AS jumlah_murid,
                   (SELECT AVG(m2.poin_bulan_ini) FROM murid m2 WHERE m2.kelas_id = k.id) AS rata_poin
            FROM kelas k
            JOIN murid m ON m.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            WHERE m.orangtua_id = ?
        `, [id]);
        return kelas;
    }

    return [];
}

// ============================================
// GET SEMUA KELAS (difilter berdasarkan role & mode)
// ============================================
exports.getAllKelasUniversal = async (req, res) => {
    try {
        const mode = req.query.mode || 'wali'; // default wali
        const kelas = await getKelasYangBisaDiakses(req.user, mode);

        res.json({
            success: true,
            data: kelas.map(k => ({
                ...k,
                rata_poin: parseFloat(k.rata_poin || 0).toFixed(1)
            })),
            role: req.user.role,
            mode
        });

    } catch (error) {
        console.error('Get all kelas universal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DETAIL KELAS (dengan cek akses)
// ============================================
exports.getDetailKelasUniversal = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        const mode = req.query.mode || 'wali';

        // Cek apakah user boleh akses kelas ini
        const kelasBoleh = await getKelasYangBisaDiakses(req.user, mode);
        const bolehAkses = kelasBoleh.some(k => k.id === parseInt(id));

        if (!bolehAkses) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke kelas ini'
            });
        }

        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                   wali.nama_lengkap AS wali_kelas_nama,
                   wali.username AS wali_kelas_username,
                   wali.email AS wali_kelas_email,
                   wali.no_telepon AS wali_kelas_telepon,
                   wali.foto_profil AS wali_kelas_foto,
                   bk.nama_lengkap AS guru_bk_nama,
                   bk.username AS guru_bk_username,
                   bk.email AS guru_bk_email,
                   bk.no_telepon AS guru_bk_telepon,
                   bk.foto_profil AS guru_bk_foto,
                   (SELECT COUNT(*) FROM murid m WHERE m.kelas_id = k.id) AS jumlah_murid,
                   (SELECT AVG(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS rata_poin,
                   (SELECT MAX(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS poin_tertinggi,
                   (SELECT MIN(m.poin_bulan_ini) FROM murid m WHERE m.kelas_id = k.id) AS poin_terendah
            FROM kelas k
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            WHERE k.id = ?
        `, [id]);

        if (kelas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan'
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

        // Cek boleh edit: hanya admin, guru_bk (kelas yang diampu), atau wali kelas
        const canEdit =
            role === 'admin' ||
            (role === 'guru_bk' && kelasData.guru_bk_id === userId) ||
            (role === 'guru' && kelasData.wali_kelas_id === userId && mode !== 'guru');

        res.json({
            success: true,
            data: {
                kelas: {
                    ...kelasData,
                    rata_poin: parseFloat(kelasData.rata_poin || 0).toFixed(1)
                },
                murid: muridFormatted,
                can_edit: canEdit,
                mode
            }
        });

    } catch (error) {
        console.error('Get detail kelas universal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PROFIL MURID (dengan cek akses)
// ============================================
exports.getProfilMuridUniversal = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        const mode = req.query.mode || 'wali';

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
                m.kelas_id, m.orangtua_id,
                u.id AS user_id, u.username, u.nama_lengkap, u.email,
                u.no_telepon, u.foto_profil,
                k.id AS kelas_id, k.nama_kelas, k.tingkat, k.wali_kelas_id, k.guru_bk_id,
                wali.nama_lengkap AS wali_kelas_nama,
                wali.email AS wali_kelas_email,
                wali.no_telepon AS wali_kelas_telepon,
                bk.nama_lengkap AS guru_bk_nama
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            LEFT JOIN users bk ON k.guru_bk_id = bk.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

        const muridData = murid[0];

        let bolehAkses = false;

        if (role === 'admin' || role === 'kepsek') {
            bolehAkses = true;
        } else if (role === 'guru') {
            // Kalau mode "guru mapel" → boleh lihat semua
            if (mode === 'guru') {
                bolehAkses = true;
            } else if (muridData.wali_kelas_id === userId) {
                // Wali kelas → boleh lihat murid di kelasnya
                bolehAkses = true;
            } else {
                // Cek guru mapel murni
                const [kelasWali] = await db.query(
                    'SELECT id FROM kelas WHERE wali_kelas_id = ?',
                    [userId]
                );
                if (kelasWali.length === 0) {
                    bolehAkses = true;
                }
            }
        } else if (role === 'guru_bk') {
            if (muridData.guru_bk_id === userId) {
                bolehAkses = true;
            }
        } else if (role === 'murid') {
            const [muridSendiri] = await db.query(
                'SELECT kelas_id FROM murid WHERE user_id = ?',
                [userId]
            );
            if (muridSendiri.length > 0 && muridSendiri[0].kelas_id === muridData.kelas_id) {
                bolehAkses = true;
            }
        } else if (role === 'orangtua') {
            if (muridData.orangtua_id === userId) {
                bolehAkses = true;
            }
        }

        if (!bolehAkses) {
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

        res.json({
            success: true,
            data: {
                murid: muridData,
                statistik: {
                    absensi: absensi[0],
                    perilaku: perilaku[0],
                    misi_selesai: parseInt(misi[0].total) || 0
                },
                riwayat_perilaku: riwayatPerilaku
            }
        });

    } catch (error) {
        console.error('Get profil murid universal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
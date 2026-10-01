const db = require('../config/database');

// ============================================
// HELPER: Tanggal lokal WIB (YYYY-MM-DD)
// ============================================
function getTanggalLokal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================
// HELPER: Cek akses orang tua ke murid
// ============================================
async function cekAksesAnak(user_id, murid_id) {
    const [cek] = await db.query(
        'SELECT id FROM murid WHERE id = ? AND orangtua_id = ?',
        [murid_id, user_id]
    );
    return cek.length > 0;
}

// ============================================
// GET DASHBOARD ORANG TUA
// ============================================
exports.getDashboardOrangTua = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [anakList] = await db.query(`
            SELECT 
                m.id AS murid_id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini, m.kelas_id,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.tingkat
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.orangtua_id = ?
            ORDER BY k.tingkat, k.nama_kelas
        `, [user_id]);

        if (anakList.length === 0) {
            return res.json({
                success: true,
                data: null,
                info: { has_anak: false, message: 'Anda belum memiliki anak yang terdaftar.' }
            });
        }

        const anak = anakList[0];
        const murid_id = anak.murid_id;

        // Statistik absensi
        const [absensiStats] = await db.query(`
            SELECT 
                COUNT(*) AS total_hari,
                SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) AS total_hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) AS total_terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) AS total_izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) AS total_sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) AS total_alpa
            FROM absensi
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [murid_id]);

        const totalHari = absensiStats[0].total_hari || 0;
        const totalHadir = absensiStats[0].total_hadir || 0;
        const persenKehadiran = totalHari > 0 ? Math.round((totalHadir / totalHari) * 100) : 0;

        // Statistik perilaku
        const [perilakuStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) AS positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) AS negatif
            FROM perilaku
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [murid_id]);

        // Statistik misi
        const [misiStats] = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'divalidasi' THEN 1 ELSE 0 END) AS divalidasi,
                SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) AS menunggu,
                SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) AS ditolak
            FROM pengerjaan_misi
            WHERE murid_id = ?
        `, [murid_id]);

        // Grafik 6 bulan
        const grafikBulanan = [];
        const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const bulan = d.getMonth() + 1;
            const tahun = d.getFullYear();

            const [poinBulan] = await db.query(`
                SELECT COALESCE(SUM(poin_perubahan), 0) AS total
                FROM log_poin
                WHERE murid_id = ?
                AND MONTH(created_at) = ?
                AND YEAR(created_at) = ?
            `, [murid_id, bulan, tahun]);

            grafikBulanan.push({
                bulan: namaBulan[bulan - 1],
                bulan_angka: bulan,
                tahun: tahun,
                poin: 100 + parseInt(poinBulan[0].total || 0)
            });
        }

        // Notifikasi terbaru
        const [notifikasi] = await db.query(`
            (SELECT 
                'absensi' AS tipe, a.id, a.tanggal, a.jam_datang AS waktu,
                a.status, a.poin_didapat AS poin,
                CONCAT('Absensi ', a.status) AS judul, NULL AS deskripsi
            FROM absensi a
            WHERE a.murid_id = ?
            ORDER BY a.tanggal DESC, a.created_at DESC
            LIMIT 5)
            UNION ALL
            (SELECT 
                'perilaku' AS tipe, p.id, p.tanggal, p.waktu,
                p.jenis AS status, p.poin,
                p.deskripsi AS judul, p.kategori AS deskripsi
            FROM perilaku p
            WHERE p.murid_id = ?
            ORDER BY p.tanggal DESC, p.created_at DESC
            LIMIT 5)
            ORDER BY tanggal DESC, waktu DESC
            LIMIT 10
        `, [murid_id, murid_id]);

        res.json({
            success: true,
            data: {
                orangtua: { nama: req.user.nama_lengkap },
                anak: anak,
                semua_anak: anakList,
                statistik: {
                    poin_bulan_ini: anak.poin_bulan_ini,
                    poin_tahun_ini: anak.poin_tahun_ini,
                    persen_kehadiran: persenKehadiran,
                    total_hadir: totalHadir,
                    total_hari: totalHari,
                    total_terlambat: absensiStats[0].total_terlambat || 0,
                    perilaku_positif: perilakuStats[0].positif || 0,
                    perilaku_negatif: perilakuStats[0].negatif || 0,
                    misi_selesai: misiStats[0].divalidasi || 0,
                    misi_menunggu: misiStats[0].menunggu || 0,
                    misi_ditolak: misiStats[0].ditolak || 0
                },
                grafik_bulanan: grafikBulanan,
                notifikasi: notifikasi
            },
            info: { has_anak: true, total_anak: anakList.length }
        });

    } catch (error) {
        console.error('Get dashboard orang tua error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DAFTAR ANAK
// ============================================
exports.getAnakOrangTua = async (req, res) => {
    try {
        const [anakList] = await db.query(`
            SELECT 
                m.id AS murid_id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.tingkat
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.orangtua_id = ?
            ORDER BY k.tingkat, k.nama_kelas
        `, [req.user.id]);

        res.json({ success: true, data: anakList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET ABSENSI ANAK
// ============================================
exports.getAbsensiAnak = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { bulan, tahun } = req.query;

        if (!await cekAksesAnak(req.user.id, murid_id)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const bulanFinal = bulan || new Date().getMonth() + 1;
        const tahunFinal = tahun || new Date().getFullYear();

        const [absensi] = await db.query(`
            SELECT 
                id, tanggal, jam_datang, jam_pulang, status, 
                status_pulang, poin_didapat, poin_pulang, keterangan
            FROM absensi
            WHERE murid_id = ?
            AND MONTH(tanggal) = ?
            AND YEAR(tanggal) = ?
            ORDER BY tanggal DESC
        `, [murid_id, bulanFinal, tahunFinal]);

        const statistik = {
            total: absensi.length,
            hadir: absensi.filter(a => a.status === 'hadir').length,
            terlambat: absensi.filter(a => a.status === 'terlambat').length,
            izin: absensi.filter(a => a.status === 'izin').length,
            sakit: absensi.filter(a => a.status === 'sakit').length,
            alpa: absensi.filter(a => a.status === 'alpa').length,
            persen_kehadiran: absensi.length > 0
                ? Math.round((absensi.filter(a => a.status === 'hadir' || a.status === 'terlambat').length / absensi.length) * 100)
                : 0
        };

        const [murid] = await db.query(`
            SELECT m.id, m.nis, m.poin_bulan_ini, m.poin_tahun_ini,
                   u.nama_lengkap, u.foto_profil, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [murid_id]);

        res.json({
            success: true,
            data: {
                murid: murid[0],
                absensi,
                statistik,
                periode: { bulan: parseInt(bulanFinal), tahun: parseInt(tahunFinal) }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PERILAKU ANAK
// ============================================
exports.getPerilakuAnak = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { bulan, tahun, jenis } = req.query;

        if (!await cekAksesAnak(req.user.id, murid_id)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        let query = `
            SELECT p.*, u.nama_lengkap AS guru_nama
            FROM perilaku p
            JOIN users u ON p.guru_id = u.id
            WHERE p.murid_id = ?
        `;
        const params = [murid_id];

        if (bulan) { query += ' AND MONTH(p.tanggal) = ?'; params.push(bulan); }
        if (tahun) { query += ' AND YEAR(p.tanggal) = ?'; params.push(tahun); }
        if (jenis) { query += ' AND p.jenis = ?'; params.push(jenis); }

        query += ' ORDER BY p.tanggal DESC, p.created_at DESC';

        const [perilaku] = await db.query(query, params);

        // Kelompokkan per kategori
        const perKategori = {};
        perilaku.forEach(p => {
            const key = p.kategori;
            if (!perKategori[key]) {
                perKategori[key] = { kategori: key, jenis: p.jenis, jumlah: 0, total_poin: 0 };
            }
            perKategori[key].jumlah++;
            perKategori[key].total_poin += p.poin;
        });

        const statistik = {
            total: perilaku.length,
            positif: perilaku.filter(p => p.jenis === 'positif').length,
            negatif: perilaku.filter(p => p.jenis === 'negatif').length,
            total_poin_positif: perilaku.filter(p => p.jenis === 'positif').reduce((sum, p) => sum + p.poin, 0),
            total_poin_negatif: perilaku.filter(p => p.jenis === 'negatif').reduce((sum, p) => sum + p.poin, 0)
        };

        res.json({
            success: true,
            data: {
                perilaku,
                statistik,
                per_kategori: Object.values(perKategori)
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET MISI ANAK
// ============================================
exports.getMisiAnak = async (req, res) => {
    try {
        const { murid_id } = req.params;

        if (!await cekAksesAnak(req.user.id, murid_id)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const [misi] = await db.query(`
            SELECT 
                pm.*, m.judul, m.deskripsi, m.poin_reward, m.kategori,
                validator.nama_lengkap AS validator_nama
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            LEFT JOIN users validator ON pm.divalidasi_oleh = validator.id
            WHERE pm.murid_id = ?
            ORDER BY pm.tanggal_pengerjaan DESC
        `, [murid_id]);

        // Misi tersedia (belum diambil)
        const [misiTersedia] = await db.query(`
            SELECT m.id, m.judul, m.deskripsi, m.poin_reward, m.kategori
            FROM misi m
            WHERE m.aktif = TRUE
              AND m.id NOT IN (
                  SELECT misi_id FROM pengerjaan_misi 
                  WHERE murid_id = ? AND status != 'ditolak'
              )
            ORDER BY m.created_at DESC
        `, [murid_id]);

        const statistik = {
            total: misi.length,
            divalidasi: misi.filter(m => m.status === 'divalidasi').length,
            menunggu: misi.filter(m => m.status === 'menunggu').length,
            ditolak: misi.filter(m => m.status === 'ditolak').length,
            total_poin: misi.filter(m => m.status === 'divalidasi').reduce((sum, m) => sum + m.poin_reward, 0),
            progress_persen: misi.length > 0 
                ? Math.round((misi.filter(m => m.status === 'divalidasi').length / misi.length) * 100) 
                : 0
        };

        res.json({
            success: true,
            data: { misi, misi_tersedia: misiTersedia, statistik }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET LEADERBOARD ANAK
// ============================================
exports.getLeaderboardAnak = async (req, res) => {
    try {
        const { murid_id } = req.params;

        const [cek] = await db.query(`
            SELECT m.kelas_id, k.nama_kelas
            FROM murid m
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ? AND m.orangtua_id = ?
        `, [murid_id, req.user.id]);

        if (cek.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const kelas_id = cek[0].kelas_id;

        const [peringkatKelas] = await db.query(`
            SELECT COUNT(*) + 1 AS rank
            FROM murid
            WHERE kelas_id = ? AND poin_bulan_ini > (
                SELECT poin_bulan_ini FROM murid WHERE id = ?
            )
        `, [kelas_id, murid_id]);

        const [totalKelas] = await db.query(
            'SELECT COUNT(*) AS total FROM murid WHERE kelas_id = ?',
            [kelas_id]
        );

        const [top10] = await db.query(`
            SELECT m.id, m.nis, m.poin_bulan_ini,
                   u.nama_lengkap, u.foto_profil
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
            ORDER BY m.poin_bulan_ini DESC
            LIMIT 10
        `, [kelas_id]);

        // Peringkat sekolah
        const [peringkatSekolah] = await db.query(`
            SELECT COUNT(*) + 1 AS rank
            FROM murid
            WHERE poin_bulan_ini > (SELECT poin_bulan_ini FROM murid WHERE id = ?)
        `, [murid_id]);

        const [totalSekolah] = await db.query('SELECT COUNT(*) AS total FROM murid');

        res.json({
            success: true,
            data: {
                peringkat_kelas: peringkatKelas[0].rank,
                total_kelas: totalKelas[0].total,
                peringkat_sekolah: peringkatSekolah[0].rank,
                total_sekolah: totalSekolah[0].total,
                top10,
                kelas: cek[0]
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PROFIL ANAK
// ============================================
exports.getProfilAnak = async (req, res) => {
    try {
        const { murid_id } = req.params;

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
                u.nama_lengkap, u.foto_profil, u.email,
                k.nama_kelas, k.tingkat,
                wali.nama_lengkap AS wali_kelas_nama,
                wali.no_telepon AS wali_kelas_telepon,
                wali.email AS wali_kelas_email,
                wali.foto_profil AS wali_kelas_foto
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN users wali ON k.wali_kelas_id = wali.id
            WHERE m.id = ? AND m.orangtua_id = ?
        `, [murid_id, req.user.id]);

        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        res.json({ success: true, data: murid[0] });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET KONTAK WALI KELAS & GURU BK
// ============================================
exports.getKontakWali = async (req, res) => {
    try {
        const { murid_id } = req.params;

        const [murid] = await db.query(`
            SELECT m.kelas_id, k.nama_kelas, k.wali_kelas_id, k.guru_bk_id
            FROM murid m
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ? AND m.orangtua_id = ?
        `, [murid_id, req.user.id]);

        if (murid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const data = murid[0];

        // Info wali kelas
        let waliKelas = null;
        if (data.wali_kelas_id) {
            const [wali] = await db.query(
                'SELECT id, nama_lengkap, email, no_telepon, foto_profil FROM users WHERE id = ?',
                [data.wali_kelas_id]
            );
            if (wali.length > 0) waliKelas = wali[0];
        }

        // Info guru BK
        let guruBK = null;
        if (data.guru_bk_id) {
            const [bk] = await db.query(
                'SELECT id, nama_lengkap, email, no_telepon, foto_profil FROM users WHERE id = ?',
                [data.guru_bk_id]
            );
            if (bk.length > 0) guruBK = bk[0];
        }

        res.json({
            success: true,
            data: { wali_kelas: waliKelas, guru_bk: guruBK, kelas: data.nama_kelas }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PENGATURAN NOTIFIKASI
// ============================================
exports.getPengaturanNotifikasi = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, notif_wa_aktif, notif_absensi, notif_perilaku, notif_misi FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        res.json({ success: true, data: users[0] });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPDATE PENGATURAN NOTIFIKASI
// ============================================
exports.updatePengaturanNotifikasi = async (req, res) => {
    try {
        const { notif_wa_aktif, notif_absensi, notif_perilaku, notif_misi } = req.body;

        await db.query(`
            UPDATE users 
            SET notif_wa_aktif = ?, notif_absensi = ?, notif_perilaku = ?, notif_misi = ?
            WHERE id = ?
        `, [
            notif_wa_aktif ? 1 : 0,
            notif_absensi ? 1 : 0,
            notif_perilaku ? 1 : 0,
            notif_misi ? 1 : 0,
            req.user.id
        ]);

        res.json({ success: true, message: 'Pengaturan berhasil disimpan' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// KIRIM PESAN KE WALI KELAS / BK
// ============================================
exports.kirimPesan = async (req, res) => {
    try {
        const { murid_id, penerima_id, jenis_penerima, kategori, judul, pesan } = req.body;

        if (!penerima_id || !judul || !pesan) {
            return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
        }

        if (!await cekAksesAnak(req.user.id, murid_id)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Insert ke tabel bimbingan_konseling
        // Karena orang tua bukan murid, kita gunakan murid_id sebagai referensi
        const [result] = await db.query(`
            INSERT INTO bimbingan_konseling 
            (murid_id, penerima_id, jenis_penerima, kategori, judul, pesan, status)
            VALUES (?, ?, ?, ?, ?, ?, 'menunggu')
        `, [murid_id, penerima_id, jenis_penerima || 'wali_kelas', kategori || 'lainnya', judul, pesan]);

        res.status(201).json({
            success: true,
            message: 'Pesan berhasil dikirim',
            data: { id: result.insertId }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET PESAN ORANG TUA
// ============================================
exports.getPesanOrangTua = async (req, res) => {
    try {
        const { murid_id } = req.query;

        if (!await cekAksesAnak(req.user.id, murid_id)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const [pesan] = await db.query(`
            SELECT bk.*, u.nama_lengkap AS penerima_nama
            FROM bimbingan_konseling bk
            JOIN users u ON bk.penerima_id = u.id
            WHERE bk.murid_id = ?
            ORDER BY bk.created_at DESC
        `, [murid_id]);

        res.json({ success: true, data: pesan });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
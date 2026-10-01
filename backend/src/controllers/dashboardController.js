const db = require('../config/database');

// ============================================
// GET STATISTIK DASHBOARD (untuk Admin & Kepsek)
// ============================================
exports.getStatistikDashboard = async (req, res) => {
    try {
        // --------------------------------------------
        // 1. Total Murid
        // --------------------------------------------
        const [totalMuridRow] = await db.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'murid'"
        );
        const totalMurid = parseInt(totalMuridRow[0].total) || 0;

        // --------------------------------------------
        // 2. Total Guru
        // --------------------------------------------
        const [totalGuruRow] = await db.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'guru'"
        );
        const totalGuru = parseInt(totalGuruRow[0].total) || 0;

        // --------------------------------------------
        // 3. Kehadiran Hari Ini (hadir + terlambat dihitung hadir)
        // --------------------------------------------
        const hariIni = new Date().toISOString().split('T')[0];
        const [kehadiran] = await db.query(`
            SELECT 
                COUNT(*) as total_absen,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as total_hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as total_terlambat
            FROM absensi
            WHERE tanggal = ?
        `, [hariIni]);

        const totalAbsen = parseInt(kehadiran[0].total_absen) || 0;
        const totalHadirSaja = parseInt(kehadiran[0].total_hadir) || 0;
        const totalTerlambat = parseInt(kehadiran[0].total_terlambat) || 0;

        // Hitung total hadir = hadir + terlambat
        const totalHadir = totalHadirSaja + totalTerlambat;

        // Persentase = total hadir / total murid × 100
        const persenHadir = totalMurid > 0
            ? Math.round((totalHadir / totalMurid) * 100)
            : 0;

        // --------------------------------------------
        // 4. Pelanggaran Bulan Ini
        // --------------------------------------------
        const [pelanggaran] = await db.query(`
            SELECT COUNT(*) as total
            FROM perilaku
            WHERE jenis = 'negatif'
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `);
        const totalPelanggaran = parseInt(pelanggaran[0].total) || 0;

        // --------------------------------------------
        // 5. Grafik Kehadiran 7 Hari Terakhir
        // --------------------------------------------
        const [grafik] = await db.query(`
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
                DAYNAME(tanggal) as hari,
                COUNT(*) as total_absen,
                SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) as total_hadir
            FROM absensi
            WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY tanggal
            ORDER BY tanggal ASC
            LIMIT 7
        `);

        const hariMap = {
            'Sunday': 'Min', 'Monday': 'Sen', 'Tuesday': 'Sel',
            'Wednesday': 'Rab', 'Thursday': 'Kam', 'Friday': 'Jum', 'Saturday': 'Sab'
        };

        const grafikFormatted = grafik.map(g => {
            const totalAbsenHari = parseInt(g.total_absen) || 0;
            const totalHadirHari = parseInt(g.total_hadir) || 0;
            return {
                tanggal: g.tanggal,
                hari: hariMap[g.hari] || g.hari,
                persen: totalAbsenHari > 0
                    ? Math.round((totalHadirHari / totalAbsenHari) * 100)
                    : 0
            };
        });

        // --------------------------------------------
        // 6. Total Misi Aktif
        // --------------------------------------------
        const [totalMisi] = await db.query(
            "SELECT COUNT(*) as total FROM misi WHERE aktif = TRUE"
        );
        const totalMisiAktif = parseInt(totalMisi[0].total) || 0;

        // --------------------------------------------
        // Response
        // --------------------------------------------
        res.json({
            success: true,
            data: {
                total_murid: totalMurid,
                total_guru: totalGuru,
                kehadiran_hari_ini: persenHadir,
                kehadiran_detail: {
                    total_absen: totalAbsen,
                    total_hadir: totalHadir,
                    total_hadir_saja: totalHadirSaja,
                    total_terlambat: totalTerlambat
                },
                pelanggaran_bulan_ini: totalPelanggaran,
                total_misi_aktif: totalMisiAktif,
                grafik_kehadiran: grafikFormatted
            }
        });

    } catch (error) {
        console.error('Get statistik dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET STATISTIK PER KELAS
// ============================================
exports.getStatistikPerKelas = async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                COUNT(DISTINCT m.id) as total_murid,
                AVG(m.poin_bulan_ini) as rata_poin
            FROM kelas k
            LEFT JOIN murid m ON k.id = m.kelas_id
            GROUP BY k.id, k.nama_kelas
            ORDER BY k.nama_kelas
        `);

        res.json({
            success: true,
            data: data.map(d => ({
                ...d,
                rata_poin: parseFloat(d.rata_poin || 0).toFixed(1)
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
// GET STATISTIK SEKOLAH (untuk Kepala Sekolah)
// ============================================
exports.getStatistikSekolah = async (req, res) => {
    try {
        // 1. Statistik umum
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

        const totalAbsenHariIni = parseInt(kehadiran[0].total_absen) || 0;
        const totalHadirHariIni = parseInt(kehadiran[0].total_hadir) || 0;
        const persenHadir = totalAbsenHariIni > 0
            ? Math.round((totalHadirHariIni / totalAbsenHariIni) * 100)
            : 0;

        const [pelanggaran] = await db.query(`
            SELECT COUNT(*) as total
            FROM perilaku
            WHERE jenis = 'negatif'
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `);

        // 2. Statistik poin sekolah
        const [poinStats] = await db.query(`
            SELECT 
                AVG(poin_bulan_ini) as rata_rata,
                SUM(CASE WHEN poin_bulan_ini > 100 THEN 1 ELSE 0 END) as poin_diatas_100,
                SUM(CASE WHEN poin_bulan_ini < 100 THEN 1 ELSE 0 END) as poin_dibawah_100,
                SUM(CASE WHEN poin_bulan_ini = 100 THEN 1 ELSE 0 END) as poin_pas_100,
                MAX(poin_bulan_ini) as poin_tertinggi,
                MIN(poin_bulan_ini) as poin_terendah
            FROM murid
        `);

        // 3. Misi selesai bulan ini
        const [misiSelesai] = await db.query(`
            SELECT COUNT(*) as total
            FROM pengerjaan_misi
            WHERE status = 'divalidasi'
            AND MONTH(tanggal_validasi) = MONTH(CURDATE())
            AND YEAR(tanggal_validasi) = YEAR(CURDATE())
        `);

        // 4. Leaderboard kelas
        const [leaderboardKelas] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                k.tingkat,
                COUNT(m.id) as jumlah_murid,
                AVG(m.poin_bulan_ini) as rata_rata_poin,
                SUM(m.poin_bulan_ini) as total_poin
            FROM kelas k
            LEFT JOIN murid m ON k.id = m.kelas_id
            GROUP BY k.id, k.nama_kelas, k.tingkat
            HAVING jumlah_murid > 0
            ORDER BY rata_rata_poin DESC
        `);

        const rankedKelas = leaderboardKelas.map((k, i) => ({
            ...k,
            rank: i + 1,
            rata_rata_poin: parseFloat(k.rata_rata_poin || 0).toFixed(1)
        }));

        // 5. Grafik kehadiran 7 hari terakhir
        const [grafik] = await db.query(`
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
                DAYNAME(tanggal) as hari,
                COUNT(*) as total_absen,
                SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) as total_hadir
            FROM absensi
            WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY tanggal
            ORDER BY tanggal ASC
            LIMIT 7
        `);

        const hariMap = {
            'Sunday': 'Min', 'Monday': 'Sen', 'Tuesday': 'Sel',
            'Wednesday': 'Rab', 'Thursday': 'Kam', 'Friday': 'Jum', 'Saturday': 'Sab'
        };

        const grafikFormatted = grafik.map(g => {
            const totalAbsenHari = parseInt(g.total_absen) || 0;
            const totalHadirHari = parseInt(g.total_hadir) || 0;
            return {
                tanggal: g.tanggal,
                hari: hariMap[g.hari] || g.hari,
                persen: totalAbsenHari > 0
                    ? Math.round((totalHadirHari / totalAbsenHari) * 100)
                    : 0
            };
        });

        // 6. Pelanggaran terbanyak bulan ini
        const [pelanggaranTerbanyak] = await db.query(`
            SELECT 
                kategori,
                COUNT(*) as jumlah
            FROM perilaku
            WHERE jenis = 'negatif'
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
            GROUP BY kategori
            ORDER BY jumlah DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                total_murid: parseInt(totalMurid[0].total) || 0,
                total_guru: parseInt(totalGuru[0].total) || 0,
                kehadiran_hari_ini: persenHadir,
                kehadiran_detail: {
                    total_absen: totalAbsenHariIni,
                    total_hadir: totalHadirHariIni
                },
                pelanggaran_bulan_ini: parseInt(pelanggaran[0].total) || 0,
                poin_sekolah: {
                    rata_rata: parseFloat(poinStats[0].rata_rata || 0).toFixed(1),
                    poin_diatas_100: parseInt(poinStats[0].poin_diatas_100) || 0,
                    poin_dibawah_100: parseInt(poinStats[0].poin_dibawah_100) || 0,
                    poin_pas_100: parseInt(poinStats[0].poin_pas_100) || 0,
                    poin_tertinggi: parseInt(poinStats[0].poin_tertinggi) || 0,
                    poin_terendah: parseInt(poinStats[0].poin_terendah) || 0
                },
                misi_selesai_bulan_ini: parseInt(misiSelesai[0].total) || 0,
                leaderboard_kelas: rankedKelas,
                grafik_kehadiran: grafikFormatted,
                pelanggaran_terbanyak: pelanggaranTerbanyak
            }
        });

    } catch (error) {
        console.error('Get statistik sekolah error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET LAPORAN AGREGAT (untuk Kepala Sekolah)
// ============================================
exports.getLaporanAgregat = async (req, res) => {
    try {
        const { jenis = 'bulanan', periode } = req.query;

        const now = new Date();
        const periodeFinal = periode || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let whereClause = '';
        const params = [];

        if (jenis === 'bulanan') {
            whereClause = 'AND DATE_FORMAT(tanggal, "%Y-%m") = ?';
            params.push(periodeFinal);
        } else if (jenis === 'tahunan') {
            whereClause = 'AND YEAR(tanggal) = ?';
            params.push(parseInt(periodeFinal));
        }

        const [absensi] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) as alpa
            FROM absensi
            WHERE 1=1 ${whereClause}
        `, params);

        const [perilaku] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) as positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) as negatif
            FROM perilaku
            WHERE 1=1 ${whereClause}
        `, params);

        const [misi] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'divalidasi' THEN 1 ELSE 0 END) as selesai,
                SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
                SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) as ditolak
            FROM pengerjaan_misi
            WHERE 1=1 ${whereClause.replace('tanggal', 'tanggal_pengerjaan')}
        `, params);

        res.json({
            success: true,
            data: {
                periode: periodeFinal,
                jenis,
                absensi: absensi[0],
                perilaku: perilaku[0],
                misi: misi[0]
            }
        });

    } catch (error) {
        console.error('Get laporan agregat error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// DOWNLOAD LAPORAN AGREGAT (PDF)
// ============================================
exports.downloadLaporanAgregat = async (req, res) => {
    try {
        const { jenis = 'bulanan', periode } = req.query;

        const now = new Date();
        const periodeFinal = periode || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let whereClause = '';
        const params = [];

        if (jenis === 'bulanan') {
            whereClause = 'AND DATE_FORMAT(tanggal, "%Y-%m") = ?';
            params.push(periodeFinal);
        } else if (jenis === 'tahunan') {
            whereClause = 'AND YEAR(tanggal) = ?';
            params.push(parseInt(periodeFinal));
        }

        const [absensi] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) as alpa
            FROM absensi
            WHERE 1=1 ${whereClause}
        `, params);

        const [perilaku] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) as positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) as negatif
            FROM perilaku
            WHERE 1=1 ${whereClause}
        `, params);

        const [misi] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'divalidasi' THEN 1 ELSE 0 END) as selesai,
                SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
                SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) as ditolak
            FROM pengerjaan_misi
            WHERE 1=1 ${whereClause.replace('tanggal', 'tanggal_pengerjaan')}
        `, params);

        const [poinStats] = await db.query(`
            SELECT 
                AVG(poin_bulan_ini) as rata_rata,
                MAX(poin_bulan_ini) as tertinggi,
                MIN(poin_bulan_ini) as terendah
            FROM murid
        `);

        const [leaderboard] = await db.query(`
            SELECT 
                k.nama_kelas,
                AVG(m.poin_bulan_ini) as rata_rata
            FROM kelas k
            LEFT JOIN murid m ON k.id = m.kelas_id
            GROUP BY k.id, k.nama_kelas
            HAVING rata_rata IS NOT NULL
            ORDER BY rata_rata DESC
            LIMIT 10
        `);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        const namaFile = `laporan-sekolah-${jenis}-${periodeFinal}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);

        doc.pipe(res);

        doc.fontSize(14).text('PEMERINTAH KABUPATEN', { align: 'center' });
        doc.fontSize(14).text('DINAS PENDIDIKAN DAN KEBUDAYAAN', { align: 'center' });
        doc.fontSize(18).text('SMP NEGERI 1 GONDANG', { align: 'center' });
        doc.fontSize(10).text('Jl. Pendidikan No. 1, Gondang, Telp. (0355) 123456', { align: 'center' });
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        doc.fontSize(16).text('LAPORAN AGREGAT SEKOLAH', { align: 'center' });
        doc.fontSize(12).text(`Periode: ${periodeFinal}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(14).text('A. STATISTIK ABSENSI', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Total Absensi      : ${absensi[0].total || 0} record`);
        doc.text(`Hadir              : ${absensi[0].hadir || 0}`);
        doc.text(`Terlambat          : ${absensi[0].terlambat || 0}`);
        doc.text(`Izin               : ${absensi[0].izin || 0}`);
        doc.text(`Sakit              : ${absensi[0].sakit || 0}`);
        doc.text(`Alpa               : ${absensi[0].alpa || 0}`);
        doc.moveDown();

        doc.fontSize(14).text('B. STATISTIK PERILAKU', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Perilaku Positif   : ${perilaku[0].positif || 0} kali`);
        doc.text(`Perilaku Negatif   : ${perilaku[0].negatif || 0} kali`);
        doc.moveDown();

        doc.fontSize(14).text('C. STATISTIK MISI', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Misi Divalidasi    : ${misi[0].selesai || 0}`);
        doc.text(`Misi Menunggu      : ${misi[0].menunggu || 0}`);
        doc.text(`Misi Ditolak       : ${misi[0].ditolak || 0}`);
        doc.moveDown();

        doc.fontSize(14).text('D. STATISTIK POIN SEKOLAH', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Rata-rata Poin     : ${parseFloat(poinStats[0].rata_rata || 0).toFixed(1)}`);
        doc.text(`Poin Tertinggi     : ${poinStats[0].tertinggi || 0}`);
        doc.text(`Poin Terendah      : ${poinStats[0].terendah || 0}`);
        doc.moveDown();

        doc.fontSize(14).text('E. LEADERBOARD KELAS (Top 10)', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        leaderboard.forEach((k, i) => {
            doc.text(`${i + 1}. Kelas ${k.nama_kelas} - Rata-rata: ${parseFloat(k.rata_rata || 0).toFixed(1)}`);
        });
        doc.moveDown(2);

        doc.fontSize(11).text(`Gondang, ${new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        })}`, { align: 'right' });
        doc.moveDown();
        doc.text('Kepala Sekolah,', { align: 'right' });
        doc.moveDown(3);
        doc.text('Dr. H. Ahmad, M.Pd', { align: 'right', underline: true });
        doc.text('NIP. 19700101 199001 1 001', { align: 'right' });

        doc.moveDown(3);
        doc.fontSize(8).text(
            `Dicetak dari SIAP PINTAR pada ${new Date().toLocaleString('id-ID')}`,
            { align: 'center' }
        );

        doc.end();

    } catch (error) {
        console.error('Download laporan agregat error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server',
                error: error.message
            });
        }
    }
};
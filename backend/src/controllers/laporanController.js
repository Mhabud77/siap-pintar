// src/controllers/laporanController.js
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate laporan bulanan
exports.generateLaporanBulanan = async (req, res) => {
    try {
        const { murid_id, bulan, tahun } = req.params;

        // Get data murid
        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [murid_id]);

        if (murid.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

        const muridData = murid[0];

        // Get data absensi bulan ini
        const [absensi] = await db.query(`
            SELECT * FROM absensi
            WHERE murid_id = ?
            AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?
            ORDER BY tanggal ASC
        `, [murid_id, bulan, tahun]);

        // Get data perilaku bulan ini
        const [perilaku] = await db.query(`
            SELECT p.*, u.nama_lengkap as guru_nama
            FROM perilaku p
            JOIN users u ON p.guru_id = u.id
            WHERE p.murid_id = ?
            AND MONTH(p.tanggal) = ? AND YEAR(p.tanggal) = ?
            ORDER BY p.tanggal ASC
        `, [murid_id, bulan, tahun]);

        // Get data misi bulan ini
        const [misi] = await db.query(`
            SELECT pm.*, m.judul, m.poin_reward
            FROM pengerjaan_misi pm
            JOIN misi m ON pm.misi_id = m.id
            WHERE pm.murid_id = ?
            AND MONTH(pm.tanggal_pengerjaan) = ? AND YEAR(pm.tanggal_pengerjaan) = ?
            AND pm.status = 'divalidasi'
            ORDER BY pm.tanggal_pengerjaan ASC
        `, [murid_id, bulan, tahun]);

        // Ambil catatan wali kelas
        const periodeStr = `${tahun}-${String(bulan).padStart(2, '0')}`;

        const [catatanWaliKelas] = await db.query(`
            SELECT 
                cwk.*,
                u.nama_lengkap AS wali_kelas_nama
            FROM catatan_wali_kelas cwk
            JOIN users u ON cwk.wali_kelas_id = u.id
            WHERE cwk.murid_id = ? 
                AND cwk.periode = ? 
                AND cwk.jenis = 'bulanan'
        `, [murid_id, periodeStr]);

        // Hitung poin transaksi bulanan
        const poinAbsensi = absensi.reduce((sum, a) => sum + (Number(a.poin_didapat) || 0), 0);
        const poinPerilaku = perilaku.reduce((sum, p) => sum + (Number(p.poin) || 0), 0);
        const poinMisi = misi.reduce((sum, m) => sum + (Number(m.poin_reward) || 0), 0);
        const totalPoinBulanan = 100 + poinAbsensi + poinPerilaku + poinMisi;

        // Ambil total_poin resmi dari tabel murid (atau fallback ke hitungan bulanan)
        const totalPoin = (muridData.total_poin !== undefined && muridData.total_poin !== null)
            ? Number(muridData.total_poin)
            : totalPoinBulanan;

        const statistik = {
            total_hadir: absensi.filter(a => a.status === 'hadir').length,
            total_terlambat: absensi.filter(a => a.status === 'terlambat').length,
            total_izin: absensi.filter(a => a.status === 'izin').length,
            total_sakit: absensi.filter(a => a.status === 'sakit').length,
            total_alpa: absensi.filter(a => a.status === 'alpa').length,
            total_perilaku_positif: perilaku.filter(p => p.jenis === 'positif').length,
            total_perilaku_negatif: perilaku.filter(p => p.jenis === 'negatif').length,
            total_misi: misi.length,
            total_poin: totalPoin
        };

        // Simpan / update database laporan
        const [existing] = await db.query(
            'SELECT id FROM laporan WHERE murid_id = ? AND jenis = ? AND periode = ?',
            [murid_id, 'bulanan', `${tahun}-${bulan}`]
        );

        if (existing.length === 0) {
            await db.query(`
                INSERT INTO laporan (murid_id, jenis, periode, total_poin, total_hadir, total_terlambat, total_izin, total_sakit, total_alpa, perilaku_positif, perilaku_negatif, misi_selesai)
                VALUES (?, 'bulanan', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                murid_id,
                `${tahun}-${bulan}`,
                statistik.total_poin,
                statistik.total_hadir,
                statistik.total_terlambat,
                statistik.total_izin,
                statistik.total_sakit,
                statistik.total_alpa,
                statistik.total_perilaku_positif,
                statistik.total_perilaku_negatif,
                statistik.total_misi
            ]);
        } else {
            await db.query(`
                UPDATE laporan 
                SET total_poin = ?, total_hadir = ?, total_terlambat = ?, total_izin = ?, total_sakit = ?, total_alpa = ?, perilaku_positif = ?, perilaku_negatif = ?, misi_selesai = ?
                WHERE id = ?
            `, [
                statistik.total_poin,
                statistik.total_hadir,
                statistik.total_terlambat,
                statistik.total_izin,
                statistik.total_sakit,
                statistik.total_alpa,
                statistik.total_perilaku_positif,
                statistik.total_perilaku_negatif,
                statistik.total_misi,
                existing[0].id
            ]);
        }

        res.json({
            success: true,
            data: {
                murid: muridData,
                absensi,
                perilaku,
                misi,
                statistik,
                catatan_wali_kelas: catatanWaliKelas.length > 0 ? catatanWaliKelas[0] : null,
                periode: {
                    bulan,
                    tahun,
                    nama_bulan: getNamaBulan(bulan)
                }
            }
        });

    } catch (error) {
        console.error('Generate laporan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Download laporan PDF
exports.downloadLaporanPDF = async (req, res) => {
    try {
        const { murid_id, bulan, tahun } = req.params;

        // Get data laporan
        const [laporan] = await db.query(`
            SELECT l.*, u.nama_lengkap, k.nama_kelas
            FROM laporan l
            JOIN murid m ON l.murid_id = m.id
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE l.murid_id = ? AND l.jenis = 'bulanan' AND l.periode = ?
        `, [murid_id, `${tahun}-${bulan}`]);

        if (laporan.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Laporan tidak ditemukan'
            });
        }

        const data = laporan[0];

        // Generate PDF
        const doc = new PDFDocument();
        const filename = `laporan_${data.nama_lengkap}_${bulan}_${tahun}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('LAPORAN BULANAN MURID', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`SIAP PINTAR - Sistem Informasi Sekolah`, { align: 'center' });
        doc.moveDown();

        // Info murid
        doc.fontSize(14).text('Informasi Murid', { underline: true });
        doc.fontSize(12).text(`Nama: ${data.nama_lengkap}`);
        doc.text(`Kelas: ${data.nama_kelas}`);
        doc.text(`Periode: ${getNamaBulan(bulan)} ${tahun}`);
        doc.moveDown();

        // Statistik
        doc.fontSize(14).text('Statistik', { underline: true });
        doc.fontSize(12).text(`Total Poin: ${data.total_poin}`);
        doc.text(`Hadir: ${data.total_hadir} hari`);
        doc.text(`Terlambat: ${data.total_terlambat} hari`);
        doc.text(`Izin: ${data.total_izin} hari`);
        doc.text(`Sakit: ${data.total_sakit} hari`);
        doc.text(`Alpa: ${data.total_alpa} hari`);
        doc.text(`Perilaku Positif: ${data.perilaku_positif}`);
        doc.text(`Perilaku Negatif: ${data.perilaku_negatif}`);
        doc.text(`Misi Selesai: ${data.misi_selesai}`);
        doc.moveDown();

        // Catatan Wali Kelas
        doc.moveDown();
        doc.fontSize(14).text('E. Catatan Wali Kelas', { underline: true });

        if (data.catatan_wali_kelas) {
            doc.fontSize(11).text(data.catatan_wali_kelas.catatan || '-');
            if (data.catatan_wali_kelas.saran) {
                doc.moveDown(0.5);
                doc.fontSize(10).text('Saran:');
                doc.fontSize(11).text(data.catatan_wali_kelas.saran);
            }
        } else {
            doc.fontSize(11).text('Belum ada catatan untuk periode ini.', { italics: true });
        }

        // Footer
        doc.fontSize(10).text(
            `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
            { align: 'right' }
        );

        doc.end();

    } catch (error) {
        console.error('Download laporan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Helper: Get nama bulan
function getNamaBulan(bulan) {
    const bulanArr = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return bulanArr[parseInt(bulan) - 1];
}

// Get laporan by murid
exports.getLaporanMurid = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { jenis } = req.query;

        let query = 'SELECT * FROM laporan WHERE murid_id = ?';
        const params = [murid_id];

        if (jenis) {
            query += ' AND jenis = ?';
            params.push(jenis);
        }

        query += ' ORDER BY created_at DESC';

        const [laporan] = await db.query(query, params);

        res.json({
            success: true,
            data: laporan
        });

    } catch (error) {
        console.error('Get laporan error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET LAPORAN UNTUK ORANG TUA (OTOMATIS)
// ============================================
exports.getLaporanOrangTua = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { murid_id, bulan, tahun } = req.query;

        // Cek akses
        const [cek] = await db.query(
            'SELECT id FROM murid WHERE id = ? AND orangtua_id = ?',
            [murid_id, user_id]
        );

        if (cek.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Panggil generate laporan bulanan
        req.params = { murid_id, bulan, tahun };
        return exports.generateLaporanBulanan(req, res);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const { auth, authorize } = require('../middleware/auth');

// Absensi Datang & Pulang (QR Code)
router.post('/scan', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.scanQR);
router.post('/scan-pulang', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.scanQRPulang);

// Absensi Manual & Massal (Mendukung body { tipe: 'datang' | 'pulang' })
router.post('/manual', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.absensiManual);
router.post('/massal', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.absensiMassal);

// Get Murid (Mendukung query ?tipe=datang atau ?tipe=pulang)
router.get('/belum-absen', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.getMuridBelumAbsen);

// Informasi & Statistik
router.get('/statistik-hari-ini', auth, absensiController.getStatistikAbsensiHariIni);
router.get('/statistik-detail/:kategori', auth, absensiController.getDetailKategoriAbsensi);
router.get('/hari-ini', auth, absensiController.getAbsensiHariIni);
router.get('/status-jam', auth, absensiController.getStatusJamAbsensi);
router.get('/murid/:murid_id', auth, absensiController.getAbsensiByMurid);

module.exports = router;
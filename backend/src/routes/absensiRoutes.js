const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const { auth, authorize } = require('../middleware/auth');

// Absensi datang
router.post('/scan', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.scanQR);

// Absensi pulang (BARU)
router.post('/scan-pulang', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.scanQRPulang);

// Absensi manual
router.post('/manual', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.absensiManual);
router.get('/belum-absen', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.getMuridBelumAbsen);
router.get('/statistik-hari-ini', auth, absensiController.getStatistikAbsensiHariIni);
router.get('/statistik-detail/:kategori', auth, absensiController.getDetailKategoriAbsensi);

// Umum
router.get('/hari-ini', auth, absensiController.getAbsensiHariIni);
router.get('/murid/:murid_id', auth, absensiController.getAbsensiByMurid);
router.get('/status-jam', auth, absensiController.getStatusJamAbsensi);
router.post('/massal', auth, authorize('admin', 'guru', 'guru_bk'), absensiController.absensiMassal);

module.exports = router;
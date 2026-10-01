const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth, authorize } = require('../middleware/auth');

// Admin
router.get('/statistik', auth, authorize('admin', 'kepsek'), dashboardController.getStatistikDashboard);
router.get('/statistik-kelas', auth, authorize('admin', 'kepsek'), dashboardController.getStatistikPerKelas);

// Kepala Sekolah
router.get('/sekolah', auth, authorize('kepsek', 'admin'), dashboardController.getStatistikSekolah);
router.get('/laporan-agregat', auth, authorize('kepsek', 'admin'), dashboardController.getLaporanAgregat);
router.get('/laporan-agregat/download', auth, authorize('kepsek', 'admin'), dashboardController.downloadLaporanAgregat);

module.exports = router;
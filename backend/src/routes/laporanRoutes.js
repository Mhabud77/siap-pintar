const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');
const { auth, authorize } = require('../middleware/auth');

// Laporan bulanan (semua role login bisa akses)
router.get('/bulanan/:murid_id/:bulan/:tahun', auth, laporanController.generateLaporanBulanan);

// Download PDF
router.get('/download/:murid_id/:bulan/:tahun', auth, laporanController.downloadLaporanPDF);

// Get laporan murid
router.get('/murid/:murid_id', auth, laporanController.getLaporanMurid);

// Khusus orang tua — otomatis
router.get('/orangtua', auth, authorize('orangtua'), laporanController.getLaporanOrangTua);

module.exports = router;
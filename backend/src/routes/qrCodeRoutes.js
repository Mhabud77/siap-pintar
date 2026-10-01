const express = require('express');
const router = express.Router();
const qrCodeController = require('../controllers/qrCodeController');
const { auth, authorize } = require('../middleware/auth');

// ============================================
// SSE ROUTES (harus di atas!)
// ============================================
router.get('/generate-all-stream', auth, authorize('admin'), qrCodeController.generateAllQRStream);
router.get('/generate-kelas-stream/:kelas_id', auth, authorize('admin'), qrCodeController.generateQRPerKelasStream);

// ============================================
// BATCH ROUTES
// ============================================
router.post('/generate-all', auth, authorize('admin'), qrCodeController.generateAllQR);
router.post('/generate-kelas/:kelas_id', auth, authorize('admin'), qrCodeController.generateQRPerKelas);
router.delete('/hapus-semua', auth, authorize('admin'), qrCodeController.hapusSemuaQR);

// ============================================
// UMUM
// ============================================
router.get('/statistik', auth, qrCodeController.getStatistikQR);
router.get('/image/:nis', auth, qrCodeController.getQRImage);
router.get('/kartu-siswa', auth, qrCodeController.getKartuSiswa);

module.exports = router;
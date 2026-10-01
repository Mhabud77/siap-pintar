const express = require('express');
const router = express.Router();
const misiController = require('../controllers/misiController');
const { auth, authorize, isWaliKelas } = require('../middleware/auth');

// ============================================
// PUBLIK (semua role login)
// ============================================
router.get('/aktif', auth, misiController.getMisiAktif);

// ============================================
// KHUSUS MURID
// ============================================
router.post('/ambil', auth, authorize('murid'), misiController.ambilMisi);
router.post('/upload-bukti', auth, authorize('murid'), misiController.uploadBukti);
router.get('/pengerjaan', auth, authorize('murid'), misiController.getPengerjaanMurid);

// ============================================
// KHUSUS WALI KELAS
// ============================================
router.get('/perlu-validasi', auth, authorize('guru'), isWaliKelas, misiController.getPerluValidasi);
router.post('/validasi', auth, authorize('guru'), isWaliKelas, misiController.validasiMisi);

// ============================================
// KHUSUS ADMIN (CRUD Misi)
// ============================================
router.get('/', auth, authorize('admin', 'kepsek'), misiController.getAllMisi);
router.get('/:id', auth, authorize('admin'), misiController.getMisiById);
router.post('/', auth, authorize('admin'), misiController.createMisi);
router.put('/:id', auth, authorize('admin'), misiController.updateMisi);
router.delete('/:id', auth, authorize('admin'), misiController.deleteMisi);
router.patch('/:id/toggle', auth, authorize('admin'), misiController.toggleAktifMisi);

module.exports = router;
const express = require('express');
const router = express.Router();
const konfigurasiController = require('../controllers/konfigurasiController');
const { auth, authorize } = require('../middleware/auth');

// Semua endpoint hanya untuk admin
router.get('/', auth, authorize('admin'), konfigurasiController.getAllKonfigurasi);
router.get('/nilai', auth, konfigurasiController.getNilaiKonfigurasi);
router.get('/kategori/:kategori', auth, authorize('admin'), konfigurasiController.getKonfigurasiByKategori);
router.put('/bulk', auth, authorize('admin'), konfigurasiController.bulkUpdateKonfigurasi);
router.post('/reset', auth, authorize('admin'), konfigurasiController.resetKonfigurasi);
router.put('/:id', auth, authorize('admin'), konfigurasiController.updateKonfigurasi);

module.exports = router;
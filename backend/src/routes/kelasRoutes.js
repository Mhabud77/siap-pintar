const express = require('express');
const router = express.Router();
const kelasController = require('../controllers/kelasController');
const { auth, authorize } = require('../middleware/auth');

// ============================================
// ENDPOINT UNTUK FILTER (SEMUA ROLE)
// WAJIB di atas route '/:id' supaya tidak bentrok
// ============================================
router.get('/untuk-filter', auth, kelasController.getKelasUntukFilter);

// ============================================
// ENDPOINT KHUSUS ADMIN & KEPSEK
// ============================================
router.get('/', auth, authorize('admin', 'kepsek'), kelasController.getAllKelas);
router.get('/guru', auth, authorize('admin'), kelasController.getGuruList);
router.get('/statistik', auth, authorize('admin', 'kepsek'), kelasController.getStatistikKelas);
router.get('/:id', auth, authorize('admin', 'kepsek'), kelasController.getKelasById);
router.put('/:id/wali', auth, authorize('admin'), kelasController.setWaliKelas);

module.exports = router;
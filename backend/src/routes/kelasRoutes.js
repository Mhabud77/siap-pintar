// src/routes/kelasRoutes.js
const express = require('express');
const router = express.Router();
const kelasController = require('../controllers/kelasController');
const { auth, authorize } = require('../middleware/auth');

// PENTING: Route khusus harus ditaruh SEBELUM route /:id
// Ubah '/filter' menjadi '/untuk-filter' agar sesuai dengan panggilan Frontend
router.get('/untuk-filter', auth, kelasController.getKelasUntukFilter);

router.get('/', auth, authorize('admin', 'guru', 'guru_bk', 'wali_kelas', 'orangtua'), kelasController.getAllKelas);
router.get('/:id', auth, kelasController.getKelasById);
router.get('/guru/list', auth, authorize('admin'), kelasController.getGuruList);
router.put('/:id/wali', auth, authorize('admin'), kelasController.setWaliKelas);
router.get('/statistik/semua', auth, kelasController.getStatistikKelas);

module.exports = router;
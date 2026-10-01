const express = require('express');
const router = express.Router();
const rekapAbsensiController = require('../controllers/rekapAbsensiController');
const { auth, authorize } = require('../middleware/auth');

router.get('/kelas', auth, authorize('admin', 'kepsek', 'guru', 'guru_bk'), rekapAbsensiController.getRekapAbsensiKelas);
router.get('/harian', auth, authorize('admin', 'kepsek', 'guru', 'guru_bk'), rekapAbsensiController.getRekapHarian);
router.get('/kelas/export', auth, authorize('admin', 'kepsek', 'guru', 'guru_bk'), rekapAbsensiController.exportRekapExcel);

module.exports = router;
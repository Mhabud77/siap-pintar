const express = require('express');
const router = express.Router();
const bkController = require('../controllers/bkController');
const { auth, authorize } = require('../middleware/auth');

// ============================================
// MURID
// ============================================
router.post('/kirim', auth, authorize('murid'), bkController.kirimPesan);
router.get('/pesan-saya', auth, authorize('murid'), bkController.getPesanMurid);
router.put('/pesan/:id', auth, authorize('murid'), bkController.editPesan);

// ============================================
// GURU & GURU BK
// ============================================
router.get('/pesan-masuk', auth, authorize('guru', 'guru_bk'), bkController.getPesanMasuk);
router.get('/statistik', auth, authorize('guru', 'guru_bk'), bkController.getStatistikBK);
router.get('/laporan', auth, authorize('guru_bk'), bkController.getLaporanBK);

// ============================================
// BERSAMA (MURID, GURU, GURU BK)
// ============================================
router.get('/pesan/:id', auth, bkController.getDetailPesan);
router.delete('/pesan/:id', auth, bkController.hapusPesan);
router.post('/pesan/:id/balas', auth, bkController.tambahBalasan);
router.put('/balasan/:balasan_id', auth, bkController.editBalasan);
router.delete('/balasan/:balasan_id', auth, bkController.hapusBalasan);
router.put('/status/:id', auth, authorize('guru', 'guru_bk'), bkController.updateStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const waliKelasController = require('../controllers/waliKelasController');
const { auth, authorize } = require('../middleware/auth');

// ============================================
// WALI KELAS (role: guru)
// ============================================
router.get('/statistik', auth, authorize('guru'), waliKelasController.getStatistikWaliKelas);
router.get('/murid', auth, authorize('guru'), waliKelasController.getMuridKelas);
router.get('/kartu-qr-kelas', auth, authorize('guru'), waliKelasController.getKartuQRKelasWali);
router.get('/cek-status-qr', auth, authorize('guru'), waliKelasController.cekStatusQRKelasWali);

// ============================================
// GURU NON-WALI (role: guru)
// ============================================
router.get('/statistik-global', auth, authorize('guru', 'guru_bk'), waliKelasController.getStatistikGlobal);

// ============================================
// GURU BK (role: guru_bk)
// ============================================
router.get('/kelas-bk', auth, authorize('guru_bk'), waliKelasController.getKelasGuruBK);
router.get('/leaderboard-bk', auth, authorize('guru_bk'), waliKelasController.getLeaderboardKelasBK);
router.get('/kelas-bk/:id', auth, authorize('guru_bk'), waliKelasController.getDetailKelasBK);
router.get('/profil-murid-bk/:id', auth, authorize('guru_bk'), waliKelasController.getProfilMuridBK);
router.get('/misi-murid-bk/:id', auth, authorize('guru_bk'), waliKelasController.getMisiMuridBK);
router.get('/misi-tersedia-bk/:id', auth, authorize('guru_bk'), waliKelasController.getMisiTersediaBK);

module.exports = router;
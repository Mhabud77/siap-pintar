const express = require('express');
const router = express.Router();
const orangtuaController = require('../controllers/orangtuaController');
const { auth, authorize } = require('../middleware/auth');

router.get('/dashboard', auth, authorize('orangtua'), orangtuaController.getDashboardOrangTua);
router.get('/anak', auth, authorize('orangtua'), orangtuaController.getAnakOrangTua);

// Detail anak
router.get('/absensi/:murid_id', auth, authorize('orangtua'), orangtuaController.getAbsensiAnak);
router.get('/perilaku/:murid_id', auth, authorize('orangtua'), orangtuaController.getPerilakuAnak);
router.get('/misi/:murid_id', auth, authorize('orangtua'), orangtuaController.getMisiAnak);
router.get('/leaderboard/:murid_id', auth, authorize('orangtua'), orangtuaController.getLeaderboardAnak);
router.get('/profil/:murid_id', auth, authorize('orangtua'), orangtuaController.getProfilAnak);
router.get('/kontak/:murid_id', auth, authorize('orangtua'), orangtuaController.getKontakWali);

// Pengaturan notifikasi
router.get('/pengaturan', auth, authorize('orangtua'), orangtuaController.getPengaturanNotifikasi);
router.put('/pengaturan', auth, authorize('orangtua'), orangtuaController.updatePengaturanNotifikasi);

// Pesan
router.post('/pesan', auth, authorize('orangtua'), orangtuaController.kirimPesan);
router.get('/pesan', auth, authorize('orangtua'), orangtuaController.getPesanOrangTua);

module.exports = router;
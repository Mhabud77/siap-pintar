const express = require('express');
const router = express.Router();
const adminDataController = require('../controllers/adminDataController');
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ============================================
// DATA GURU
// ============================================
router.get('/guru', auth, authorize('admin'), adminDataController.getAllGuru);
router.post('/guru', auth, authorize('admin'), upload.single('foto_profil'), adminDataController.createGuru);
router.put('/guru/:id', auth, authorize('admin'), upload.single('foto_profil'), adminDataController.updateGuru);
router.delete('/guru/:id', auth, authorize('admin'), adminDataController.deleteGuru);

// ============================================
// DATA MURID
// ============================================
router.get('/murid', auth, authorize('admin'), adminDataController.getAllMuridAdmin);
router.post('/murid', auth, authorize('admin'), upload.single('foto_profil'), adminDataController.createMurid);
router.put('/murid/:id', auth, authorize('admin'), upload.single('foto_profil'), adminDataController.updateMurid);
router.delete('/murid/:id', auth, authorize('admin'), adminDataController.deleteMurid);

// ============================================
// DATA KELAS
// ============================================
router.get('/kelas', auth, authorize('admin'), adminDataController.getAllKelasAdmin);
router.post('/kelas', auth, authorize('admin'), adminDataController.createKelas);
router.put('/kelas/:id', auth, authorize('admin'), adminDataController.updateKelas);
router.delete('/kelas/:id', auth, authorize('admin'), adminDataController.deleteKelas);

module.exports = router;
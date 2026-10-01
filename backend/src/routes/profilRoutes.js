const express = require('express');
const router = express.Router();
const profilController = require('../controllers/profilController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Semua route butuh login
router.get('/', auth, profilController.getProfil);
router.put('/', auth, profilController.updateProfil);
router.put('/foto', auth, upload.single('foto_profil'), profilController.uploadFotoProfil);
router.delete('/foto', auth, profilController.hapusFotoProfil);
router.post('/ganti-password', auth, profilController.gantiPassword);

module.exports = router;
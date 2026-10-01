const express = require('express');
const router = express.Router();
const dataKelasController = require('../controllers/dataKelasController');
const { auth } = require('../middleware/auth');

// Semua role login bisa akses (difilter di controller berdasarkan role)
router.get('/', auth, dataKelasController.getAllKelasUniversal);
router.get('/:id', auth, dataKelasController.getDetailKelasUniversal);
router.get('/murid/:id/profil', auth, dataKelasController.getProfilMuridUniversal);

module.exports = router;
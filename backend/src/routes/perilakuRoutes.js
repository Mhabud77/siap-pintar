// src/routes/perilakuRoutes.js
const express = require('express');
const router = express.Router();
const perilakuController = require('../controllers/perilakuController');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('admin', 'guru', 'guru_bk'), perilakuController.catatPerilaku);
router.get('/kategori', auth, perilakuController.getKategoriPerilaku);
router.get('/murid/:murid_id', auth, perilakuController.getPerilakuMurid);

module.exports = router;
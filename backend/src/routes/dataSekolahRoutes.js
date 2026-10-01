const express = require('express');
const router = express.Router();
const dataSekolahController = require('../controllers/dataSekolahController');
const { auth, authorize } = require('../middleware/auth');

const allowedRoles = ['kepsek', 'admin'];

router.get('/guru', auth, authorize(...allowedRoles), dataSekolahController.getAllGuru);
router.get('/guru/:id', auth, authorize(...allowedRoles), dataSekolahController.getDetailGuru);
router.get('/murid', auth, authorize(...allowedRoles), dataSekolahController.getAllMurid);
router.get('/murid/:id', auth, authorize(...allowedRoles), dataSekolahController.getDetailMurid);
router.get('/kelas', auth, authorize(...allowedRoles), dataSekolahController.getAllKelasKepsek);
router.get('/kelas/:id', auth, authorize(...allowedRoles), dataSekolahController.getDetailKelasKepsek);
router.get('/ringkasan', auth, authorize(...allowedRoles), dataSekolahController.getStatistikRingkasan);

module.exports = router;
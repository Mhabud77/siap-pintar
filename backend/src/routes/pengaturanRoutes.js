const express = require('express');
const router = express.Router();
const pengaturanController = require('../controllers/pengaturanController');
const { auth, authorize } = require('../middleware/auth');

router.get('/absensi', auth, authorize('admin'), pengaturanController.getPengaturanAbsensi);
router.put('/absensi', auth, authorize('admin'), pengaturanController.updatePengaturanAbsensi);

module.exports = router;
const express = require('express');
const router = express.Router();
const downloadUserController = require('../controllers/downloadUserController');
const { auth, authorize } = require('../middleware/auth');

// Semua endpoint khusus admin
router.get('/preview', auth, authorize('admin'), downloadUserController.previewDataUser);
router.get('/csv', auth, authorize('admin'), downloadUserController.downloadCSV);
router.get('/excel', auth, authorize('admin'), downloadUserController.downloadExcel);

module.exports = router;
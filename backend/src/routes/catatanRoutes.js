const express = require('express');
const router = express.Router();
const catatanController = require('../controllers/catatanController');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, catatanController.getCatatan);
router.get('/kelas', auth, authorize('guru'), catatanController.getCatatanKelas);
router.get('/murid/:murid_id', auth, catatanController.getCatatanByMurid);
router.post('/', auth, authorize('guru'), catatanController.saveCatatan);
router.delete('/:id', auth, authorize('guru'), catatanController.deleteCatatan);

module.exports = router;
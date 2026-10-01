const express = require('express');
const router = express.Router();
const muridController = require('../controllers/muridController');
const { auth } = require('../middleware/auth');

router.get('/', auth, muridController.getAllMurid);
router.get('/kelas', auth, muridController.getAllKelas);
router.get('/:id', auth, muridController.getMuridById);
router.get('/:id', auth, muridController.getMuridById);

module.exports = router;
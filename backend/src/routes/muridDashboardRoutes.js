const express = require('express');
const router = express.Router();
const muridDashboardController = require('../controllers/muridDashboardController');
const { auth, authorize } = require('../middleware/auth');

router.get('/dashboard', auth, authorize('murid'), muridDashboardController.getDashboardMurid);
router.get('/kelas', auth, authorize('murid'), muridDashboardController.getKelasMurid);
router.get('/guru-bk', auth, muridDashboardController.getGuruBK);

module.exports = router;
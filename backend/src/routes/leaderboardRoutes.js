const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { auth } = require('../middleware/auth');

router.get('/', auth, leaderboardController.getLeaderboard);
router.get('/top3', auth, leaderboardController.getTop3);
router.get('/periods', auth, leaderboardController.getAvailablePeriods);
router.get('/kelas', auth, leaderboardController.getLeaderboardKelas);
router.get('/statistik-murid', auth, leaderboardController.getStatistikMurid);

module.exports = router;
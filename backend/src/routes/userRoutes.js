const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin'), userController.getAllUsers);
router.get('/:id', auth, authorize('admin'), userController.getUserById);
router.post('/', auth, authorize('admin'), userController.createUser);
router.put('/:id', auth, authorize('admin'), userController.updateUser);
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

// BARU — Reset Password
router.post('/:id/reset-password', auth, authorize('admin'), userController.resetPassword);
router.get('/:id/password-history', auth, authorize('admin'), userController.getPasswordHistory);

module.exports = router;
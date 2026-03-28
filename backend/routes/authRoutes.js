const express = require('express');
const router = express.Router();
const { register, login, resetFirstPassword, resetPasswordWithPan } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/reset-first-password', protect, resetFirstPassword);
router.post('/forgot-password', resetPasswordWithPan);

module.exports = router;

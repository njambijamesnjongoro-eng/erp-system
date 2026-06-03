const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const loginSchema = {
  body: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 6 },
  },
};

const registerSchema = {
  body: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 12, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, message: 'Password must be 12+ chars with uppercase, lowercase, number, and special character' },
    roleId: { required: true },
    profile: { required: true },
    'profile.fullName': { required: true, type: 'string', minLength: 2 },
  },
};

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.post('/mfa-verify', authController.verifyMFA);

module.exports = router;

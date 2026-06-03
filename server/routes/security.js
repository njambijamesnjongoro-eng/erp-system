const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.get('/captcha', ctrl.generateCaptcha);
router.post('/captcha/verify', ctrl.verifyCaptcha);

router.use(authenticate);

router.get('/sessions', ctrl.getSessions);
router.delete('/sessions/:id', ctrl.terminateSession);
router.post('/sessions/terminate-all', ctrl.terminateAllSessions);

router.get('/devices', ctrl.getDevices);
router.delete('/devices/:id', ctrl.removeDevice);

router.get('/events', ctrl.getSecurityEvents);

router.get('/dashboard/stats', ctrl.getSecurityDashboardStats);

module.exports = router;

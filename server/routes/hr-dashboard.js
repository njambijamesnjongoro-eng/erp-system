const router = require('express').Router();
const ctrl = require('../controllers/hrDashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/overview', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), ctrl.getOverview);

module.exports = router;

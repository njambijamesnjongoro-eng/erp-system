const router = require('express').Router();
const ctrl = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/tasks/:employeeId', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.getTasks);
router.post('/tasks', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.createTask);
router.patch('/tasks/:id/complete', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.completeTask);
router.delete('/tasks/:id', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.removeTask);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/trainingController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/programs', ctrl.listPrograms);
router.post('/programs', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.createProgram);
router.get('/employee-training', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Employee'), ctrl.listEmployeeTraining);
router.post('/employee-training', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.createEmployeeTraining);
router.put('/employee-training/:id', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.updateEmployeeTraining);
router.get('/certifications', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Employee'), ctrl.listCertifications);
router.post('/certifications', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.createCertification);

module.exports = router;

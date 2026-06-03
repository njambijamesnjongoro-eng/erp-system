const router = require('express').Router();
const controller = require('../../controllers/admin/backupController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('backup_management', 'read'), controller.getBackups);
router.get('/stats', authorize('backup_management', 'read'), controller.getBackupStats);
router.get('/schedules', authorize('backup_management', 'read'), controller.getSchedules);
router.post('/', authorize('backup_management', 'create'), controller.createBackup);
router.post('/schedules', authorize('backup_management', 'create'), controller.createSchedule);
router.post('/:id/restore', authorize('backup_management', 'create'), controller.restoreBackup);
router.post('/:id/verify', authorize('backup_management', 'update'), controller.verifyBackup);
router.get('/:id', authorize('backup_management', 'read'), controller.getBackupById);
router.put('/schedules/:id', authorize('backup_management', 'update'), controller.updateSchedule);
router.delete('/:id', authorize('backup_management', 'delete'), controller.deleteBackup);
router.delete('/schedules/:id', authorize('backup_management', 'delete'), controller.deleteSchedule);
router.post('/schedules/:id/run', authorize('backup_management', 'create'), controller.runScheduledBackup);

module.exports = router;

const router = require('express').Router();
const controller = require('../../controllers/analytics/reportController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/definitions', authorize('reports', 'read'), controller.getReportDefinitions);
router.get('/', authorize('reports', 'read'), controller.getReports);
router.get('/schedules', authorize('reports', 'read'), controller.getSchedules);
router.get('/templates', authorize('email_templates', 'read'), controller.getTemplates);
router.get('/email-logs', authorize('email_templates', 'read'), controller.getEmailLogs);
router.post('/generate', authorize('reports', 'create'), controller.generateReport);
router.post('/schedules', authorize('reports', 'create'), controller.createSchedule);
router.post('/templates', authorize('email_templates', 'create'), controller.createTemplate);
router.post('/send-email', authorize('email_templates', 'create'), controller.sendEmail);
router.get('/:id', authorize('reports', 'read'), controller.getReportById);
router.get('/templates/:id', authorize('email_templates', 'read'), controller.getTemplateById);
router.put('/schedules/:id', authorize('reports', 'update'), controller.updateSchedule);
router.put('/templates/:id', authorize('email_templates', 'update'), controller.updateTemplate);
router.delete('/:id', authorize('reports', 'delete'), controller.deleteReport);
router.delete('/schedules/:id', authorize('reports', 'delete'), controller.deleteSchedule);
router.delete('/templates/:id', authorize('email_templates', 'delete'), controller.deleteTemplate);

module.exports = router;

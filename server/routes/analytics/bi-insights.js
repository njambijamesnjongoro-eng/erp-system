const router = require('express').Router();
const controller = require('../../controllers/analytics/biController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('bi_insights', 'read'), controller.getInsights);
router.get('/recommendations', authorize('bi_insights', 'read'), controller.getRecommendations);
router.post('/generate', authorize('bi_insights', 'create'), controller.generateInsights);
router.put('/:id/dismiss', authorize('bi_insights', 'update'), controller.dismissInsight);
router.put('/:id/resolve', authorize('bi_insights', 'update'), controller.resolveInsight);

module.exports = router;

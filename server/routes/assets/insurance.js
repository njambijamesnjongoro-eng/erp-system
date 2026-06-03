const router = require('express').Router();
const controller = require('../../controllers/assets/insuranceController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('asset_insurance', 'read'), controller.list);
router.get('/expiring', authenticate, authorize('asset_insurance', 'read'), controller.getExpiring);
router.get('/claims', authenticate, authorize('insurance_claims', 'read'), controller.listClaims);
router.get('/:id', authenticate, authorize('asset_insurance', 'read'), controller.getById);
router.post('/', authenticate, authorize('asset_insurance', 'create'), controller.create);
router.put('/:id', authenticate, authorize('asset_insurance', 'update'), controller.update);
router.post('/:id/claims', authenticate, authorize('insurance_claims', 'create'), controller.createClaim);
router.patch('/:id/claims/:claimId', authenticate, authorize('insurance_claims', 'update'), controller.updateClaim);

module.exports = router;

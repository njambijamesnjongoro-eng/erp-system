const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/companiesController');

router.get('/stats', authenticate, authorize('companies', 'read'), ctrl.getMultiCompanyStats);
router.get('/', authenticate, authorize('companies', 'read'), ctrl.getCompanies);
router.get('/:id', authenticate, authorize('companies', 'read'), ctrl.getCompanyById);
router.post('/', authenticate, authorize('companies', 'create'), ctrl.createCompany);
router.put('/:id', authenticate, authorize('companies', 'update'), ctrl.updateCompany);
router.patch('/:id/toggle', authenticate, authorize('companies', 'update'), ctrl.toggleCompany);
router.delete('/:id', authenticate, authorize('companies', 'delete'), ctrl.deleteCompany);

module.exports = router;

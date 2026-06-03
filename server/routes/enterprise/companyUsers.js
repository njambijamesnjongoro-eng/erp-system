const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/companyUsersController');

router.get('/', authenticate, authorize('company_users', 'read'), ctrl.getCompanyUsers);
router.post('/', authenticate, authorize('company_users', 'create'), ctrl.assignUserToCompany);
router.delete('/:id', authenticate, authorize('company_users', 'delete'), ctrl.removeUserFromCompany);

module.exports = router;

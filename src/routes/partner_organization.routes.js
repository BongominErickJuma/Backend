const express = require('express');
const orgController = require('../controllers/partner_organizations.controller');
const loginAuthController = require('../controllers/auth/loginAuth.controller');
const authController = require('../controllers/auth.controller');
const inventoryRoutes = require('./inventory.route');
const partnerUserRoutes = require('./partner_user.routes');
const {
  uploadVerificationDocuments,
  resizeVerificationDocuments
} = require('../middlewares/uploadOrganizationDocuments');
const router = express.Router();

router.post(
  '/',
  uploadVerificationDocuments,
  resizeVerificationDocuments,
  orgController.addOrganization
);
router.post('/login', loginAuthController.loginOrg);
router.get('/logout', authController.logout);
router.get('/partners', orgController.getPartners);

// Login Organization Users

router.post('/login/users', loginAuthController.loginPartnerUser);

router.use(authController.protect);
router.use(authController.restrictTo('partner_organizations'));

// Partner Organization User Routes

router.use('/users', partnerUserRoutes);
router.use('/:orgId/users', partnerUserRoutes);

// Partner Inventories

router.use('/inventories', inventoryRoutes);
router.use('/:orgId/inventories', inventoryRoutes);

// router.post('changePassword', orgController.changeOrgPassword);

router.route('/').get(orgController.getAllOrganizations);

// my organization
router.get('/myOrg', orgController.getMyOrganization);

router
  .route('/:id')
  .get(orgController.getOneOrganization)
  .delete(orgController.deleteOrganization)
  .patch(
    uploadVerificationDocuments,
    resizeVerificationDocuments,
    orgController.updateOrganization
  );

module.exports = router;

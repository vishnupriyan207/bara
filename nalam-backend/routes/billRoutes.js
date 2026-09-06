const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createBillSchema } = require('../validators/billValidator');
const { z } = require('zod');
const { objectIdSchema } = require('../validators/common');

const patientIdParam = z.object({ patientId: objectIdSchema });

// Pharmacy billing: optional auth allows guest/offline checkout while attaching user if authenticated
router.post('/', optionalAuthenticate, validateBody(createBillSchema), billController.createPharmacyBill);
router.get('/', optionalAuthenticate, billController.getBills);
router.get('/today', optionalAuthenticate, billController.getTodayBills);
router.get('/patient/:patientId', authenticate, validateParams(patientIdParam), billController.getBillsByPatient);
router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), billController.getBillById);
router.post('/:id/cancel', authenticate, requireRole('pharmacy', 'admin'), validateParams(idParamSchema), billController.cancelBill);

module.exports = router;

const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createPrescriptionSchema } = require('../validators/prescriptionValidator');
const { z } = require('zod');
const { objectIdSchema } = require('../validators/common');

const patientIdParam = z.object({ patientId: objectIdSchema });

router.post('/', optionalAuthenticate, validateBody(createPrescriptionSchema), prescriptionController.createPrescription);
router.get('/active', authenticate, requireRole('pharmacy', 'doctor', 'admin'), prescriptionController.getActivePrescriptions);
router.get('/patient/:patientId', authenticate, validateParams(patientIdParam), prescriptionController.getPrescriptionsByPatient);
router.get('/:id', authenticate, validateParams(idParamSchema), prescriptionController.getPrescriptionById);

module.exports = router;

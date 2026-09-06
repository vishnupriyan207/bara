const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createMedicalRecordSchema, updateMedicalRecordSchema } = require('../validators/medicalRecordValidator');
const { z } = require('zod');
const { objectIdSchema } = require('../validators/common');

const patientIdParam = z.object({ patientId: objectIdSchema });

router.post('/', authenticate, requireRole('doctor', 'admin'), validateBody(createMedicalRecordSchema), medicalRecordController.createMedicalRecord);
router.get('/:id', authenticate, validateParams(idParamSchema), medicalRecordController.getMedicalRecordById);
router.get('/patient/:patientId', authenticate, validateParams(patientIdParam), medicalRecordController.getRecordsByPatient);
router.patch('/:id', authenticate, requireRole('doctor', 'admin'), validateParams(idParamSchema), validateBody(updateMedicalRecordSchema), medicalRecordController.updateMedicalRecord);

module.exports = router;

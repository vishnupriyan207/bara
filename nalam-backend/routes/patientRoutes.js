const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createPatientSchema, updatePatientSchema } = require('../validators/patientValidator');

router.post('/', optionalAuthenticate, validateBody(createPatientSchema), patientController.createPatient);
router.get('/me', authenticate, patientController.getMyProfile);
router.get('/', authenticate, requireRole('doctor', 'admin', 'pharmacy'), patientController.listPatients);
router.get('/:id', authenticate, validateParams(idParamSchema), patientController.getPatientById);
router.patch('/:id', authenticate, validateParams(idParamSchema), validateBody(updatePatientSchema), patientController.updatePatient);

module.exports = router;

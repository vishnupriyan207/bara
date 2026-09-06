const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateParams, idParamSchema } = require('../validators/common');

router.get('/', doctorController.getDoctors);
router.get('/:id', validateParams(idParamSchema), doctorController.getDoctorById);
router.post('/', authenticate, requireRole('admin'), doctorController.createDoctor);
router.patch('/:id', authenticate, requireRole('admin', 'doctor'), validateParams(idParamSchema), doctorController.updateDoctor);

module.exports = router;

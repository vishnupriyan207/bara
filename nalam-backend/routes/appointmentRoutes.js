const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createAppointmentSchema, updateAppointmentSchema } = require('../validators/appointmentValidator');
const { z } = require('zod');
const { objectIdSchema } = require('../validators/common');

const patientIdParam = z.object({ patientId: objectIdSchema });
const doctorIdParam = z.object({ doctorId: objectIdSchema });

router.post('/', optionalAuthenticate, validateBody(createAppointmentSchema), appointmentController.createAppointment);
router.get('/', authenticate, appointmentController.getAppointments);
router.get('/today', authenticate, appointmentController.getTodayAppointments);
router.get('/patient/:patientId', authenticate, validateParams(patientIdParam), appointmentController.getAppointmentsByPatient);
router.get('/doctor/:doctorId', authenticate, validateParams(doctorIdParam), appointmentController.getAppointmentsByDoctor);
router.get('/:id', authenticate, validateParams(idParamSchema), appointmentController.getAppointmentById);
router.patch('/:id', authenticate, validateParams(idParamSchema), validateBody(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/:id', authenticate, validateParams(idParamSchema), appointmentController.deleteAppointment);

module.exports = router;

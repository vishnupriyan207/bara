const { z } = require('zod');
const { objectIdSchema } = require('./common');

const createAppointmentSchema = z.object({
  patientId: objectIdSchema.optional(),
  // Supports quick booking directly with patient details
  patientName: z.string().min(2).optional(),
  patientAge: z.union([z.number(), z.string()]).optional(),
  patientPhone: z.string().min(7).optional(),
  doctorId: objectIdSchema.optional(),
  appointmentDate: z.string().or(z.date()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(1, 'Reason for appointment is required'),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  status: z.enum(['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show']).default('waiting'),
  notes: z.string().optional().default('')
});

const updateAppointmentSchema = z.object({
  doctorId: objectIdSchema.optional(),
  appointmentDate: z.string().or(z.date()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
  priority: z.enum(['normal', 'urgent']).optional(),
  status: z.enum(['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional()
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema
};

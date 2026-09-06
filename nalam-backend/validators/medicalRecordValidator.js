const { z } = require('zod');
const { objectIdSchema } = require('./common');

const createMedicalRecordSchema = z.object({
  patientId: objectIdSchema,
  doctorId: objectIdSchema.optional(),
  appointmentId: objectIdSchema.optional(),
  symptoms: z.array(z.string()).optional().default([]),
  observations: z.string().optional().default(''),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  treatmentPlan: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

module.exports = {
  createMedicalRecordSchema,
  updateMedicalRecordSchema
};

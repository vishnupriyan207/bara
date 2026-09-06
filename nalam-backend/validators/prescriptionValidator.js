const { z } = require('zod');
const { objectIdSchema } = require('./common');

const prescribedMedicineItem = z.object({
  medicineId: objectIdSchema.optional(),
  name: z.string().min(1, 'Medicine name is required'),
  strength: z.string().optional().default(''),
  instructions: z.string().optional().default('1-0-1 After food'),
  duration: z.string().optional().default('5 days'),
  quantity: z.number().min(1).default(1)
});

const createPrescriptionSchema = z.object({
  patientId: objectIdSchema.optional(),
  patientName: z.string().optional(),
  patientAge: z.union([z.number(), z.string()]).optional(),
  patientPhone: z.string().optional(),
  doctorId: objectIdSchema.optional(),
  doctorName: z.string().optional(),
  appointmentId: objectIdSchema.optional(),
  medicines: z.array(prescribedMedicineItem).min(1, 'Prescription must contain at least one medicine'),
  notes: z.string().optional().default(''),
  status: z.enum(['active', 'dispensed', 'cancelled']).default('active')
});

const updatePrescriptionSchema = z.object({
  medicines: z.array(prescribedMedicineItem).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'dispensed', 'cancelled']).optional()
});

module.exports = {
  createPrescriptionSchema,
  updatePrescriptionSchema
};

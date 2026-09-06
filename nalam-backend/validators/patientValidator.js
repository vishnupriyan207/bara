const { z } = require('zod');

const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  age: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val >= 0 && val <= 150, {
    message: 'Age must be between 0 and 150'
  }).optional(),
  dateOfBirth: z.string().or(z.date()).optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).default('unspecified'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    pincode: z.string().optional().default('')
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional().default(''),
    relationship: z.string().optional().default(''),
    phone: z.string().optional().default('')
  }).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).default('Unknown'),
  allergies: z.array(z.string()).optional().default([])
});

const updatePatientSchema = createPatientSchema.partial();

module.exports = {
  createPatientSchema,
  updatePatientSchema
};

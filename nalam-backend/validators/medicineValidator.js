const { z } = require('zod');

const createMedicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required').max(150),
  genericName: z.string().optional().default(''),
  strength: z.string().optional().default(''),
  barcode: z.string().optional(),
  type: z.enum(['strip', 'syrup', 'injection', 'ointment', 'drops', 'powder', 'device', 'other']).default('strip'),
  unitsPerStrip: z.number().min(1).default(10),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  gstPercent: z.number().min(0).max(28).default(5.0),
  manufacturer: z.string().optional().default('Nalam Pharma'),
  isActive: z.boolean().optional().default(true)
});

const updateMedicineSchema = createMedicineSchema.partial();

module.exports = {
  createMedicineSchema,
  updateMedicineSchema
};

const { z } = require('zod');
const { objectIdSchema } = require('./common');

const createInventorySchema = z.object({
  medicineId: objectIdSchema,
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unitsPerPack: z.number().min(1).default(10),
  expiryDate: z.string().or(z.date()).refine((d) => !isNaN(new Date(d).getTime()), {
    message: 'Valid expiry date is required'
  }),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  gstPercent: z.number().min(0).max(28).default(5.0),
  supplierId: z.string().optional().default('Direct Pharma Supplier')
});

const updateInventorySchema = z.object({
  quantity: z.number().min(0).optional(),
  expiryDate: z.string().or(z.date()).optional(),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  gstPercent: z.number().min(0).max(28).optional(),
  supplierId: z.string().optional()
});

module.exports = {
  createInventorySchema,
  updateInventorySchema
};

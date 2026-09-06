const { z } = require('zod');
const { objectIdSchema } = require('./common');

const billItemInputSchema = z.object({
  medicineId: objectIdSchema,
  batchId: objectIdSchema.optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  mode: z.enum(['strip', 'tablet', 'unit']).default('strip'),
  // Any unitPrice or total sent by frontend is ignored by the billing service
  unitPrice: z.number().optional(),
  total: z.number().optional()
});

const createBillSchema = z.object({
  patientId: objectIdSchema.optional(),
  customerName: z.string().optional().default('Walk-in Customer'),
  customerPhone: z.string().optional().default(''),
  items: z.array(billItemInputSchema).min(1, 'At least one medicine item is required'),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'net_banking']).default('cash'),
  notes: z.string().optional().default(''),
  // Client totals are accepted in payload if sent, but strictly discarded during server recalculation
  grandTotal: z.number().optional(),
  subtotal: z.number().optional(),
  gstAmount: z.number().optional()
});

module.exports = {
  createBillSchema,
  billItemInputSchema
};

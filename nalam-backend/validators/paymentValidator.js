const { z } = require('zod');
const { objectIdSchema } = require('./common');

const createPaymentSchema = z.object({
  billId: objectIdSchema,
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  method: z.enum(['cash', 'upi', 'card', 'net_banking']),
  transactionReference: z.string().optional()
});

module.exports = {
  createPaymentSchema
};

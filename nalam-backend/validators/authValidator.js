const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  phone: z.string().optional().default(''),
  role: z.enum(['admin', 'doctor', 'patient', 'pharmacy']).default('patient')
});

const loginSchema = z.object({
  email: z.string().min(1, 'Email or identifier is required'),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  registerSchema,
  loginSchema
};

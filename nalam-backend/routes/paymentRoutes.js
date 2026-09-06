const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { optionalAuthenticate, authenticate } = require('../middleware/authMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createPaymentSchema } = require('../validators/paymentValidator');
const { z } = require('zod');
const { objectIdSchema } = require('../validators/common');

const billIdParam = z.object({ billId: objectIdSchema });

router.post('/', optionalAuthenticate, validateBody(createPaymentSchema), paymentController.createPayment);
router.get('/bill/:billId', optionalAuthenticate, validateParams(billIdParam), paymentController.getPaymentsByBill);
router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), paymentController.getPaymentById);

module.exports = router;

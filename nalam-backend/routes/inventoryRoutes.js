const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createInventorySchema, updateInventorySchema } = require('../validators/inventoryValidator');

router.get('/', optionalAuthenticate, inventoryController.getInventoryList);
router.get('/low-stock', optionalAuthenticate, inventoryController.getLowStockItems);
router.get('/expiring', optionalAuthenticate, inventoryController.getExpiringItems);
router.get('/barcode/:barcode', optionalAuthenticate, inventoryController.getInventoryByBarcode);
router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), inventoryController.getInventoryById);
router.post('/', authenticate, requireRole('pharmacy', 'admin'), validateBody(createInventorySchema), inventoryController.createInventoryBatch);
router.patch('/:id', authenticate, requireRole('pharmacy', 'admin'), validateParams(idParamSchema), validateBody(updateInventorySchema), inventoryController.updateInventoryBatch);

module.exports = router;

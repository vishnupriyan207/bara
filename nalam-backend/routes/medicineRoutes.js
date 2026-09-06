const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const { createMedicineSchema, updateMedicineSchema } = require('../validators/medicineValidator');

router.get('/', optionalAuthenticate, medicineController.getMedicines);
router.get('/search', optionalAuthenticate, medicineController.searchMedicines);
router.get('/barcode/:barcode', optionalAuthenticate, medicineController.getMedicineByBarcode);
router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), medicineController.getMedicineById);
router.post('/', authenticate, requireRole('pharmacy', 'admin'), validateBody(createMedicineSchema), medicineController.createMedicine);
router.patch('/:id', authenticate, requireRole('pharmacy', 'admin'), validateParams(idParamSchema), validateBody(updateMedicineSchema), medicineController.updateMedicine);
router.delete('/:id', authenticate, requireRole('pharmacy', 'admin'), validateParams(idParamSchema), medicineController.deleteMedicine);

module.exports = router;

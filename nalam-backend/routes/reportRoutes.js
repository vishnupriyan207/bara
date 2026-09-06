const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { optionalAuthenticate, authenticate } = require('../middleware/authMiddleware');

router.get('/sales/today', optionalAuthenticate, reportController.getTodaySalesReport);
router.get('/sales', optionalAuthenticate, reportController.getSalesReport);
router.get('/inventory', optionalAuthenticate, reportController.getInventoryReport);
router.get('/patients', optionalAuthenticate, reportController.getPatientsReport);
router.get('/appointments', optionalAuthenticate, reportController.getAppointmentsReport);

module.exports = router;

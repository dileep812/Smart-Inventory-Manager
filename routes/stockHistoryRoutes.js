/**
 * Stock History Routes
 */

import express from 'express';
import { getStockHistory } from '../controllers/stockHistoryController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All routes require authentication and tenant isolation
router.use(isolateTenant);

// GET /stock-history - View complete stock movement history
router.get('/', getStockHistory);

export default router;

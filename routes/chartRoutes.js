/**
 * Chart Routes
 * API endpoints for dashboard chart data
 */

import express from 'express';
import { getStockMovementData } from '../controllers/chartController.js';

const router = express.Router();

// GET /api/charts/stock-movement - Stock movement trend data
router.get('/stock-movement', getStockMovementData);

export default router;

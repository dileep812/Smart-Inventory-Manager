import express from 'express';
import { getPOS, processSale } from '../controllers/posController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All POS routes require authentication and tenant isolation
router.use(isolateTenant);

// GET /pos - Display POS interface
router.get('/', getPOS);

// POST /pos/checkout - Process sale
router.post('/checkout', processSale);

export default router;

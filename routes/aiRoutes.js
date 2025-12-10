/**
 * AI Routes
 * Routes for AI-powered features
 */

import express from 'express';
import { generateDescription, suggestPrice } from '../controllers/aiController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/generate-desc
 * Generate AI-powered product description
 * Protected: Requires authentication and tenant isolation
 */
router.post('/generate-desc', isolateTenant, generateDescription);

/**
 * POST /api/ai/suggest-price
 * AI Pricing Advisor - suggests competitive selling price
 * Protected: Requires authentication and tenant isolation
 */
router.post('/suggest-price', isolateTenant, suggestPrice);

export default router;

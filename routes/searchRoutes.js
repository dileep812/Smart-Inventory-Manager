/**
 * Search Routes
 * API endpoints for global search
 */

import express from 'express';
import { globalSearch } from '../controllers/searchController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All routes require authentication and tenant isolation
router.use(isolateTenant);

// GET /api/search?q=query - Global search
router.get('/', globalSearch);

export default router;

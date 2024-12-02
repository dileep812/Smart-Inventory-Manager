import express from 'express';
import { getSettingsPage, updateShop, changePassword, updateEmail, setPassword } from '../controllers/settingsController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All settings routes require authentication and tenant isolation
router.use(isolateTenant);

// GET /settings - Display settings page
router.get('/', getSettingsPage);

// POST /settings/update-shop - Update shop profile (owner only)
router.post('/update-shop', restrictTo('owner'), updateShop);

// POST /settings/set-password - Set password for Google users (all users)
router.post('/set-password', setPassword);

// POST /settings/change-password - Change password (all users)
router.post('/change-password', changePassword);

// POST /settings/update-email - Change email address (all users)
router.post('/update-email', updateEmail);

export default router;


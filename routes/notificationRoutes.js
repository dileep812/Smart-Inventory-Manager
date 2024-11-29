/**
 * Notification Routes
 * API endpoints for in-app notifications
 */

import express from 'express';
import { getUnread, markRead, markAllRead } from '../controllers/notificationController.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All routes require authentication and tenant isolation
router.use(isolateTenant);

// GET /api/notifications/unread - Get unread notifications
router.get('/unread', getUnread);

// POST /api/notifications/:id/read - Mark one as read
router.post('/:id/read', markRead);

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', markAllRead);

export default router;

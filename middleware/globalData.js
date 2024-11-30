/**
 * Global Data Middleware
 * Attaches common data to res.locals for all views
 */

import { getUnreadCount } from '../services/notificationService.js';

/**
 * Attach unread notification count to all views
 * This makes res.locals.unreadCount available in all EJS templates
 */
export const attachNotificationCount = async (req, res, next) => {
    // Only fetch for authenticated users
    if (req.isAuthenticated() && req.user?.shopId) {
        try {
            res.locals.unreadCount = await getUnreadCount(req.user.shopId);
        } catch (error) {
            console.error('Failed to get unread count:', error.message);
            res.locals.unreadCount = 0;
        }
    } else {
        res.locals.unreadCount = 0;
    }
    next();
};

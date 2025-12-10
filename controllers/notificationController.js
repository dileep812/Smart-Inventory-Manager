/**
 * Notification Controller
 * Handles API endpoints for in-app notifications
 */

import { getUnreadNotifications, markAsRead, markAllAsRead } from '../services/notificationService.js';

/**
 * GET /api/notifications/unread
 * Get unread notifications for the current shop
 */
export const getUnread = async (req, res) => {
    try {
        const notifications = await getUnreadNotifications(req.shopId, 10);
        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
};

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markRead = async (req, res) => {
    const notificationId = parseInt(req.params.id);

    if (!notificationId || notificationId <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid notification ID' });
    }

    try {
        await markAsRead(notificationId, req.shopId);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
};

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the current shop
 */
export const markAllRead = async (req, res) => {
    try {
        await markAllAsRead(req.shopId);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
};

/**
 * Notification Service
 * Creates in-app notifications for the bell icon
 */

import db from '../config/db.js';

/**
 * Create a new notification for a shop
 * @param {number} shopId - The shop to notify
 * @param {string} message - Notification message (e.g., 'Blue Shirt is low on stock')
 * @param {string} type - Type: 'alert', 'warning', 'success', 'info'
 */
export async function createNotification(shopId, message, type = 'info') {
    try {
        await db.query(
            'INSERT INTO notifications (shop_id, message, type) VALUES ($1, $2, $3)',
            [shopId, message, type]
        );
        console.log(`🔔 Notification created: [${type}] ${message}`);
    } catch (error) {
        console.error('Failed to create notification:', error.message);
    }
}

/**
 * Get unread notifications for a shop
 * @param {number} shopId - The shop ID
 * @param {number} limit - Max notifications to return
 */
export async function getUnreadNotifications(shopId, limit = 10) {
    try {
        const result = await db.query(
            `SELECT id, message, type, created_at 
             FROM notifications 
             WHERE shop_id = $1 AND is_read = FALSE 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [shopId, limit]
        );
        return result.rows;
    } catch (error) {
        console.error('Failed to get notifications:', error.message);
        return [];
    }
}

/**
 * Get count of unread notifications
 * @param {number} shopId - The shop ID
 */
export async function getUnreadCount(shopId) {
    try {
        const result = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE shop_id = $1 AND is_read = FALSE',
            [shopId]
        );
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error('Failed to get unread count:', error.message);
        return 0;
    }
}

/**
 * Mark a notification as read
 * @param {number} notificationId - The notification ID
 * @param {number} shopId - The shop ID (for security)
 */
export async function markAsRead(notificationId, shopId) {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND shop_id = $2',
            [notificationId, shopId]
        );
    } catch (error) {
        console.error('Failed to mark notification as read:', error.message);
    }
}

/**
 * Mark all notifications as read for a shop
 * @param {number} shopId - The shop ID
 */
export async function markAllAsRead(shopId) {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE shop_id = $1 AND is_read = FALSE',
            [shopId]
        );
    } catch (error) {
        console.error('Failed to mark all as read:', error.message);
    }
}

export default {
    createNotification,
    getUnreadNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};

/**
 * Stock Movement Utility
 * Records all inventory changes for audit trail
 */

import db from '../config/db.js';

/**
 * Record a stock movement in the audit trail
 * @param {object} client - Database client (for transactions) or null to use pool
 * @param {object} params - Movement parameters
 * @param {number} params.shopId - The shop ID
 * @param {number} params.productId - The product ID
 * @param {number} params.quantityChange - Quantity change (+5 or -2)
 * @param {string} params.reason - Reason for change
 * @param {number} params.userId - The user who made the change
 * @param {string} [params.notes] - Optional additional notes
 */
export async function recordStockMovement(client, { shopId, productId, quantityChange, reason, userId, notes = null }) {
    try {
        // Use provided client (for transactions) or fall back to pool
        const queryFn = client ? client.query.bind(client) : db.query;

        await queryFn(
            `INSERT INTO stock_movements (shop_id, product_id, quantity_change, reason, user_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [shopId, productId, quantityChange, reason, userId, notes]
        );

        console.log(`📦 Stock movement recorded: Product ${productId}, ${quantityChange > 0 ? '+' : ''}${quantityChange} (${reason})`);

    } catch (error) {
        console.error('Failed to record stock movement:', error.message);
        // Re-throw in transaction context so we can rollback
        if (client) {
            throw error;
        }
    }
}

/**
 * Record stock movement without transaction (simple version)
 * @param {number} shopId - The shop ID
 * @param {number} productId - The product ID
 * @param {number} change - Quantity change
 * @param {string} reason - Reason for change
 * @param {number} userId - The user who made the change
 * @param {string} [notes] - Optional notes
 */
export async function recordStockMovementSimple(shopId, productId, change, reason, userId, notes = null) {
    return recordStockMovement(null, {
        shopId,
        productId,
        quantityChange: change,
        reason,
        userId,
        notes
    });
}

/**
 * Get stock movement history for a product
 * @param {number} productId - The product ID
 * @param {number} shopId - The shop ID (for security)
 * @param {number} limit - Number of records to return (default 20)
 */
export async function getStockHistory(productId, shopId, limit = 20) {
    try {
        const result = await db.query(
            `SELECT 
                sm.*,
                u.email as user_email
             FROM stock_movements sm
             LEFT JOIN users u ON sm.user_id = u.id
             WHERE sm.product_id = $1 AND sm.shop_id = $2
             ORDER BY sm.created_at DESC
             LIMIT $3`,
            [productId, shopId, limit]
        );

        return result.rows;

    } catch (error) {
        console.error('Failed to get stock history:', error.message);
        return [];
    }
}

export default { recordStockMovement, recordStockMovementSimple, getStockHistory };

/**
 * Stock History Controller
 * Handles viewing complete stock movement history
 */

import db from '../config/db.js';

/**
 * GET /stock-history
 * Display complete stock movement history with pagination
 */
export const getStockHistory = async (req, res) => {
    try {
        const shopId = req.shopId;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM stock_movements WHERE shop_id = $1',
            [shopId]
        );
        const totalCount = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalCount / limit);

        // Get stock movements with product info
        const result = await db.query(`
            SELECT 
                sm.id,
                sm.quantity_change,
                sm.reason,
                sm.notes,
                sm.created_at,
                p.name as product_name,
                p.sku as product_sku,
                u.email as user_email
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.user_id = u.id
            WHERE sm.shop_id = $1
            ORDER BY sm.created_at DESC
            LIMIT $2 OFFSET $3
        `, [shopId, limit, offset]);

        res.render('stock-history/index', {
            pageTitle: 'Stock Movement History',
            activePage: 'stock-history',
            movements: result.rows,
            pagination: {
                page,
                totalPages,
                totalCount,
                limit
            }
        });

    } catch (error) {
        console.error('Stock History Error:', error);
        req.flash('error', 'Failed to load stock history');
        res.redirect('/dashboard');
    }
};

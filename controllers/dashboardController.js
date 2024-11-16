import db from '../config/db.js';

// GET /dashboard - Display shop statistics
export const getDashboard = async (req, res) => {
    try {
        const shopId = req.shopId;

        // Run all queries in parallel for better performance
        const [
            productsResult,
            valueResult,
            categoriesResult,
            lowStockResult,
            recentActivityResult
        ] = await Promise.all([
            // Query 1: Count total products for this shop
            db.query(
                'SELECT COUNT(*) as total FROM products WHERE shop_id = $1',
                [shopId]
            ),

            // Query 2: Calculate total inventory value (price * stock_quantity)
            db.query(
                'SELECT COALESCE(SUM(price * stock_quantity), 0) as total_value FROM products WHERE shop_id = $1',
                [shopId]
            ),

            // Query 3: Count categories for this shop
            db.query(
                'SELECT COUNT(*) as total FROM categories WHERE shop_id = $1',
                [shopId]
            ),

            // Query 4: Count low stock items (stock_quantity < 5)
            db.query(
                'SELECT COUNT(*) as total FROM products WHERE shop_id = $1 AND stock_quantity < 5',
                [shopId]
            ),

            // Query 5: Recent stock movements (last 5)
            db.query(
                `SELECT 
                    sm.id,
                    sm.quantity_change,
                    sm.reason,
                    sm.created_at,
                    p.name as product_name,
                    u.email as user_email
                 FROM stock_movements sm
                 LEFT JOIN products p ON sm.product_id = p.id
                 LEFT JOIN users u ON sm.user_id = u.id
                 WHERE sm.shop_id = $1
                 ORDER BY sm.created_at DESC
                 LIMIT 5`,
                [shopId]
            )
        ]);

        const totalProducts = parseInt(productsResult.rows[0].total) || 0;
        const totalValue = parseFloat(valueResult.rows[0].total_value) || 0;
        const totalCategories = parseInt(categoriesResult.rows[0].total) || 0;
        const lowStockCount = parseInt(lowStockResult.rows[0].total) || 0;
        const recentActivity = recentActivityResult.rows;

        res.render('dashboard/index', {
            activePage: 'dashboard',
            stats: {
                totalProducts,
                totalValue,
                totalCategories,
                lowStockCount
            },
            recentActivity
        });

    } catch (error) {
        console.error('Dashboard error:', error.message);
        req.flash('error', 'Failed to load dashboard');
        res.render('dashboard/index', {
            activePage: 'dashboard',
            stats: {
                totalProducts: 0,
                totalValue: 0,
                totalCategories: 0,
                lowStockCount: 0
            },
            recentActivity: []
        });
    }
};

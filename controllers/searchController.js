/**
 * Search Controller
 * Handles global search API
 */

import db from '../config/db.js';

/**
 * GET /api/search?q=query
 * Search products and categories
 */
export const globalSearch = async (req, res) => {
    const query = req.query.q?.trim();

    if (!query || query.length < 2) {
        return res.json({ success: true, results: [] });
    }

    try {
        const searchTerm = `%${query}%`;

        // Search products
        const productsResult = await db.query(
            `SELECT id, name, sku, price, stock_quantity, 'product' as type
             FROM products 
             WHERE shop_id = $1 AND (
                 name ILIKE $2 OR 
                 sku ILIKE $2 OR 
                 description ILIKE $2
             )
             ORDER BY name
             LIMIT 5`,
            [req.shopId, searchTerm]
        );

        // Search categories
        const categoriesResult = await db.query(
            `SELECT id, name, 'category' as type
             FROM categories 
             WHERE shop_id = $1 AND name ILIKE $2
             ORDER BY name
             LIMIT 3`,
            [req.shopId, searchTerm]
        );

        const results = [
            ...productsResult.rows.map(p => ({
                id: p.id,
                name: p.name,
                type: 'product',
                subtitle: `SKU: ${p.sku} • Stock: ${p.stock_quantity}`,
                url: `/products/${p.id}`
            })),
            ...categoriesResult.rows.map(c => ({
                id: c.id,
                name: c.name,
                type: 'category',
                subtitle: 'Category',
                url: `/categories`
            }))
        ];

        res.json({ success: true, results });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};

/**
 * Chart Controller
 * Handles data endpoints for dashboard charts
 */

import db from '../config/db.js';

/**
 * GET /api/charts/stock-movement?days=7|30|90
 * Returns stock movement counts per day for the specified period
 */
export const getStockMovementData = async (req, res) => {
    try {
        const shopId = req.shopId;

        // Get days parameter (default to 7)
        let days = parseInt(req.query.days) || 7;
        if (![7, 30, 90].includes(days)) {
            days = 7;
        }

        // Simple query - get all movements for this shop in the date range
        const result = await db.query(`
            SELECT 
                DATE(created_at) as date, 
                COUNT(*) as count 
            FROM stock_movements 
            WHERE shop_id = $1 
                AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `, [shopId]);



        // Generate labels and data based on days
        const labels = [];
        const data = [];

        // Helper function to format local date as YYYY-MM-DD
        const formatLocalDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Create a map of existing data
        const dataMap = new Map();
        result.rows.forEach(row => {
            // Handle date from PostgreSQL
            let dateStr;
            if (row.date instanceof Date) {
                dateStr = formatLocalDate(row.date);
            } else if (typeof row.date === 'string') {
                dateStr = row.date.split('T')[0];
            } else {
                dateStr = String(row.date);
            }
            dataMap.set(dateStr, parseInt(row.count));
        });

        // Fill in all days (including days with 0 movements)
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatLocalDate(date);

            // Format label based on the range - always include date
            let label;
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[date.getDay()];
            const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;

            if (days <= 7) {
                // Day name + date for 7 days (e.g., "Wed 10/12")
                label = `${dayName} ${dateLabel}`;
            } else if (days <= 30) {
                // Day/Month for 30 days
                label = dateLabel;
            } else {
                // Show every 7th day for 90 days
                if (i % 7 === 0 || i === days - 1) {
                    label = dateLabel;
                } else {
                    label = '';
                }
            }

            const count = dataMap.get(dateStr) || 0;
            labels.push(label);
            data.push(count);
        }

        return res.json({
            labels,
            data,
            days,
            total: data.reduce((sum, val) => sum + val, 0)
        });

    } catch (error) {
        console.error('Chart Data Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch chart data',
            labels: [],
            data: []
        });
    }
};

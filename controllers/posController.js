import db from '../config/db.js';
import { recordStockMovement } from '../utils/stockMovement.js';
import { sendLowStockAlert, sendOutOfStockAlert } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';

const TAX_RATE = 0.10; // 10% tax

/**
 * GET /pos
 * Display POS interface with available products
 */
export const getPOS = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, sku, price, stock_quantity, image_url 
             FROM products 
             WHERE shop_id = $1 AND stock_quantity > 0
             ORDER BY name`,
            [req.shopId]
        );

        res.render('pos/index', {
            activePage: 'pos',
            products: result.rows,
            taxRate: TAX_RATE * 100, // Pass as percentage
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });
    } catch (error) {
        console.error('Get POS error:', error.message);
        req.flash('error', 'Failed to load POS');
        res.redirect('/dashboard');
    }
};

/**
 * POST /pos/checkout
 * Process a sale transaction
 */
export const processSale = async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Get shop owner's email for stock alerts (staff/manager shouldn't get these)
        const ownerResult = await client.query(
            'SELECT email FROM users WHERE shop_id = $1 AND role = $2',
            [req.shopId, 'owner']
        );
        const ownerEmail = ownerResult.rows[0]?.email;

        let subtotal = 0;
        const saleItems = [];

        // Process each cart item
        for (const item of cart) {
            const { productId, qty } = item;

            if (!productId || !qty || qty <= 0) {
                throw new Error('Invalid cart item');
            }

            // Get product details and check stock (include alert flag)
            const productResult = await client.query(
                'SELECT id, name, price, stock_quantity, low_stock_alert_sent FROM products WHERE id = $1 AND shop_id = $2 FOR UPDATE',
                [productId, req.shopId]
            );

            if (productResult.rows.length === 0) {
                throw new Error(`Product ${productId} not found`);
            }

            const product = productResult.rows[0];

            if (product.stock_quantity < qty) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`);
            }

            // Decrease stock and handle alert flag
            const newStock = product.stock_quantity - qty;
            const LOW_STOCK_THRESHOLD = 5;

            // Determine if we need to reset the alert flag (stock going back above threshold)
            const shouldResetFlag = newStock >= LOW_STOCK_THRESHOLD && product.low_stock_alert_sent;

            await client.query(
                'UPDATE products SET stock_quantity = $1, low_stock_alert_sent = $2, updated_at = NOW() WHERE id = $3',
                [newStock, shouldResetFlag ? false : product.low_stock_alert_sent, productId]
            );

            // Record stock movement in the SAME transaction
            await recordStockMovement(client, {
                shopId: req.shopId,
                productId: productId,
                quantityChange: -qty,  // Negative because stock is decreasing
                reason: 'POS Sale',
                userId: req.user.id,
                notes: null
            });

            // Check for low stock and send ONE-TIME email alert to SHOP OWNER
            // Also create in-app notification for the bell icon
            if (ownerEmail) {
                if (newStock === 0) {
                    // Out of stock - always send urgent alert (not controlled by flag)
                    sendOutOfStockAlert(ownerEmail, product.name).catch(err =>
                        console.error('Failed to send out of stock alert:', err)
                    );
                    // Create in-app notification
                    createNotification(req.shopId, `🚨 ${product.name} is now OUT OF STOCK!`, 'alert');
                } else if (newStock < LOW_STOCK_THRESHOLD && !product.low_stock_alert_sent) {
                    // Low stock warning - only send if not already alerted
                    sendLowStockAlert(ownerEmail, product.name, newStock).catch(err =>
                        console.error('Failed to send low stock alert:', err)
                    );
                    // Create in-app notification
                    createNotification(req.shopId, `⚠️ ${product.name} is low on stock (${newStock} left)`, 'warning');
                    // Mark as alerted (within same transaction)
                    await client.query(
                        'UPDATE products SET low_stock_alert_sent = TRUE WHERE id = $1',
                        [productId]
                    );
                }
            }

            // Calculate item total
            const itemTotal = parseFloat(product.price) * qty;
            subtotal += itemTotal;

            saleItems.push({
                productId,
                productName: product.name,
                qty,
                price: product.price,
                total: itemTotal
            });
        }

        const tax = subtotal * TAX_RATE;
        const grandTotal = subtotal + tax;

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Sale completed successfully',
            sale: {
                items: saleItems,
                subtotal: subtotal.toFixed(2),
                tax: tax.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Process sale error:', error.message);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

import db from '../config/db.js';
import { recordStockMovement, recordStockMovementSimple, getStockHistory } from '../utils/stockMovement.js';
import { Parser } from 'json2csv';
import { sendLowStockAlert, sendOutOfStockAlert } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Validate that an ID parameter is a positive integer
 * @param {string} id - The ID to validate
 * @returns {number|null} - The parsed ID or null if invalid
 */
function validateProductId(id) {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed.toString() !== id) {
        return null;
    }
    return parsed;
}

/**
 * Generate a unique SKU for a product
 * Format: First 3 letters of name (uppercase) + hyphen + 6 random alphanumeric characters
 * Example: "iPhone 15" -> "IPH-9X2B4A"
 * @param {string} name - Product name
 * @returns {string} Generated SKU
 */
function generateSKU(name) {
    // Get first 3 letters of the name, uppercase, removing non-letters
    const prefix = name
        .replace(/[^a-zA-Z]/g, '') // Remove non-letters
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, 'X'); // Pad with X if less than 3 letters

    // Generate 6 random alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${randomPart}`;
}

// GET /products - List all products for the shop
export const getAllProducts = async (req, res) => {
    try {
        const filter = req.query.filter; // Pass to view for client-side filter activation

        const result = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.shop_id = $1 
             ORDER BY p.created_at DESC`,
            [req.shopId]
        );

        res.render('products/list', {
            activePage: 'products',
            products: result.rows,
            filter: filter || null,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });

    } catch (error) {
        console.error('Get products error:', error.message);
        req.flash('error', 'Failed to load products');
        res.redirect('/dashboard');
    }
};

// GET /products/new - Show create product form
export const getCreateProduct = async (req, res) => {
    try {
        const categories = await db.query(
            'SELECT * FROM categories WHERE shop_id = $1 ORDER BY name',
            [req.shopId]
        );

        res.render('products/add', {
            activePage: 'products',
            categories: categories.rows,
            error: req.flash('error')[0] || null
        });

    } catch (error) {
        console.error('Get create form error:', error.message);
        req.flash('error', 'Failed to load form');
        res.redirect('/products');
    }
};

// POST /products - Create new product
export const createProduct = async (req, res, retryCount = 0) => {
    const { name, category_id, price, stock_quantity, description } = req.body;
    const shop_id = req.shopId;
    const initialStock = parseInt(stock_quantity) || 0;

    // Generate unique SKU
    const sku = generateSKU(name);

    // Get image URL from Cloudinary (if uploaded)
    const image_url = req.file?.path || null;
    console.log(image_url);
    try {
        const result = await db.query(
            `INSERT INTO products (shop_id, name, sku, category_id, price, stock_quantity, description, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                shop_id,
                name.trim(),
                sku,
                category_id || null,
                parseFloat(price) || 0,
                initialStock,
                description?.trim() || null,
                image_url
            ]
        );

        // Record initial stock movement if stock > 0
        if (initialStock > 0 && result.rows[0]?.id) {
            await recordStockMovementSimple(
                shop_id,
                result.rows[0].id,
                initialStock,
                'Initial Stock',
                req.user?.id
            );
        }

        req.flash('success', `Product "${name}" created with SKU: ${sku}`);
        res.redirect('/products');

    } catch (error) {
        console.error('Create product error:', error.message);

        // Handle SKU collision - retry with new random SKU with backoff
        if (error.code === '23505' && error.constraint?.includes('sku')) {
            // Limit retries to prevent infinite loop
            if (retryCount < 3) {
                console.log(`SKU collision detected, retrying... (attempt ${retryCount + 1})`);
                // Add small exponential delay to reduce race conditions
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 * (retryCount + 1)));
                return createProduct(req, res, retryCount + 1);
            } else {
                req.flash('error', 'Failed to generate unique SKU. Please try again.');
            }
        } else if (error.code === '23505') {
            req.flash('error', 'A product with this information already exists');
        } else {
            req.flash('error', 'Failed to create product');
        }
        res.redirect('/products/new');
    }
};

// GET /products/:id - Show single product
export const getProduct = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    try {
        const result = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = $1 AND p.shop_id = $2`,
            [productId, req.shopId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        res.render('products/show', {
            activePage: 'products',
            product: result.rows[0]
        });

    } catch (error) {
        console.error('Get product error:', error.message);
        req.flash('error', 'Failed to load product');
        res.redirect('/products');
    }
};

// GET /products/:id/edit - Show edit form
export const getEditProduct = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    try {
        const [productResult, categoriesResult] = await Promise.all([
            db.query('SELECT * FROM products WHERE id = $1 AND shop_id = $2', [productId, req.shopId]),
            db.query('SELECT * FROM categories WHERE shop_id = $1 ORDER BY name', [req.shopId])
        ]);

        if (productResult.rows.length === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        res.render('products/edit', {
            activePage: 'products',
            product: productResult.rows[0],
            categories: categoriesResult.rows,
            error: req.flash('error')[0] || null
        });

    } catch (error) {
        console.error('Get edit form error:', error.message);
        req.flash('error', 'Failed to load product');
        res.redirect('/products');
    }
};

// PUT /products/:id - Update product
export const updateProduct = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    const { name, category_id, price, stock_quantity, description } = req.body;

    // Get image URL from uploaded file (if new image uploaded)
    let image_url = null;
    let updateImage = false;

    if (req.file) {
        image_url = req.file.path;
        updateImage = true;
    }

    try {
        let result;

        if (updateImage) {
            // Update with new image
            result = await db.query(
                `UPDATE products 
                 SET name = $1, category_id = $2, price = $3, stock_quantity = $4, description = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $7 AND shop_id = $8
                 RETURNING id`,
                [
                    name.trim(),
                    category_id || null,
                    parseFloat(price) || 0,
                    parseInt(stock_quantity) || 0,
                    description?.trim() || null,
                    image_url,
                    productId,
                    req.shopId
                ]
            );
        } else {
            // Update without changing image
            result = await db.query(
                `UPDATE products 
                 SET name = $1, category_id = $2, price = $3, stock_quantity = $4, description = $5, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $6 AND shop_id = $7
                 RETURNING id`,
                [
                    name.trim(),
                    category_id || null,
                    parseFloat(price) || 0,
                    parseInt(stock_quantity) || 0,
                    description?.trim() || null,
                    productId,
                    req.shopId
                ]
            );
        }

        if (result.rows.length === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        req.flash('success', 'Product updated successfully');
        res.redirect('/products');

    } catch (error) {
        console.error('Update product error:', error.message);
        req.flash('error', 'Failed to update product');
        res.redirect(`/products/${req.params.id}/edit`);
    }
};

// DELETE /products/:id - Delete product
export const deleteProduct = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    try {
        const result = await db.query(
            'DELETE FROM products WHERE id = $1 AND shop_id = $2 RETURNING id',
            [productId, req.shopId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'Product not found');
        } else {
            req.flash('success', 'Product deleted successfully');
        }

        res.redirect('/products');

    } catch (error) {
        console.error('Delete product error:', error.message);
        req.flash('error', 'Failed to delete product');
        res.redirect('/products');
    }
};

// GET /products/:id/history - Show stock movement history
export const getProductHistory = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    try {
        const [productResult, historyResult] = await Promise.all([
            db.query(
                'SELECT id, name, sku, stock_quantity FROM products WHERE id = $1 AND shop_id = $2',
                [productId, req.shopId]
            ),
            getStockHistory(productId, req.shopId, 20)
        ]);

        if (productResult.rows.length === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        res.render('products/history', {
            activePage: 'products',
            product: productResult.rows[0],
            movements: historyResult
        });

    } catch (error) {
        console.error('Get product history error:', error.message);
        req.flash('error', 'Failed to load stock history');
        res.redirect('/products');
    }
};

// POST /products/:id/adjust - Adjust stock quantity
export const adjustStock = async (req, res) => {
    const productId = validateProductId(req.params.id);
    if (!productId) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/products');
    }

    const { adjustment_type, quantity, reason, notes } = req.body;
    const shopId = req.shopId;
    const userId = req.user?.id;

    // Validate input
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
        req.flash('error', 'Invalid quantity');
        return res.redirect('/products');
    }

    if (!adjustment_type || !['add', 'remove'].includes(adjustment_type)) {
        req.flash('error', 'Invalid adjustment type');
        return res.redirect('/products');
    }

    // Calculate the actual change (positive for add, negative for remove)
    const quantityChange = adjustment_type === 'add' ? qty : -qty;
    const LOW_STOCK_THRESHOLD = 5;

    // Use a transaction to ensure both operations succeed or fail together
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Get current product state first (with lock for update)
        const productResult = await client.query(
            'SELECT id, name, stock_quantity, low_stock_alert_sent FROM products WHERE id = $1 AND shop_id = $2 FOR UPDATE',
            [productId, shopId]
        );

        if (productResult.rows.length === 0) {
            throw new Error('Product not found');
        }

        const product = productResult.rows[0];
        const oldStock = product.stock_quantity;
        const newStock = oldStock + quantityChange;

        // Check if stock would go negative
        if (newStock < 0) {
            throw new Error('Insufficient stock');
        }

        // Determine alert flag state
        let newAlertFlag = product.low_stock_alert_sent;

        // Reset flag if stock goes back above threshold (when adding stock)
        if (newStock >= LOW_STOCK_THRESHOLD && product.low_stock_alert_sent) {
            newAlertFlag = false;
        }

        // Update product stock and alert flag
        await client.query(
            'UPDATE products SET stock_quantity = $1, low_stock_alert_sent = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newStock, newAlertFlag, productId]
        );

        // Record the movement
        await client.query(
            `INSERT INTO stock_movements (shop_id, product_id, quantity_change, reason, notes, user_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [shopId, productId, quantityChange, reason || (adjustment_type === 'add' ? 'Restock' : 'Sale'), notes || null, userId]
        );

        // Send ONE-TIME low stock alerts to shop owner (only when REDUCING stock)
        if (adjustment_type === 'remove') {
            // Get shop owner email
            const ownerResult = await client.query(
                'SELECT email FROM users WHERE shop_id = $1 AND role = $2',
                [shopId, 'owner']
            );
            const ownerEmail = ownerResult.rows[0]?.email;

            if (ownerEmail) {
                if (newStock === 0) {
                    // Out of stock - always send urgent alert
                    sendOutOfStockAlert(ownerEmail, product.name).catch(err =>
                        console.error('Failed to send out of stock alert:', err)
                    );
                    // Create in-app notification
                    createNotification(shopId, `🚨 ${product.name} is now OUT OF STOCK!`, 'alert');
                } else if (newStock < LOW_STOCK_THRESHOLD && !product.low_stock_alert_sent) {
                    // Low stock - send only if not already alerted
                    sendLowStockAlert(ownerEmail, product.name, newStock).catch(err =>
                        console.error('Failed to send low stock alert:', err)
                    );
                    // Create in-app notification
                    createNotification(shopId, `⚠️ ${product.name} is low on stock (${newStock} left)`, 'warning');
                    // Mark as alerted
                    await client.query(
                        'UPDATE products SET low_stock_alert_sent = TRUE WHERE id = $1',
                        [productId]
                    );
                }
            }
        }

        await client.query('COMMIT');

        const action = adjustment_type === 'add' ? 'added to' : 'removed from';
        req.flash('success', `${qty} units ${action} ${product.name}. New stock: ${newStock}`);
        res.redirect('/products');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Adjust stock error:', error.message);

        if (error.message === 'Insufficient stock') {
            req.flash('error', 'Cannot remove more stock than available');
        } else if (error.message === 'Product not found') {
            req.flash('error', 'Product not found');
        } else {
            req.flash('error', 'Failed to adjust stock');
        }
        res.redirect('/products');

    } finally {
        client.release();
    }
};

/**
 * GET /products/export
 * Export all products as CSV
 */
export const exportProducts = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                p.name AS "Name",
                p.sku AS "SKU",
                p.price AS "Price",
                p.stock_quantity AS "Stock",
                COALESCE(c.name, 'Uncategorized') AS "Category"
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.shop_id = $1
             ORDER BY p.name`,
            [req.shopId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'No products to export');
            return res.redirect('/products');
        }

        // Define CSV fields
        const fields = ['Name', 'SKU', 'Price', 'Stock', 'Category'];
        const parser = new Parser({ fields });
        const csvData = parser.parse(result.rows);

        // Set headers for CSV download
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=inventory.csv');
        res.send(csvData);
    } catch (error) {
        console.error('Export products error:', error.message);
        req.flash('error', 'Failed to export products');
        res.redirect('/products');
    }
};

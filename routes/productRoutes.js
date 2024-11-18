import express from 'express';
import {
    getAllProducts,
    getCreateProduct,
    createProduct,
    getProduct,
    getEditProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getProductHistory,
    exportProducts
} from '../controllers/productController.js';
import upload from '../middleware/uploadMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// GET /products - List all products (all authenticated users)
router.get('/', getAllProducts);

// GET /products/export - Export products as CSV (MUST be before :id route)
router.get('/export', exportProducts);

// GET /products/new - Show create form (owners and managers only)
router.get('/new', restrictTo('owner', 'manager'), getCreateProduct);

// POST /products - Create product (owners and managers only)
router.post('/', restrictTo('owner', 'manager'), upload.single('image'), createProduct);

// GET /products/:id - Show product (all authenticated users)
router.get('/:id', getProduct);

// GET /products/:id/edit - Show edit form (owners and managers only)
router.get('/:id/edit', restrictTo('owner', 'manager'), getEditProduct);

// PUT /products/:id - Update product (owners and managers only)
router.put('/:id', restrictTo('owner', 'manager'), upload.single('image'), updateProduct);

// POST /products/:id/adjust - Adjust stock quantity (all authenticated users can adjust)
router.post('/:id/adjust', adjustStock);

// GET /products/:id/history - View stock movement history (all authenticated users)
router.get('/:id/history', getProductHistory);

// DELETE /products/:id - Delete product (owners and managers only)
router.delete('/:id', restrictTo('owner', 'manager'), deleteProduct);

export default router;

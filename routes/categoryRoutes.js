import express from 'express';
import {
    getCategories,
    createCategory,
    deleteCategory
} from '../controllers/categoryController.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// GET /categories - List all categories (all authenticated users)
router.get('/', getCategories);

// POST /categories - Create new category (owners and managers only)
router.post('/', restrictTo('owner', 'manager'), createCategory);

// DELETE /categories/:id - Delete category (owners and managers only)
router.delete('/:id', restrictTo('owner', 'manager'), deleteCategory);

export default router;

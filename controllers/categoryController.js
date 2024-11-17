/**
 * Category Controller
 * Handles CRUD operations for product categories
 */

import db from '../config/db.js';

/**
 * GET /categories
 * List all categories for the shop
 */
export const getCategories = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM categories WHERE shop_id = $1 ORDER BY name ASC',
            [req.shopId]
        );

        res.render('categories/index', {
            activePage: 'categories',
            categories: result.rows,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });

    } catch (error) {
        console.error('Get categories error:', error.message);
        req.flash('error', 'Failed to load categories');
        res.redirect('/dashboard');
    }
};

/**
 * POST /categories
 * Create a new category
 */
export const createCategory = async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        req.flash('error', 'Category name is required');
        return res.redirect('/categories');
    }

    try {
        await db.query(
            'INSERT INTO categories (shop_id, name) VALUES ($1, $2)',
            [req.shopId, name.trim()]
        );

        req.flash('success', `Category "${name}" created successfully`);
        res.redirect('/categories');

    } catch (error) {
        console.error('Create category error:', error.message);

        if (error.code === '23505') {
            req.flash('error', 'A category with this name already exists');
        } else {
            req.flash('error', 'Failed to create category');
        }
        res.redirect('/categories');
    }
};

/**
 * DELETE /categories/:id
 * Delete a category (only if it belongs to the shop)
 */
export const deleteCategory = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING id, name',
            [req.params.id, req.shopId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'Category not found');
        } else {
            req.flash('success', `Category "${result.rows[0].name}" deleted`);
        }

        res.redirect('/categories');

    } catch (error) {
        console.error('Delete category error:', error.message);
        req.flash('error', 'Failed to delete category');
        res.redirect('/categories');
    }
};

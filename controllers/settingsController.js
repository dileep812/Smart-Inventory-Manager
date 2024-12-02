import db from '../config/db.js';
import bcrypt from 'bcrypt';

/**
 * GET /settings
 * Display settings page
 */
export const getSettingsPage = async (req, res) => {
    try {
        // Get shop info
        const shopResult = await db.query(
            'SELECT * FROM shops WHERE id = $1',
            [req.shopId]
        );

        if (shopResult.rows.length === 0) {
            req.flash('error', 'Shop not found');
            return res.redirect('/dashboard');
        }

        // Check if user has a password (Google users may not have one)
        const userResult = await db.query(
            'SELECT password_hash, google_id FROM users WHERE id = $1',
            [req.user.id]
        );

        const hasPassword = !!(userResult.rows[0]?.password_hash);
        const isGoogleUser = !!(userResult.rows[0]?.google_id);

        res.render('settings/index', {
            activePage: 'settings',
            shop: shopResult.rows[0],
            hasPassword,
            isGoogleUser,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });
    } catch (error) {
        console.error('Get settings error:', error.message);
        req.flash('error', 'Failed to load settings');
        res.redirect('/dashboard');
    }
};

/**
 * POST /settings/set-password
 * Set password for Google OAuth users who don't have one
 */
export const setPassword = async (req, res) => {
    const { new_password, confirm_password } = req.body;

    // Validate inputs
    if (!new_password || !confirm_password) {
        req.flash('error', 'Both password fields are required');
        return res.redirect('/settings');
    }

    if (new_password !== confirm_password) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/settings');
    }

    if (new_password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters');
        return res.redirect('/settings');
    }

    try {
        // Check if user already has a password
        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows[0]?.password_hash) {
            req.flash('error', 'You already have a password. Use "Change Password" instead.');
            return res.redirect('/settings');
        }

        // Hash and set the new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        req.flash('success', 'Password set successfully! You can now login with email & password.');
        res.redirect('/settings');
    } catch (error) {
        console.error('Set password error:', error.message);
        req.flash('error', 'Failed to set password');
        res.redirect('/settings');
    }
};

/**
 * POST /settings/update-shop
 * Update shop profile (owner only)
 */
export const updateShop = async (req, res) => {
    const { shop_name } = req.body;

    if (!shop_name || shop_name.trim() === '') {
        req.flash('error', 'Shop name is required');
        return res.redirect('/settings');
    }

    try {
        await db.query(
            'UPDATE shops SET name = $1, updated_at = NOW() WHERE id = $2',
            [shop_name.trim(), req.shopId]
        );

        req.flash('success', 'Shop profile updated successfully');
        res.redirect('/settings');
    } catch (error) {
        console.error('Update shop error:', error.message);
        req.flash('error', 'Failed to update shop profile');
        res.redirect('/settings');
    }
};

/**
 * POST /settings/change-password
 * Change user password
 */
export const changePassword = async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;

    // Validate inputs
    if (!current_password || !new_password || !confirm_password) {
        req.flash('error', 'All password fields are required');
        return res.redirect('/settings');
    }

    if (new_password !== confirm_password) {
        req.flash('error', 'New passwords do not match');
        return res.redirect('/settings');
    }

    if (new_password.length < 6) {
        req.flash('error', 'New password must be at least 6 characters');
        return res.redirect('/settings');
    }

    try {
        // Fetch current user's password hash
        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'User not found');
            return res.redirect('/settings');
        }

        // Check if user has a password (Google users may not)
        if (!result.rows[0].password_hash) {
            req.flash('error', 'You don\'t have a password yet. Please use "Set Password" instead.');
            return res.redirect('/settings');
        }

        // Verify current password
        const isMatch = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!isMatch) {
            req.flash('error', 'Incorrect current password');
            return res.redirect('/settings');
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        req.flash('success', 'Password changed successfully');
        res.redirect('/settings');
    } catch (error) {
        console.error('Change password error:', error.message);
        req.flash('error', 'Failed to change password');
        res.redirect('/settings');
    }
};

/**
 * POST /settings/update-email
 * Change user email address
 */
export const updateEmail = async (req, res) => {
    const { new_email, current_password } = req.body;

    // Validate inputs
    if (!new_email || !current_password) {
        req.flash('error', 'Email and password are required');
        return res.redirect('/settings');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
        req.flash('error', 'Invalid email format');
        return res.redirect('/settings');
    }

    // Check if same as current
    if (new_email.toLowerCase() === req.user.email.toLowerCase()) {
        req.flash('error', 'New email is the same as your current email');
        return res.redirect('/settings');
    }

    try {
        // Fetch current user's password hash
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            req.flash('error', 'User not found');
            return res.redirect('/settings');
        }

        // Check if user has a password (Google users may not)
        if (!userResult.rows[0].password_hash) {
            req.flash('error', 'Please set a password first before changing your email');
            return res.redirect('/settings');
        }

        // Security: Verify current password
        const isMatch = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isMatch) {
            req.flash('error', 'Incorrect password');
            return res.redirect('/settings');
        }

        // Check if email is already in use
        const existingUser = await db.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
            [new_email, req.user.id]
        );

        if (existingUser.rows.length > 0) {
            req.flash('error', 'Email address is already in use');
            return res.redirect('/settings');
        }

        // Update email
        await db.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
            [new_email.toLowerCase(), req.user.id]
        );

        // Update session to prevent logout
        req.user.email = new_email.toLowerCase();

        req.flash('success', 'Email address updated successfully');
        res.redirect('/settings');
    } catch (error) {
        console.error('Update email error:', error.message);
        req.flash('error', 'Failed to update email address');
        res.redirect('/settings');
    }
};

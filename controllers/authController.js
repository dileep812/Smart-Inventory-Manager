import bcrypt from 'bcrypt';
import passport from 'passport';
import db from '../config/db.js';

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

/**
 * GET /auth/signup
 * Render the signup page
 */
export const getSignup = (req, res) => {
    res.render('auth/signup', {
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
    });
};

/**
 * POST /auth/signup
 * Handle user registration with transaction
 * Creates both Shop and User atomically
 */
export const postSignup = async (req, res) => {
    const { shopName, email, password } = req.body;

    // Basic validation
    if (!shopName || !email || !password) {
        req.flash('error', 'All fields are required');
        return res.redirect('/auth/signup');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters');
        return res.redirect('/auth/signup');
    }

    // Get a client from the pool for transaction
    const client = await db.pool.connect();

    try {
        // ============================================
        // BEGIN TRANSACTION
        // ============================================
        await client.query('BEGIN');

        // Step A: Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Step B: Insert the Shop and get the ID
        const shopResult = await client.query(
            `INSERT INTO shops (name) 
             VALUES ($1) 
             RETURNING id`,
            [shopName.trim()]
        );
        const shopId = shopResult.rows[0].id;

        // Step C: Insert the Owner User linked to the Shop
        const userResult = await client.query(
            `INSERT INTO users (shop_id, email, password_hash, role) 
             VALUES ($1, $2, $3, 'owner')
             RETURNING id, shop_id, email, role`,
            [shopId, email.toLowerCase().trim(), passwordHash]
        );

        // ============================================
        // COMMIT TRANSACTION
        // ============================================
        await client.query('COMMIT');

        console.log(`✓ New shop registered: "${shopName}" (ID: ${shopId})`);

        // Create user object for Passport session
        const newUser = {
            id: userResult.rows[0].id,
            shopId: userResult.rows[0].shop_id,
            email: userResult.rows[0].email,
            role: userResult.rows[0].role,
            shopName: shopName.trim()
        };

        // Auto-login after registration using Passport's req.login()
        req.login(newUser, (err) => {
            if (err) {
                console.error('Auto-login error:', err.message);
                req.flash('success', 'Account created! Please login.');
                return res.redirect('/auth/login');
            }
            // Redirect directly to dashboard after auto-login
            req.flash('success', `Welcome to ${shopName}!`);
            return res.redirect('/dashboard');
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error.message);

        const msg = (error.code === '23505' && error.constraint === 'users_email_key')
            ? 'This email is already registered.'
            : 'Registration failed. Please try again.';

        req.flash('error', msg);
        return res.redirect('/auth/signup');
    } finally {
        client.release();
    }
};

/**
 * GET /auth/login
 * Render the login page
 */
export const getLogin = (req, res) => {
    res.render('auth/login', {
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
    });
};

/**
 * POST /auth/login
 * Handle user login using Passport.js
 */
export const postLogin = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
};

/**
 * GET /auth/logout
 * Handle user logout
 */
export const logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err.message);
            return next(err);
        }
        req.flash('success', 'You have been logged out.');
        res.redirect('/auth/login');
    });
};

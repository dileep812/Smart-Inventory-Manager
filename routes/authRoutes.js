import express from 'express';
import passport from '../config/passport.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// GET /auth/signup - Render signup form
router.get('/signup', authController.getSignup);

// POST /auth/signup - Handle registration
router.post('/signup', authController.postSignup);

// GET /auth/login - Render login form
router.get('/login', authController.getLogin);

// POST /auth/login - Handle login
router.post('/login', authController.postLogin);

// GET /auth/logout - Handle logout
router.get('/logout', authController.logout);

// =============================================
// Google OAuth Routes
// =============================================

// GET /auth/google - Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// GET /auth/google/callback - Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/auth/login',
        failureFlash: 'Google login failed. Please try again.'
    }),
    (req, res) => {
        // Success - redirect to dashboard
        res.redirect('/dashboard');
    }
);

export default router;


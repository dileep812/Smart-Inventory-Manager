/**
 * Authentication Middleware
 * Protects routes that require login
 */

// Check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // For API requests, return JSON error
    if (req.xhr || req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    
    // For regular requests, redirect to login
    req.flash('error', 'Please login to access this page');
    res.redirect('/auth/login');
};

// Check if user is NOT authenticated (for login/signup pages)
export const isGuest = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
};

// Ensure user has owner role
export const isOwner = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'owner') {
        return next();
    }
    req.flash('error', 'You do not have permission to access this page');
    res.redirect('/dashboard');
};

// Inject shop_id into request for easy access in controllers
export const injectShopId = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.shopId = req.user.shopId;
    }
    next();
};

// Make user data available to all views
export const setLocals = (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentUser = req.user || null;
    next();
};

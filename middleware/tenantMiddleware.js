
export const isolateTenant = (req, res, next) => {
    // Check if user is authenticated using Passport's method
    if (!req.isAuthenticated()) {
        // For API requests, return JSON error
        if (req.xhr || req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Authentication required. Please login.' });
        }
        
        req.flash('error', 'Please login to access this page');
        return res.redirect('/auth/login');
    }
    
    // User is authenticated - extract tenant information
    const user = req.user;
    
    // Crucial: Attach shop_id to request for Controllers
    // All database queries should use req.shopId for WHERE clauses
    req.shopId = user.shopId;
    
    // Crucial: Attach user to res.locals for EJS templates
    // Templates can now access currentUser.email, currentUser.role, etc.
    res.locals.currentUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        shopName: user.shopName
    };
    
    // Continue to the next middleware/route handler
    next();
};

// Lighter version - only injects tenant data without auth check
// Use this AFTER a separate auth middleware
export const injectTenant = (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        // Attach shop_id to request for Controllers
        req.shopId = req.user.shopId;
        
        // Attach user to res.locals for EJS templates
        res.locals.currentUser = {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            shopId: req.user.shopId,
            shopName: req.user.shopName
        };
    }
    next();
};

export default { isolateTenant, injectTenant };

/**
 * Role-Based Access Control Middleware
 * Restricts routes to specific user roles
 */

/**
 * Restrict access to specific roles
 * Usage: restrictTo('owner', 'manager')
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 */
export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Check if user is authenticated
        if (!req.user) {
            req.flash('error', 'Please login to access this page');
            return res.redirect('/auth/login');
        }

        // 2. Strict safety check: Ensure user belongs to current shop context
        if (req.user.shopId !== req.shopId) {
            console.warn(`Security: User ${req.user.id} attempted to access shop ${req.shopId}`);
            return res.status(403).render('errors/403', {
                message: 'Access Denied: You do not have permission to access this shop.'
            });
        }

        // 3. Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).render('errors/403', {
                message: 'Access Denied: You do not have permission to perform this action.'
            });
        }

        // All checks passed
        next();
    };
};

/**
 * Check if user is owner
 */
export const isOwnerOnly = restrictTo('owner');

/**
 * Check if user is owner or manager
 */
export const isOwnerOrManager = restrictTo('owner', 'manager');

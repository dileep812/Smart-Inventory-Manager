// Load environment variables
import 'dotenv/config';

// Import dependencies
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import methodOverride from 'method-override';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import flash from 'connect-flash';
import passport from './config/passport.js';
import db from './config/db.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import posRoutes from './routes/posRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import chartRoutes from './routes/chartRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import stockHistoryRoutes from './routes/stockHistoryRoutes.js';

// Import controllers
import { getDashboard } from './controllers/dashboardController.js';

// Import middleware
import { isAuthenticated, setLocals, injectShopId } from './middleware/auth.js';
import { isolateTenant } from './middleware/tenantMiddleware.js';
import { attachNotificationCount } from './middleware/globalData.js';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Set port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// ======================
// Middleware Configuration
// ======================

// Parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies
app.use(express.json());

// Method override for PUT and DELETE requests from forms
app.use(methodOverride('_method'));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// Session Configuration
// ======================
const PgSession = connectPgSimple(session);

app.use(session({
    store: new PgSession({
        pool: db.pool,                     // Use existing db pool
        tableName: 'session',              // Session table name
        createTableIfMissing: true,        // Auto-create session table if it doesn't exist
        pruneSessionInterval: 60 * 15,     // Prune expired sessions every 15 minutes
        errorLog: console.error.bind(console) // Log session store errors
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Secure cookies require HTTPS. For local production testing (HTTP), we can disable it.
        secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Flash messages
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Make user data available to all views
app.use(setLocals);

// Attach notification count to all views (for bell icon)
app.use(attachNotificationCount);

// ======================
// View Engine Setup
// ======================

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set views directory
app.set('views', path.join(__dirname, 'views'));

// ======================
// Routes
// ======================

// Auth routes (public)
app.use('/auth', authRoutes);

// Home route - redirect to dashboard or login
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Dashboard route (protected with tenant isolation)
app.get('/dashboard', isolateTenant, getDashboard);

// Products routes (protected with tenant isolation)
app.use('/products', isolateTenant, productRoutes);

// Categories routes (protected with tenant isolation)
app.use('/categories', isolateTenant, categoryRoutes);

// AI API routes (protected)
app.use('/api/ai', aiRoutes);

// Chart API routes (protected with tenant isolation)
app.use('/api/charts', isolateTenant, chartRoutes);

// Notification API routes (protected with tenant isolation)
app.use('/api/notifications', notificationRoutes);

// Search API routes (protected with tenant isolation)
app.use('/api/search', searchRoutes);

// Stock History routes (protected with tenant isolation)
app.use('/stock-history', stockHistoryRoutes);

// Team routes (owner only)
app.use('/team', teamRoutes);

// Settings routes (authenticated users)
app.use('/settings', settingsRoutes);

// POS routes (authenticated users)
app.use('/pos', posRoutes);

// ======================
// Error Handling
// ======================

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('errors/404', {
        title: 'Page Not Found'
    });
});

// General Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', {
        title: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// ======================
// Start Server
// ======================

// Export for Vercel
export default app;

// Start Server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(PORT, () => {
        console.log(`✓ Server is running on http://localhost:${PORT}`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

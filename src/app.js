require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const socialAuthRoutes = require('./routes/socialAuthRoutes');
const { pool } = require('./config/database'); // 👈 import the database pool

// Import cleanup job (for production)
if (process.env.NODE_ENV === 'production') {
    require('./src/jobs/verificationCleanup');
}

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Session Store for Production (PostgreSQL) ----------
let sessionStore;
if (process.env.NODE_ENV === 'production') {
    const pgSession = require('connect-pg-simple')(session);
    sessionStore = new pgSession({
        pool: pool,                // Use the same pool as your app
        tableName: 'session',      // Name of the session table (will be created automatically)
        createTableIfMissing: true // Automatically create the table if it doesn't exist
    });
    console.log(' Using PostgreSQL session store');
}

// Session configuration
app.use(session({
    store: process.env.NODE_ENV === 'production' ? sessionStore : undefined, // use store only in production
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // helps with CSRF protection
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Success message middleware
app.use((req, res, next) => {
    res.locals.authMessage = req.session.authMessage || null;
    if (req.session.authMessage) {
        req.session.authMessage = null;
    }
    res.locals.user = req.user || null;
    next();
});

// Security middleware
app.use(helmet());

// ---------- CORS Configuration ----------
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000' // allow local dev even if env not set
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(' Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // allow cookies
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-api',
        environment: process.env.NODE_ENV
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(' Global error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ---------- Start server only if run directly (not imported by Vercel) ----------
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
        Server started!
        Port: ${PORT}
        Environment: ${process.env.NODE_ENV}
        Email Service: ${process.env.EMAIL_SERVICE || 'Not configured'}
        
        API Endpoints:
        POST  /api/auth/signup          - User registration
        POST  /api/auth/login           - User login
        POST  /api/auth/verify/verify   - Verify email
        POST  /api/auth/verify/resend   - Resend verification
        GET   /api/auth/verify/status   - Check verification status
        GET   /health                   - Health check
        `);
    });
}

module.exports = app;
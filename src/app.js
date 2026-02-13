require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const socialAuthRoutes = require('./routes/socialAuthRoutes');
const { pool } = require('./config/database'); // import the database pool

// Import cleanup job (for production)
if (process.env.NODE_ENV === 'production') {
    try {
        require('./src/jobs/verificationCleanup');
    } catch (err) {
        console.error(' Failed to load cleanup job:', err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Session Store for Production (PostgreSQL) ----------
let sessionStore;
if (process.env.NODE_ENV === 'production') {
    try {
        const pgSession = require('connect-pg-simple')(session);
        sessionStore = new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: true
        });
        console.log('✅ Using PostgreSQL session store');
    } catch (err) {
        console.error(' Failed to initialize PostgreSQL session store:', err.message);
        console.log('⚠️ Falling back to memory store (sessions will not persist across restarts)');
        // sessionStore remains undefined -> will use default memory store
    }
}

// Session configuration
app.use(session({
    store: process.env.NODE_ENV === 'production' ? sessionStore : undefined, // use store only in production if available
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
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('🚫 Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
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

// ---------- Test database route ----------
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        res.json({
            success: true,
            time: result.rows[0].time,
            message: 'Database connection successful'
        });
    } catch (err) {
        console.error(' Database test failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            message: 'Database connection failed'
        });
    }
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
        🚀 Server started!
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
        GET   /test-db                   - Test database connection
        `);
    });
}

module.exports = app;
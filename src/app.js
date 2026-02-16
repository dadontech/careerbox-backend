require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const socialAuthRoutes = require('./routes/socialAuthRoutes');
const { pool } = require('./config/database');

// Import cleanup job (for production)
if (process.env.NODE_ENV === 'production') {
    require('./jobs/verificationCleanup');
}

const app = express();

// express-rate-limit proxy issue
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

const PORT = process.env.PORT || 5000;

// ---------- Session Store for Production (PostgreSQL) ----------
let sessionStore;
if (process.env.NODE_ENV === 'production') {
    const pgSession = require('connect-pg-simple')(session);
    sessionStore = new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    });
    console.log(' Using PostgreSQL session store');
}

// ---------- Session Configuration ----------
app.use(session({
    store: process.env.NODE_ENV === 'production' ? sessionStore : undefined,
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// ---------- Initialize Passport ----------
app.use(passport.initialize());
app.use(passport.session());

// Success message middleware
app.use((req, res, next) => {
    res.locals.authMessage = req.session.authMessage || null;
    if (req.session.authMessage) req.session.authMessage = null;
    res.locals.user = req.user || null;
    next();
});

// ---------- Security ----------
app.use(helmet());

// ---------- CORS ----------
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.log(' Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.options('*', cors());

// ---------- Body Parser ----------
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ---------- Request Logging ----------
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// ---------- Root Route ----------
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'CareerBox Backend API is running',
        environment: process.env.NODE_ENV,
        endpoints: {
            auth: '/api/auth',
            health: '/health'
        },
        timestamp: new Date().toISOString()
    });
});

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);

// ---------- Health Check ----------
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-api',
        environment: process.env.NODE_ENV
    });
});

// ---------- Optional GET Test Routes (For Browser Testing) ----------
app.get('/test/signup', (req, res) => {
    res.send(`<h2>POST /api/auth/signup</h2>
              <p>Use Postman or curl to test this route.</p>`);
});

app.get('/test/login', (req, res) => {
    res.send(`<h2>POST /api/auth/login</h2>
              <p>Use Postman or curl to test this route.</p>`);
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
    console.error(' Global error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ---------- Start Server ----------
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
GET   /                           - Root API info
        `);
    });
}

module.exports = app;

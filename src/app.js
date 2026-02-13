require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const socialAuthRoutes = require('./routes/socialAuthRoutes');

// Import cleanup job (for production)
if (process.env.NODE_ENV === 'production') {
    require('./src/jobs/verificationCleanup');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());


// Success message middleware
app.use((req, res, next) => {
    // Make auth message available to all views
    res.locals.authMessage = req.session.authMessage || null;
    
    // Clear message after it's been displayed
    if (req.session.authMessage) {
        const tempMessage = req.session.authMessage;
        req.session.authMessage = null;
    }
    
    // Make user available to views
    res.locals.user = req.user || null;
    
    next();
});


// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

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
    console.error('Global error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
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

module.exports = app;
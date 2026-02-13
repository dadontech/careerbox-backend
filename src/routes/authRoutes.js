const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const verificationRoutes = require('./verificationRoutes');
const passport = require('passport');

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.'
    }
});

// Mount verification routes
router.use('/verify', verificationRoutes);

// Auth routes
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// ============ SOCIAL LOGIN ROUTES ============
// ... (your existing Google and LinkedIn routes – unchanged) ...

// ---------- Google OAuth ----------
router.get('/google', (req, res, next) => {
    if (req.query.state) {
        req.session.oauthRedirect = req.query.state;
    }
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectTo = req.session.oauthRedirect || '/dashboard';
        delete req.session.oauthRedirect;

        if (err) {
            console.error('Google auth error:', err);
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            const message = encodeURIComponent(user.authMessage || 'Successfully logged in with Google!');
            return res.redirect(`${frontendUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}&auth=success&message=${message}`);
        });
    })(req, res, next);
});

// ---------- LinkedIn OAuth ----------
router.get('/linkedin', (req, res, next) => {
    if (req.query.state) {
        req.session.oauthRedirect = req.query.state;
    }
    passport.authenticate('linkedin', {
        scope: ['openid', 'profile', 'email'],
        state: true
    })(req, res, next);
});

router.get('/linkedin/callback', (req, res, next) => {
    passport.authenticate('linkedin', (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectTo = req.session.oauthRedirect || '/dashboard';
        delete req.session.oauthRedirect;

        if (err) {
            console.error('LinkedIn auth error:', err);
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            const message = encodeURIComponent(user.authMessage || 'Successfully logged in with LinkedIn!');
            return res.redirect(`${frontendUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}&auth=success&message=${message}`);
        });
    })(req, res, next);
});

// ============ PASSWORD RESET ============
const passwordResetController = require('../controllers/passwordResetController');

// Request password reset (send 4-digit code)
router.post('/forgot-password', authLimiter, passwordResetController.forgotPassword);

// Verify reset code
router.post('/verify-reset-code', authLimiter, passwordResetController.verifyResetCode);

// Reset password (with verified code)
router.post('/reset-password', authLimiter, passwordResetController.resetPassword);

// =============================================

// Protected routes requiring email verification
router.get('/profile', authController.requireVerification, (req, res) => {
    res.json({ user: req.user });
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

module.exports = router;
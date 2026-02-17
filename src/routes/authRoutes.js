const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const authController = require('../controllers/authController');
const verificationRoutes = require('./verificationRoutes');
const passwordResetController = require('../controllers/passwordResetController');

// ============================================
// RATE LIMITING
// ============================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.'
    }
});

// ============================================
// MOUNT VERIFICATION ROUTES
// ============================================

router.use('/verify', verificationRoutes);

// ============================================
// BASIC AUTH ROUTES
// ============================================

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// ============================================
// SOCIAL LOGIN ROUTES (JWT VERSION)
// ============================================

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ---------- GOOGLE LOGIN ----------
router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', async (err, user) => {

        if (err) {
            console.error('Google auth error:', err);
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
        }

        if (!user) {
            return res.redirect(`${FRONTEND_URL}/login?error=user_not_found`);
        }

        try {
            //  Generate JWT
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const message = encodeURIComponent(
                user.authMessage || 'Successfully logged in with Google!'
            );

            return res.redirect(
                `${FRONTEND_URL}/auth/callback?token=${token}&auth=success&message=${message}`
            );

        } catch (error) {
            console.error('JWT generation error:', error);
            return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
        }

    })(req, res, next);
});

// ---------- LINKEDIN LOGIN ----------
router.get('/linkedin', (req, res, next) => {
    passport.authenticate('linkedin', {
        scope: ['openid', 'profile', 'email'],
        state: true
    })(req, res, next);
});

router.get('/linkedin/callback', (req, res, next) => {
    passport.authenticate('linkedin', async (err, user) => {

        if (err) {
            console.error('LinkedIn auth error:', err);
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
        }

        if (!user) {
            return res.redirect(`${FRONTEND_URL}/login?error=user_not_found`);
        }

        try {
            // 🔐 Generate JWT
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const message = encodeURIComponent(
                user.authMessage || 'Successfully logged in with LinkedIn!'
            );

            return res.redirect(
                `${FRONTEND_URL}/auth/callback?token=${token}&auth=success&message=${message}`
            );

        } catch (error) {
            console.error('JWT generation error:', error);
            return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
        }

    })(req, res, next);
});

// ============================================
// PASSWORD RESET
// ============================================

router.post('/forgot-password', authLimiter, passwordResetController.forgotPassword);
router.post('/verify-reset-code', authLimiter, passwordResetController.verifyResetCode);
router.post('/reset-password', authLimiter, passwordResetController.resetPassword);

// ============================================
// PROTECTED PROFILE ROUTE (JWT REQUIRED)
// ============================================

router.get('/profile', authController.requireVerification, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// ============================================
// LOGOUT (JWT VERSION)
// ============================================

router.post('/logout', (req, res) => {
    // JWT logout = frontend deletes token
    res.json({
        success: true,
        message: 'Logout successful. Please remove token on client side.'
    });
});

module.exports = router;

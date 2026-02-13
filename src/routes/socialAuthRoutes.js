const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const socialAuthController = require('../controllers/socialAuthController');

// ============ GOOGLE OAuth ============
// Initiate Google OAuth
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Google OAuth callback – session‑based, redirects to frontend
router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (err) {
            console.error('Google auth error:', err);
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            const message = encodeURIComponent(user.authMessage || 'Successfully logged in with Google!');
            return res.redirect(`${frontendUrl}/dashboard?auth=success&message=${message}`);
        });
    })(req, res, next);
});

// ============ LINKEDIN OAuth (OIDC) ============
// Initiate LinkedIn OAuth – ✅ OIDC scopes
router.get('/linkedin',
    passport.authenticate('linkedin', { 
        scope: ['openid', 'profile', 'email'],   // ✅ OIDC scopes
        state: true
    })
);

// LinkedIn OAuth callback – session‑based, redirects to frontend
router.get('/linkedin/callback', (req, res, next) => {
    passport.authenticate('linkedin', (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (err) {
            console.error('LinkedIn auth error:', err);
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            const message = encodeURIComponent(user.authMessage || 'Successfully logged in with LinkedIn!');
            return res.redirect(`${frontendUrl}/dashboard?auth=success&message=${message}`);
        });
    })(req, res, next);
});

// ============ LEGACY / STATELESS ROUTES (keep if needed) ============
// Social login failure endpoint (used by failureRedirect)
router.get('/failure', socialAuthController.socialLoginFailure);

// Get social user info (JWT‑based, if you still use it)
router.get('/user', socialAuthController.getSocialUser);

module.exports = router;
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verificationController = require('../controllers/verificationController');

// Rate limiting configurations
const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many verification attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 resends per hour
    message: {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many resend requests. Please try again in an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Verify email (4-digit code)
router.post(
    '/verify',
    verificationLimiter,
    verificationController.validateVerificationRequest,
    verificationController.verifyEmail
);

// Resend verification code
router.post(
    '/resend',
    resendLimiter,
    verificationController.resendVerification
);

// Check verification status
router.get(
    '/status',
    verificationController.checkStatus
);

// Admin route to cleanup expired codes (protected)
router.post(
    '/cleanup',
    (req, res, next) => {
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'Access denied'
            });
        }
        next();
    },
    async (req, res) => {
        try {
            const verificationService = require('../services/verificationService');
            const cleaned = await verificationService.cleanupExpiredCodes();

            res.json({
                success: true,
                message: `Cleaned up ${cleaned} expired verification codes`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'CLEANUP_FAILED',
                message: 'Failed to cleanup expired codes'
            });
        }
    }
);

module.exports = router;
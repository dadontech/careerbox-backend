const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token for social login
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || 'social_login_secret',
        { expiresIn: '7d' }
    );
};

// Handle social login success
exports.socialLoginSuccess = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=social_login_failed`);
        }
        
        const user = req.user;
        
        // Generate JWT token
        const token = generateToken(user.id, user.email);
        
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/social-callback?token=${token}&userId=${user.id}&email=${encodeURIComponent(user.email)}`);
        
    } catch (error) {
        console.error('Social login success error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};

// Handle social login failure
exports.socialLoginFailure = (req, res) => {
    console.error('Social login failed:', req.query.error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=${req.query.error || 'social_login_failed'}`);
};

// Get social login user info
exports.getSocialUser = async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'social_login_secret');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatar: user.avatar,
                emailVerified: user.email_verified
            }
        });
        
    } catch (error) {
        console.error('Get social user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
};
const User = require('../models/User');
const verificationService = require('../services/verificationService');

// Signup method
exports.signup = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Email and password are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_EMAIL',
                message: 'Please provide a valid email address'
            });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'WEAK_PASSWORD',
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'USER_EXISTS',
                message: 'A user with this email already exists'
            });
        }

        // Create user
        const user = await User.create(email, password, firstName, lastName);

        // Generate verification code
        const verificationCode = verificationService.generateCode(4);
        const userName = `${firstName} ${lastName}`.trim() || 'User';

        // Store code and send email
        await verificationService.storeVerificationCode(user.id, verificationCode);
        await verificationService.sendVerificationEmail(email, userName, verificationCode);

        // Don't include sensitive data in response
        const userResponse = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: false,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email for verification.',
            user: userResponse,
            requiresVerification: true
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle database errors
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(409).json({
                success: false,
                error: 'USER_EXISTS',
                message: 'A user with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'An error occurred while creating your account'
        });
    }
};

// Login method
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Email and password are required'
            });
        }

        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        const isMatch = await User.comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                emailVerified: user.email_verified
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'An error occurred while logging in'
        });
    }
};

// Email verification middleware
exports.requireVerification = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                error: 'EMAIL_NOT_VERIFIED',
                message: 'Please verify your email address to continue',
                requiresVerification: true
            });
        }

        next();
    } catch (error) {
        console.error('Verification middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'Internal server error'
        });
    }
};
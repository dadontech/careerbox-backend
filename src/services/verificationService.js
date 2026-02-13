// src/services/verificationService.js
const User = require('../models/User');
const emailService = require('./emailService');

class VerificationService {

    //  Generate 4-digit numeric string (default length = 4)
    generateCode(length = 4) {
        return Math.floor(
            Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)
        ).toString();
    }

    //  Store verification code + expiry
    async storeVerificationCode(userId, code) {
        const expiresAt = new Date();
        expiresAt.setMinutes(
            expiresAt.getMinutes() +
            parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || 10)
        );

        await User.updateVerificationCode(userId, code, expiresAt);
        console.log(`Verification code stored for user ${userId}`);
        return true;
    }

    //  Send verification email
    async sendVerificationEmail(email, name, code) {
        try {
            await emailService.sendVerificationEmail(email, name, code);
            console.log(`Verification email queued for ${email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error.message || error);
            throw new Error('SEND_FAILED');
        }
    }

    //  Verify user by email + code
    async verifyCode(email, code) {
        const user = await User.findByEmail(email);

        if (!user) throw new Error('USER_NOT_FOUND');
        if (user.email_verified) throw new Error('ALREADY_VERIFIED');
        if (!user.verification_code) throw new Error('NO_VERIFICATION_CODE');

        const now = new Date();
        if (user.verification_code_expires < now) throw new Error('CODE_EXPIRED');

        if (user.verification_code !== code) throw new Error('INVALID_CODE');

        //  Mark verified + clear code
        await User.markEmailVerified(user.id);
        console.log(`User ${user.id} email verified`);

        return { userId: user.id };
    }

    //  Resend verification code
    async resendVerificationCode(email) {
        const user = await User.findByEmail(email);
        if (!user) throw new Error('USER_NOT_FOUND');
        if (user.email_verified) throw new Error('ALREADY_VERIFIED');

        const code = this.generateCode();
        await this.storeVerificationCode(user.id, code);
        await this.sendVerificationEmail(email, user.first_name || 'User', code);

        return { message: 'Verification code resent successfully' };
    }

    //  Check verification status
    async checkVerificationStatus(email) {
        const user = await User.findByEmail(email);
        if (!user) throw new Error('USER_NOT_FOUND');

        return {
            email_verified: user.email_verified,
            verification_code_expires: user.verification_code_expires || null
        };
    }

    //  Optional: cleanup expired codes (for admin)
    async cleanupExpiredCodes() {
        const cleanedCount = await User.cleanupExpiredVerificationCodes();
        console.log(`Cleaned up ${cleanedCount} expired codes`);
        return cleanedCount;
    }
}

module.exports = new VerificationService();

const User = require('../models/User');
const verificationService = require('../services/verificationService');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

class PasswordResetController {
  // 1. Send 4-digit code to email
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email'
        });
      }

      // Generate 4-digit code (reuse your existing service)
      const code = verificationService.generateCode(4);
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

      // Store code with expiry (reuse your existing method)
      await verificationService.storeVerificationCode(user.id, code);
      
      // Send email (reuse your email service, maybe adjust subject/text)
      await emailService.sendPasswordResetEmail(email, userName, code);

      res.json({
        success: true,
        message: 'Password reset code sent to your email'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset code'
      });
    }
  }

  // 2. Verify the 4-digit code
  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email and code are required'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Use your existing verification logic
      if (!user.verification_code || !user.verification_code_expires) {
        return res.status(400).json({
          success: false,
          message: 'No reset code found. Please request a new one.'
        });
      }

      if (new Date() > user.verification_code_expires) {
        return res.status(400).json({
          success: false,
          message: 'Reset code has expired. Please request a new one.'
        });
      }

      if (user.verification_code !== code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset code'
        });
      }

      // Code is valid – do NOT clear it yet; we'll clear after password reset
      // Or we can mark a temporary flag in session/DB if needed.
      // Simple: just return success, frontend will then show password form.
      res.json({
        success: true,
        message: 'Code verified successfully'
      });
    } catch (error) {
      console.error('Verify reset code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify code'
      });
    }
  }

  // 3. Reset password (after code verified)
  async resetPassword(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify that the code was recently verified (we can check if code exists and is not expired)
      if (!user.verification_code || !user.verification_code_expires) {
        return res.status(400).json({
          success: false,
          message: 'No valid reset session. Please request a new code.'
        });
      }

      if (new Date() > user.verification_code_expires) {
        return res.status(400).json({
          success: false,
          message: 'Reset session expired. Please request a new code.'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear verification code
      await User.updatePassword(user.id, hashedPassword);
      await User.clearVerificationCode(user.id);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }
}

module.exports = new PasswordResetController();
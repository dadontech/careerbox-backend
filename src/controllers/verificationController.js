const verificationService = require("../services/verificationService");
const User = require("../models/User");

class VerificationController {
  // Send initial verification email
  async sendInitialVerification(req, res) {
    try {
      const { email, firstName, lastName } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          error: "ALREADY_VERIFIED",
          message: "Email is already verified",
        });
      }

      const code = verificationService.generateCode(4); // 4-digit code
      const userName = `${firstName} ${lastName}`.trim() || "User";

      await verificationService.storeVerificationCode(user.id, code); // store 4-digit code
      await verificationService.sendVerificationEmail(email, userName, code);

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Failed to send verification:", error);
      res.status(500).json({
        success: false,
        error: "SEND_FAILED",
        message: "Failed to send verification email",
      });
    }
  }

  async checkStatus(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "MISSING_EMAIL",
          message: "Email is required",
        });
      }

      const status = await verificationService.checkVerificationStatus(email);

      res.json({
        success: true,
        verified: status.email_verified,
        expires: status.verification_code_expires,
      });
    } catch (error) {
      console.error("Failed to check verification status:", error);

      const errorMap = {
        USER_NOT_FOUND: [404, "User not found"],
      };

      const [status, message] = errorMap[error.message] || [
        500,
        "Failed to check verification status",
      ];

      res.status(status).json({
        success: false,
        error: error.message,
        message,
      });
    }
  }

  // Verify email with code
  async verifyEmail(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          error: "MISSING_FIELDS",
          message: "Email and verification code are required",
        });
      }

      if (code.length !== 4 || !/^\d+$/.test(code)) {
        return res.status(400).json({
          success: false,
          error: "INVALID_CODE_FORMAT",
          message: "Verification code must be 4 digits",
        });
      }

      const result = await verificationService.verifyCode(email, code);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      res.json({
        success: true,
        message: "Email verified successfully",
        redirectUrl: `${frontendUrl}/onboarding-talent-user`,
        userId: result.userId,
      });
    } catch (error) {
      console.error("Verification failed:", error.message);

      const map = {
        USER_NOT_FOUND: [404, "User not found"],
        ALREADY_VERIFIED: [400, "Email already verified"],
        TOO_MANY_ATTEMPTS: [429, "Too many attempts"],
        CODE_EXPIRED: [400, "Code expired"],
        INVALID_CODE: [400, "Invalid verification code"],
      };

      const [status, message] = map[error.message] || [
        500,
        "Verification failed",
      ];

      res.status(status).json({
        success: false,
        error: error.message,
        message,
      });
    }
  }

  // Resend verification code
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "MISSING_EMAIL",
          message: "Email is required",
        });
      }

      const result = await verificationService.resendVerificationCode(email);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Resend verification failed:", error.message || error);

      const map = {
        USER_NOT_FOUND: [404, "User not found"],
        ALREADY_VERIFIED: [400, "Email already verified"],
        TOO_MANY_ATTEMPTS: [429, "Too many resend attempts"],
      };

      const [status, message] = map[error.message] || [500, "Resend failed"];

      res.status(status).json({
        success: false,
        error: error.message,
        message,
      });
    }
  }

  // Validation middleware
  validateVerificationRequest(req, res, next) {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Email and code required",
      });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_EMAIL",
        message: "Invalid email",
      });
    }

    if (code.length !== 4 || !/^\d+$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_CODE",
        message: "Verification code must be 4 digits",
      });
    }

    next();
  }
}

module.exports = new VerificationController();

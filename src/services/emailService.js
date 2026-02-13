// src/services/emailService.js
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

class EmailService {
    constructor() {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('SendGrid API key is not set in .env');
        }

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // ---------- VERIFICATION EMAIL (existing) ----------
    async sendVerificationEmail(email, name, verificationCode) {
        try {
            const msg = {
                to: email,
                from: {
                    email: process.env.EMAIL_FROM,
                    name: process.env.EMAIL_FROM_NAME || 'Your App'
                },
                subject: 'Verify Your Email Address',
                text: this.generateVerificationEmailText(name, verificationCode),
                html: this.generateVerificationEmailHTML(name, verificationCode)
            };

            const info = await sgMail.send(msg);
            console.log(` Verification email sent to ${email}`);
            return true;
        } catch (error) {
            console.error(' Failed to send verification email:', error.response?.body || error.message);
            throw new Error('Failed to send verification email');
        }
    }

    generateVerificationEmailHTML(name, code) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Verify Your Email</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #000; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9f9f9; }
                .code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background-color: #fff; border: 2px dashed #ddd; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header"><h1>Verify Your Email</h1></div>
            <div class="content">
                <h2>Hello ${name || 'there'},</h2>
                <p>Thank you for signing up! Please use the verification code below to complete your registration:</p>
                <div class="code">${code}</div>
                <p>⚠️ This code will expire in 10 minutes.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
                <p>Best regards,<br>The ${process.env.EMAIL_FROM_NAME || 'Your App'} Team</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Your App'}. All rights reserved.</p>
            </div>
        </body>
        </html>
        `;
    }

    generateVerificationEmailText(name, code) {
        return `
Hello ${name || 'there'},

Thank you for signing up! Please use the verification code below to complete your registration:

Verification Code: ${code}

⚠️ This code will expire in 10 minutes.

If you didn't request this verification, please ignore this email.

Best regards,
The ${process.env.EMAIL_FROM_NAME || 'Your App'} Team
        `;
    }

    // ---------- PASSWORD RESET EMAIL (new) ----------
    async sendPasswordResetEmail(email, name, resetCode) {
        try {
            const msg = {
                to: email,
                from: {
                    email: process.env.EMAIL_FROM,
                    name: process.env.EMAIL_FROM_NAME || 'Your App'
                },
                subject: 'Reset Your Password',
                text: this.generatePasswordResetEmailText(name, resetCode),
                html: this.generatePasswordResetEmailHTML(name, resetCode)
            };

            const info = await sgMail.send(msg);
            console.log(` Password reset email sent to ${email}`);
            return true;
        } catch (error) {
            console.error(' Failed to send password reset email:', error.response?.body || error.message);
            throw new Error('Failed to send password reset email');
        }
    }

    generatePasswordResetEmailHTML(name, code) {
        const expiryMinutes = process.env.VERIFICATION_CODE_EXPIRY_MINUTES || 10;
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reset Your Password</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #000; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9f9f9; }
                .code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background-color: #fff; border: 2px dashed #ddd; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header"><h1>Reset Your Password</h1></div>
            <div class="content">
                <h2>Hello ${name || 'there'},</h2>
                <p>We received a request to reset your password. Use the code below to proceed:</p>
                <div class="code">${code}</div>
                <p>⚠️ This code will expire in ${expiryMinutes} minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Best regards,<br>The ${process.env.EMAIL_FROM_NAME || 'Your App'} Team</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Your App'}. All rights reserved.</p>
            </div>
        </body>
        </html>
        `;
    }

    generatePasswordResetEmailText(name, code) {
        const expiryMinutes = process.env.VERIFICATION_CODE_EXPIRY_MINUTES || 10;
        return `
Hello ${name || 'there'},

We received a request to reset your password. Use the code below to proceed:

Reset Code: ${code}

⚠️ This code will expire in ${expiryMinutes} minutes.

If you didn't request this, please ignore this email.

Best regards,
The ${process.env.EMAIL_FROM_NAME || 'Your App'} Team
        `;
    }
}

module.exports = new EmailService();
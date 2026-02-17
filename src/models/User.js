const bcrypt = require('bcryptjs');
const { query } = require('../config/database');


class User {
    // ============ CREATE METHODS ============
    static async create(email, password, firstName = '', lastName = '') {
        try {
            let hashedPassword = null;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }

            const result = await query(
                `INSERT INTO users 
                 (email, password, first_name, last_name, email_verified, verification_code, verification_code_expires) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING id, email, first_name, last_name, email_verified, created_at, provider, provider_id, avatar_url`,
                [email, hashedPassword, firstName, lastName, false, null, null]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    static async createSocialUser(provider, providerId, email, firstName = '', lastName = '', avatarUrl = '') {
        try {
            const result = await query(
                `INSERT INTO users 
                 (email, password, first_name, last_name, email_verified, verification_code, verification_code_expires, provider, provider_id, avatar_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                 RETURNING id, email, first_name, last_name, email_verified, created_at, provider, provider_id, avatar_url`,
                [email, null, firstName, lastName, true, null, null, provider, providerId, avatarUrl]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Create social user error:', error);
            throw error;
        }
    }

    // ============ FIND METHODS ============
    static async findByEmail(email) {
        try {
            const result = await query(
                `SELECT * FROM users WHERE email = $1`,
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find user error:', error);
            return null;
        }
    }

    static async findByProvider(provider, providerId) {
        try {
            const result = await query(
                `SELECT * FROM users WHERE provider = $1 AND provider_id = $2`,
                [provider, providerId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find user by provider error:', error);
            return null;
        }
    }

    static async findById(id) {
        try {
            const result = await query(`SELECT * FROM users WHERE id = $1`, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find by ID error:', error);
            return null;
        }
    }

    // ============ UPDATE METHODS ============
    static async updateVerificationCode(userId, code, expiresAt) {
        try {
            await query(
                `UPDATE users 
                 SET verification_code = $1,
                     verification_code_expires = $2,
                     verification_sent_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [code, expiresAt, userId]
            );
            return true;
        } catch (error) {
            console.error('Update verification code error:', error);
            throw error;
        }
    }

    static async markEmailVerified(userId) {
        try {
            await query(
                `UPDATE users 
                 SET email_verified = true,
                     verification_code = NULL,
                     verification_code_expires = NULL
                 WHERE id = $1`,
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Mark email verified error:', error);
            throw error;
        }
    }

    static async updateSocialTokens(userId, accessToken, refreshToken = null) {
        try {
            await query(
                `UPDATE users 
                 SET social_access_token = $1,
                     social_refresh_token = $2
                 WHERE id = $3`,
                [accessToken, refreshToken, userId]
            );
            return true;
        } catch (error) {
            console.error('Update social tokens error:', error);
            throw error;
        }
    }

    static async updatePassword(userId, hashedPassword) {
        try {
            await query(
                `UPDATE users 
                 SET password = $1
                 WHERE id = $2`,
                [hashedPassword, userId]
            );
            return true;
        } catch (error) {
            console.error('Update password error:', error);
            throw error;
        }
    }

    static async clearVerificationCode(userId) {
        try {
            await query(
                `UPDATE users 
                 SET verification_code = NULL,
                     verification_code_expires = NULL
                 WHERE id = $1`,
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Clear verification code error:', error);
            throw error;
        }
    }

    static async updateProvider(userId, provider, providerId, avatarUrl = null) {
        try {
            const result = await query(
                `UPDATE users 
                 SET provider = $1, 
                     provider_id = $2,
                     avatar_url = COALESCE($3, avatar_url),
                     email_verified = true
                 WHERE id = $4
                 RETURNING *`,
                [provider, providerId, avatarUrl, userId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Update provider error:', error);
            throw error;
        }
    }

    // ============ SOCIAL LOGIN ============
    static async findOrCreateSocialUser(provider, providerData, email, firstName = '', lastName = '', avatarUrl = '') {
        try {
            let user = await User.findByProvider(provider, providerData.id);
            if (user) return { user, isNew: false };

            user = await User.findByEmail(email);
            if (user) {
                await User.updateProvider(user.id, provider, providerData.id, avatarUrl);
                return { user: await User.findById(user.id), isNew: false };
            }

            const newUser = await User.createSocialUser(provider, providerData.id, email, firstName, lastName, avatarUrl);
            return { user: newUser, isNew: true };
        } catch (error) {
            console.error('Find or create social user error:', error);
            throw error;
        }
    }

    // ============ PASSWORD HELPER ============
    static async comparePassword(password, hashedPassword) {
        if (!hashedPassword) return false;
        return await bcrypt.compare(password, hashedPassword);
    }

    static async cleanupExpiredVerificationCodes() {
        try {
            const result = await query(
                `UPDATE users 
                 SET verification_code = NULL,
                     verification_code_expires = NULL
                 WHERE verification_code_expires < NOW() 
                 RETURNING COUNT(*) as cleaned`
            );
            return parseInt(result.rows[0].cleaned);
        } catch (error) {
            console.error('Cleanup error:', error);
            return 0;
        }
    }
}

module.exports = User;

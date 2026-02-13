const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2-raviga').Strategy; // ✅ OIDC‑ready
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// ============ GOOGLE STRATEGY  ============
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        
        let user = await User.findByProvider('google', profile.id);
        if (user) {
            user.authMessage = 'Successfully logged in with Google!';
            return done(null, user);
        }
        
        user = await User.findByEmail(email);
        if (user) {
            if (!user.provider || user.provider !== 'google') {
                user.authMessage = 'Successfully logged in with Google!';
                return done(null, user);
            }
            user.authMessage = 'Successfully logged in with Google!';
            return done(null, user);
        }
        
        const newUser = await User.createSocialUser(
            'google',
            profile.id,
            email,
            profile.name.givenName || '',
            profile.name.familyName || '',
            profile.photos[0]?.value || ''
        );
        newUser.authMessage = 'Account created successfully with Google!';
        return done(null, newUser);
    } catch (error) {
        console.error('Google OAuth error:', error);
        if (error.code === '23505' && error.constraint === 'users_email_key') {
            try {
                const existingUser = await User.findByEmail(profile.emails[0].value);
                if (existingUser) {
                    existingUser.authMessage = 'Successfully logged in with Google!';
                    return done(null, existingUser);
                }
            } catch (findError) {
                return done(findError, null);
            }
        }
        return done(error, null);
    }
}));

// ============ LINKEDIN STRATEGY  ============
passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: '/api/auth/linkedin/callback',
    scope: ['openid', 'profile', 'email'],          // ✅ OIDC scopes
    state: true,
    // Explicit OIDC userinfo endpoint (ensures correct profile format)
    userProfileURL: 'https://api.linkedin.com/v2/userinfo'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // ---------- Extract OIDC profile fields ----------
        // profile.id is the 'sub' claim (stable user ID)
        const providerId = profile.id || profile._json?.sub;
        
        // Email can be in profile.emails[0].value or profile._json.email
        const email = profile.emails?.[0]?.value || profile._json?.email;
        if (!email) {
            return done(new Error('No email found from LinkedIn'), null);
        }

        // Name fields: OIDC uses given_name, family_name
        const firstName = profile.name?.givenName || profile._json?.given_name || '';
        const lastName = profile.name?.familyName || profile._json?.family_name || '';
        
        // Avatar URL
        const avatar = profile.photos?.[0]?.value || profile._json?.picture || '';

        // ---------- Use your existing findOrCreateSocialUser logic ----------
        // First, try to find by provider and provider_id
        let user = await User.findByProvider('linkedin', providerId);
        
        if (user) {
            user.authMessage = 'Successfully logged in with LinkedIn!';
            return done(null, user);
        }

        // If not found by provider, try to find by email
        user = await User.findByEmail(email);

        if (user) {
            // If user exists but with different provider or no provider, update it
            if (!user.provider || user.provider !== 'linkedin') {
                // ⚠️ Optional: update the user with LinkedIn ID here
                // (You may have an updateProvider method – if not, just return)
                user.authMessage = 'Successfully logged in with LinkedIn!';
                return done(null, user);
            }
            user.authMessage = 'Successfully logged in with LinkedIn!';
            return done(null, user);
        }

        // Create new user
        const newUser = await User.createSocialUser(
            'linkedin',
            providerId,
            email,
            firstName,
            lastName,
            avatar
        );

        newUser.authMessage = 'Account created successfully with LinkedIn!';
        return done(null, newUser);
    } catch (error) {
        console.error('LinkedIn OIDC error:', error);
        // If duplicate email error, try to find and return existing user
        if (error.code === '23505' && error.constraint === 'users_email_key') {
            try {
                const email = profile.emails?.[0]?.value || profile._json?.email;
                if (email) {
                    const existingUser = await User.findByEmail(email);
                    if (existingUser) {
                        existingUser.authMessage = 'Successfully logged in with LinkedIn!';
                        return done(null, existingUser);
                    }
                }
            } catch (findError) {
                return done(findError, null);
            }
        }
        return done(error, null);
    }
}));

module.exports = passport;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2-raviga').Strategy;
const User = require('../models/User');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// ================== SESSION HANDLING ==================

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// ================== GOOGLE STRATEGY ==================

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile?.emails?.length) {
            return done(new Error('Google account has no email'), null);
        }

        const providerId = profile.id;
        const email = profile.emails[0].value;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const avatar = profile.photos?.[0]?.value || '';

        // 1️⃣ Find by provider
        let user = await User.findByProvider('google', providerId);
        if (user) {
            user.authMessage = 'Successfully logged in with Google!';
            return done(null, user);
        }

        // 2️⃣ Find by email
        user = await User.findByEmail(email);
        if (user) {
            user.authMessage = 'Successfully logged in with Google!';
            return done(null, user);
        }

        // 3️⃣ Create new
        const newUser = await User.createSocialUser(
            'google',
            providerId,
            email,
            firstName,
            lastName,
            avatar
        );

        newUser.authMessage = 'Account created successfully with Google!';
        return done(null, newUser);

    } catch (error) {
        console.error('Google OAuth error:', error.message);
        return done(error, null);
    }
}));

// ================== LINKEDIN STRATEGY (OIDC) ==================

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/linkedin/callback`,
    scope: ['openid', 'profile', 'email'],
    state: true,
    userProfileURL: 'https://api.linkedin.com/v2/userinfo'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const providerId = profile.id || profile._json?.sub;
        const email = profile.emails?.[0]?.value || profile._json?.email;

        if (!email) {
            return done(new Error('No email found from LinkedIn'), null);
        }

        const firstName =
            profile.name?.givenName ||
            profile._json?.given_name ||
            '';

        const lastName =
            profile.name?.familyName ||
            profile._json?.family_name ||
            '';

        const avatar =
            profile.photos?.[0]?.value ||
            profile._json?.picture ||
            '';

        // 1️⃣ Find by provider
        let user = await User.findByProvider('linkedin', providerId);
        if (user) {
            user.authMessage = 'Successfully logged in with LinkedIn!';
            return done(null, user);
        }

        // 2️⃣ Find by email
        user = await User.findByEmail(email);
        if (user) {
            user.authMessage = 'Successfully logged in with LinkedIn!';
            return done(null, user);
        }

        // 3️⃣ Create new user
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
        console.error('LinkedIn OAuth error:', error.message);
        return done(error, null);
    }
}));

module.exports = passport;

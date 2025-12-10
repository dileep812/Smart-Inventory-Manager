import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import db from './db.js';

/**
 * Configure Passport.js with Local and Google OAuth Strategies
 */

// =============================================
// Local Strategy (Email/Password Login)
// =============================================
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const result = await db.query(
                `SELECT users.*, shops.name as shop_name 
                 FROM users 
                 JOIN shops ON users.shop_id = shops.id 
                 WHERE users.email = $1`,
                [email.toLowerCase().trim()]
            );

            if (result.rows.length === 0) {
                return done(null, false, { message: 'Invalid email or password' });
            }

            const user = result.rows[0];

            // Check if user has a password (Google-only users won't)
            if (!user.password_hash) {
                return done(null, false, { message: 'Please use Google to sign in' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                return done(null, false, { message: 'Invalid email or password' });
            }

            console.log(`✓ User logged in: ${user.email} (Shop: ${user.shop_name})`);
            return done(null, user);

        } catch (error) {
            console.error('Passport authentication error:', error.message);
            return done(error);
        }
    }
));

// =============================================
// Google OAuth Strategy (Only if credentials are configured)
// =============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails?.[0]?.value?.toLowerCase();
                const displayName = profile.displayName || 'User';
                const firstName = profile.name?.givenName || displayName.split(' ')[0];
                const avatarUrl = profile.photos?.[0]?.value || null;

                if (!email) {
                    return done(null, false, { message: 'No email found in Google profile' });
                }

                // Scenario A: Check if user exists with this Google ID (returning user)
                let result = await db.query(
                    `SELECT users.*, shops.name as shop_name 
                 FROM users 
                 JOIN shops ON users.shop_id = shops.id 
                 WHERE users.google_id = $1`,
                    [googleId]
                );

                if (result.rows.length > 0) {
                    console.log(`✓ Google user logged in: ${email}`);
                    return done(null, result.rows[0]);
                }

                // Scenario B: Check if user exists with this email (link accounts)
                result = await db.query(
                    `SELECT users.*, shops.name as shop_name 
                 FROM users 
                 JOIN shops ON users.shop_id = shops.id 
                 WHERE users.email = $1`,
                    [email]
                );

                if (result.rows.length > 0) {
                    // Link Google account to existing user
                    await db.query(
                        'UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3',
                        [googleId, avatarUrl, result.rows[0].id]
                    );
                    console.log(`✓ Linked Google account to existing user: ${email}`);
                    return done(null, result.rows[0]);
                }

                // Scenario C: New user - Auto signup (create shop + user)
                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');

                    // Step 1: Create a new Shop
                    const shopResult = await client.query(
                        `INSERT INTO shops (name) VALUES ($1) RETURNING id`,
                        [`${firstName}'s Shop`]
                    );
                    const shopId = shopResult.rows[0].id;

                    // Step 2: Create the User
                    const userResult = await client.query(
                        `INSERT INTO users (shop_id, email, password_hash, google_id, avatar_url, role)
                     VALUES ($1, $2, NULL, $3, $4, 'owner')
                     RETURNING *`,
                        [shopId, email, googleId, avatarUrl]
                    );

                    await client.query('COMMIT');

                    // Get the full user with shop name
                    const newUser = await db.query(
                        `SELECT users.*, shops.name as shop_name 
                     FROM users 
                     JOIN shops ON users.shop_id = shops.id 
                     WHERE users.id = $1`,
                        [userResult.rows[0].id]
                    );

                    console.log(`✓ New Google user signed up: ${email} (Shop: ${firstName}'s Shop)`);
                    return done(null, newUser.rows[0]);

                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }

            } catch (error) {
                console.error('Google OAuth error:', error.message);
                return done(error);
            }
        }
    ));
} else {
    console.warn('⚠️  Google OAuth not configured - Google login will be unavailable');
}

// =============================================
// Serialize/Deserialize User
// =============================================
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query(
            `SELECT users.id, users.shop_id, users.email, users.role, users.avatar_url, shops.name as shop_name 
             FROM users 
             JOIN shops ON users.shop_id = shops.id 
             WHERE users.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            console.warn(`⚠ Session invalidated: User ID ${id} not found in database`);
            return done(null, false);
        }

        const user = {
            id: result.rows[0].id,
            shopId: result.rows[0].shop_id,
            email: result.rows[0].email,
            role: result.rows[0].role,
            shopName: result.rows[0].shop_name,
            avatarUrl: result.rows[0].avatar_url
        };

        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport;

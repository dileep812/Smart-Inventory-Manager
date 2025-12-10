import pg from 'pg';

// Load environment variables if not already loaded
import 'dotenv/config';

// Use DATABASE_URL if available (cloud), otherwise use local credentials
const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Neon/Vercel Postgres
    }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };

const pool = new pg.Pool({
    ...dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
    // SSL logic is now handled in dbConfig
});

pool.on('error', (err) => {
    console.error('Database error:', err.message);
});

const query = (text, params) => pool.query(text, params);

export default { query, pool };
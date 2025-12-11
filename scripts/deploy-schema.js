import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploySchema() {
    console.log('🚀 Starting Database Deployment...');

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL environment variable is missing.');
        process.exit(1);
    }

    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Read schema.sql
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        console.log(`📖 Reading schema from ${schemaPath}...`);

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        console.log('⚡ Executing SQL queries on Cloud Database...');
        await pool.query(schemaSql);

        console.log('✅ Schema deployed successfully!');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('👋 Connection closed.');
    }
}

deploySchema();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not found in .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function applyStoredProcedure() {
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'build_from_raw_lines.sql');

    try {
        console.log(`Reading SQL file from: ${sqlFilePath}`);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Connecting to database and executing SQL...');
        const client = await pool.connect();
        try {
            await client.query(sql);
            console.log('Successfully applied stored procedure: build_from_raw_lines');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error applying stored procedure:');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyStoredProcedure();

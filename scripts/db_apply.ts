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

async function applyStoredProcedures() {
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const sqlFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sql'));

    const client = await pool.connect();
    try {
        for (const file of sqlFiles) {
            const sqlFilePath = path.join(scriptsDir, file);
            console.log(`Reading SQL file from: ${sqlFilePath}`);
            const sql = fs.readFileSync(sqlFilePath, 'utf8');

            console.log(`Executing ${file}...`);
            await client.query(sql);
            console.log(`Successfully applied: ${file}`);
        }
    } catch (error) {
        console.error('Error applying stored procedures:');
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

applyStoredProcedures();

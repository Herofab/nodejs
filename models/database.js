const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const poolConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000, // increased to 10s for remote DB reliability
};

if (connectionString) {
    poolConfig.connectionString = connectionString;
    // Cloud database hosts like Supabase require SSL
    if (connectionString.includes('supabase.co') || connectionString.includes('supabase.com') || process.env.DB_SSL === 'true') {
        poolConfig.ssl = {
            rejectUnauthorized: false
        };
    }
} else {
    poolConfig.host = process.env.DB_HOST || 'localhost';
    poolConfig.port = process.env.DB_PORT || 5432;
    poolConfig.database = process.env.DB_NAME || 'AADataBase';
    poolConfig.user = process.env.DB_USER || 'postgres';
    poolConfig.password = process.env.DB_PASSWORD || 'admin';
    
    if (process.env.DB_SSL === 'true' || 
        (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase.co') || process.env.DB_HOST.includes('supabase.com')))) {
        poolConfig.ssl = {
            rejectUnauthorized: false
        };
    }
}

const pool = new Pool(poolConfig);


// Test database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(-1);
});

// Initialize database using advanced migration
const initializeDatabase = async () => {
    try {
        const { runMigration } = require('../migrations/advanced-migration');
        await runMigration();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

module.exports = {
    pool,
    initializeDatabase
};
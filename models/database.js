const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'AADataBase',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                fingerprint_data TEXT,
                pin_hash VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        `);

        // Create sessions table for session storage
        await pool.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
            WITH (OIDS=FALSE);
        `);

        // Create login_attempts table for security
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address INET,
                attempt_type VARCHAR(50) NOT NULL,
                success BOOLEAN DEFAULT false,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create bottles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bottles (
                id SERIAL PRIMARY KEY,
                bottle_code VARCHAR(6) UNIQUE NOT NULL,
                bottle_type VARCHAR(10) NOT NULL CHECK (bottle_type IN ('0.5L', '1L', '5L', '20L')),
                qr_code_data TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'AtPlant' CHECK (status IN ('AtPlant', 'AtCustomer', 'AtVehicle')),
                description TEXT,
                manufacturing_date DATE DEFAULT CURRENT_DATE,
                expiry_date DATE,
                batch_number VARCHAR(50),
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_status_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create bottle_history table for status tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bottle_history (
                id SERIAL PRIMARY KEY,
                bottle_id INTEGER REFERENCES bottles(id) ON DELETE CASCADE,
                previous_status VARCHAR(20),
                new_status VARCHAR(20),
                changed_by INTEGER REFERENCES users(id),
                change_reason TEXT,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create default admin user if not exists
        const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@dashboard.com']);
        
        if (adminExists.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const defaultPassword = await bcrypt.hash('admin123', 12);
            const defaultPin = await bcrypt.hash('1234', 12);
            
            await pool.query(`
                INSERT INTO users (email, password_hash, pin_hash, role) 
                VALUES ($1, $2, $3, $4)
            `, ['admin@dashboard.com', defaultPassword, defaultPin, 'admin']);
            
            console.log('Default admin user created: admin@dashboard.com / admin123');
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

module.exports = {
    pool,
    initializeDatabase
};
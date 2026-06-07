const { pool } = require('./index');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  console.log('Starting database schema initialization on Supabase/PostgreSQL...');
  const client = await pool.connect();
  try {
    // 1. Enable UUID Extension if not exists
    console.log('Enabling uuid-ossp extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 2. Create Users Table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Issues Table
    console.log('Creating issues table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL CHECK (category IN ('pothole', 'street_light', 'leak', 'trash', 'road_block', 'other')),
        status VARCHAR(100) DEFAULT 'reported' CHECK (status IN ('reported', 'under_review', 'in_progress', 'resolved')),
        priority VARCHAR(100) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        latitude NUMERIC(10, 8) NOT NULL,
        longitude NUMERIC(11, 8) NOT NULL,
        address TEXT,
        reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Comments/Activity Log Table
    console.log('Creating comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status_changed_to VARCHAR(100),
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables verified/created successfully.');

    // 5. Seed Default Users
    console.log('Checking for default seed users...');
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    const count = parseInt(userCheck.rows[0].count, 10);

    if (count === 0) {
      console.log('Seeding default users...');

      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const citizenPasswordHash = await bcrypt.hash('citizen123', 10);

      // Seed Admin
      await client.query(`
        INSERT INTO users (email, password_hash, role, full_name)
        VALUES ($1, $2, $3, $4)
      `, ['admin@civic.gov', adminPasswordHash, 'admin', 'Chief Administrator']);

      // Seed Citizen
      await client.query(`
        INSERT INTO users (email, password_hash, role, full_name)
        VALUES ($1, $2, $3, $4)
      `, ['citizen@civic.gov', citizenPasswordHash, 'citizen', 'John Doe']);

      console.log('Seed data successfully loaded!');
      console.log('-------------------------------------------');
      console.log('DEMO ACCOUNTS READY TO USE:');
      console.log('1. Admin: admin@civic.gov / admin123');
      console.log('2. Citizen: citizen@civic.gov / citizen123');
      console.log('-------------------------------------------');
    } else {
      console.log('Users database already populated. Skipping seeds.');
    }
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute directly if run via node db/init.js
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization script completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization script failed:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;

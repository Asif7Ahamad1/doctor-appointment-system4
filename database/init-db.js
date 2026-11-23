require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  console.log('--- Initializing Doctor Appointment MySQL Database ---');
  
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = Number(process.env.DB_PORT) || 3306;
  const dbName = process.env.DB_NAME || 'doctor_appointment_db';

  console.log(`Connecting to MySQL at ${host}:${port} as user '${user}'...`);

  let connection;
  try {
    // 1. First connect without specifying database to create it if needed
    connection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      multipleStatements: true
    });

    console.log(`Creating database '${dbName}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema and initial doctor seeds...');
    await connection.query(schemaSql);

    console.log(' Database initialization completed successfully!');
    console.log('Tables created: `doctors`, `appointments` with sample doctors ready.');
  } catch (error) {
    console.error(' Database Initialization Error:');
    if (error.code === 'ECONNREFUSED') {
      console.error(`Cannot connect to MySQL server at ${host}:${port}.`);
      console.error('Please ensure your MySQL service (e.g., MySQL Server, XAMPP, or Docker) is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`Access denied for user '${user}'. Please check your DB_USER and DB_PASSWORD in .env file.`);
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };

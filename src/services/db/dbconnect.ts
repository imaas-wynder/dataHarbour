import { Pool } from 'pg';

// Load environment variables (if you're using .env)
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// Export a function to get a client from the pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error acquiring database client:', error);
    throw error;
  }
};

// Export the pool directly if you prefer to manage connections elsewhere
export { pool, getClient };
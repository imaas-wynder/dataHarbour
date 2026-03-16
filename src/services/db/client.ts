import { getPool } from '../database';

// Re-use the existing connection pool from the main database service
const pool = getPool();

export default pool;
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { URL } from 'url';
import dns from 'dns';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Set default DNS order to prefer IPv4 (Node.js 17.4+)
// This ensures IPv4 is tried first when resolving hostnames, avoiding IPv6 ENETUNREACH errors
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export function createPgPool(): Pool {
  // If DATABASE_URL is provided (Supabase/Render), parse it to individual params
  // This avoids IPv6 issues and SSL conflicts with connectionString
  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      
      // Decode password (URLs can have special characters)
      const password = decodeURIComponent(dbUrl.password || '');
      
      return new Pool({
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port || '5432', 10),
        database: dbUrl.pathname.slice(1), // Remove leading '/'
        user: dbUrl.username,
        password: password,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
      });
    } catch (error) {
      // If parsing fails, fall back to connectionString
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
      });
    }
  }

  // Otherwise, fall back to individual environment variables (local dev)
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'f1_race_engineer_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'test123',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

export type PgPool = Pool;


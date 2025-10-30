/**
 * Supabase Database Connection
 * Singleton instance for database operations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  throw new Error('Supabase credentials not configured');
}

// Create Supabase client with service role key
// Service role bypasses RLS - use carefully!
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create client for user-level operations (respects RLS)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDbStats() {
  try {
    const [categories, items, nicknames, sessions] = await Promise.all([
      supabase.from('catalog_categories').select('count'),
      supabase.from('catalog_items').select('count'),
      supabase.from('nicknames_pool').select('count'),
      supabase.from('sessions').select('count')
    ]);

    return {
      categories: categories.count || 0,
      items: items.count || 0,
      nicknames: nicknames.count || 0,
      sessions: sessions.count || 0
    };
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return null;
  }
}

export default supabase;

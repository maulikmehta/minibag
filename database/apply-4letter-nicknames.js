/**
 * Apply 4-Letter Nicknames Migration to Supabase
 * Runs migration 037_add_4letter_nicknames.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('📄 Adding 4-Letter Nicknames to Supabase...\n');

  try {
    // Read SQL file
    const sqlPath = join(__dirname, '037_add_4letter_nicknames.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Extract just the INSERT statement (Supabase RPC doesn't support DO blocks)
    // We'll insert the data and then verify manually
    const nicknames = [
      // Male Names (44)
      { nickname: 'Aadi', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ajay', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Amar', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Amit', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Anil', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ansh', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Arun', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Arya', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ashu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Atul', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Bala', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Chet', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Deep', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Dhir', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Eesh', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Firo', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Gyan', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Hari', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Indu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Jeet', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Kavi', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Laav', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Manu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Neel', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ojas', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Prem', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ravi', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Sahil', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Tegh', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Uday', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Veer', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Yash', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Zain', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Abhi', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Biju', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Raju', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Sonu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Babu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Mani', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ramu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Venu', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Shan', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Giri', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Kris', avatar_emoji: '👨', gender: 'male', language_origin: 'hindi', difficulty_level: 'easy' },

      // Female Names (46)
      { nickname: 'Adya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Anvi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Anya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Arti', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Asha', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Bina', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Devi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Diya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ekta', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Gita', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Hema', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Isha', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Jaya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Kala', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Lata', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Maya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Nita', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ojal', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Pari', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Riya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Sara', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Tara', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Usha', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Vani', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Zara', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Aarti', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Bhumi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Chhavi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Gauri', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Kavya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Neha', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Pooja', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Radha', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Saavi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Sita', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Veda', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Zoya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ammu', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Charu', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Divya', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Ganga', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Indira', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Jhansi', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Kamla', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Manju', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
      { nickname: 'Nanda', avatar_emoji: '👩', gender: 'female', language_origin: 'hindi', difficulty_level: 'easy' },
    ];

    console.log(`📥 Inserting ${nicknames.length} 4-letter nicknames...`);

    let inserted = 0;
    let skipped = 0;

    for (const nickname of nicknames) {
      const { data, error } = await supabase
        .from('nicknames_pool')
        .insert(nickname)
        .select();

      if (error) {
        if (error.code === '23505') { // Duplicate key
          skipped++;
          console.log(`  ⊘ Skipped (already exists): ${nickname.nickname}`);
        } else {
          console.error(`  ✗ Error inserting ${nickname.nickname}:`, error.message);
        }
      } else {
        inserted++;
        console.log(`  ✓ Inserted: ${nickname.nickname}`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`\nSummary:`);
    console.log(`  ✓ Inserted: ${inserted} nicknames`);
    console.log(`  ⊘ Skipped: ${skipped} nicknames`);

    // Verify counts
    const { data: counts } = await supabase
      .from('nicknames_pool')
      .select('gender');

    const maleCount = counts.filter(n => n.gender === 'male').length;
    const femaleCount = counts.filter(n => n.gender === 'female').length;
    const totalCount = counts.length;

    console.log(`\n📊 Database verification:`);
    console.log(`  Male nicknames: ${maleCount}`);
    console.log(`  Female nicknames: ${femaleCount}`);
    console.log(`  Total: ${totalCount}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

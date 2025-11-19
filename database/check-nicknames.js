/**
 * Check current nickname pool status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkNicknames() {
  const { data: all } = await supabase
    .from('nicknames_pool')
    .select('nickname, gender, is_available')
    .order('nickname');

  const byLength = {};
  all.forEach(n => {
    const len = n.nickname.length;
    if (!byLength[len]) byLength[len] = { available: 0, total: 0 };
    byLength[len].total++;
    if (n.is_available) byLength[len].available++;
  });

  console.log('\n📊 Nicknames by length:');
  Object.keys(byLength).sort().forEach(len => {
    const { available, total } = byLength[len];
    console.log(`  ${len}-letter: ${available}/${total} available`);
  });

  console.log('\n🔤 Sample available 3-letter names:');
  const three = all.filter(n => n.nickname.length === 3 && n.is_available).slice(0, 10);
  three.forEach(n => console.log(`    ${n.nickname} (${n.gender})`));

  console.log('\n🔤 Sample available 4-letter names:');
  const four = all.filter(n => n.nickname.length === 4 && n.is_available).slice(0, 10);
  four.forEach(n => console.log(`    ${n.nickname} (${n.gender})`));
}

checkNicknames();

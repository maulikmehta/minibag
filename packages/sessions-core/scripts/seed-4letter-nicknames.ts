/**
 * Seed 4-Letter Nicknames Script
 *
 * This script populates the nicknames_pool table with 90 4-letter Indian names
 * (44 male, 46 female) for better gender identification and expanded nickname pool.
 *
 * Usage: node scripts/seed-4letter-nicknames.js
 */

import { getDatabaseClient, disconnectDatabase } from '../src/database/client.js';

// 4-letter male names (44 total)
const MALE_NAMES = [
  'Aadi', 'Ajay', 'Amar', 'Amit', 'Anil', 'Ansh', 'Arun', 'Arya',
  'Ashu', 'Atul', 'Bala', 'Chet', 'Deep', 'Dhir', 'Eesh', 'Firo',
  'Gaur', 'Guru', 'Hari', 'Ishu', 'Jain', 'Jeet', 'Jitu', 'Kavi',
  'Kush', 'Lalu', 'Manu', 'Neel', 'Ojas', 'Prem', 'Puru', 'Qais',
  'Raam', 'Raju', 'Ravi', 'Sanu', 'Shiv', 'Sonu', 'Teja', 'Uday',
  'Vasu', 'Veer', 'Yash', 'Zain'
];

// 4-letter female names (46 total)
const FEMALE_NAMES = [
  'Adya', 'Anvi', 'Anya', 'Arti', 'Asha', 'Bina', 'Devi', 'Diya',
  'Esha', 'Fiza', 'Gita', 'Hema', 'Indu', 'Isha', 'Jaya', 'Kira',
  'Lata', 'Lila', 'Mala', 'Maya', 'Mira', 'Neha', 'Nila', 'Nita',
  'Noor', 'Osha', 'Pari', 'Puja', 'Rani', 'Renu', 'Rina', 'Ritu',
  'Riya', 'Sana', 'Shri', 'Sita', 'Soni', 'Tanu', 'Tara', 'Tina',
  'Urvi', 'Usha', 'Vani', 'Veda', 'Yami', 'Zara'
];

async function seedNicknames() {
  const prisma = getDatabaseClient();

  console.log('🌱 Starting nickname seeding process...\n');

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Seed male nicknames
    console.log(`📝 Seeding ${MALE_NAMES.length} male nicknames...`);
    for (const name of MALE_NAMES) {
      try {
        await prisma.nicknamesPool.create({
          data: {
            nickname: name,
            avatarEmoji: '👨',
            gender: 'male',
            isAvailable: true,
            timesUsed: 0
          }
        });
        inserted++;
        process.stdout.write('.');
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - nickname already exists
          skipped++;
          process.stdout.write('s');
        } else {
          errors++;
          console.error(`\n❌ Error inserting '${name}':`, error.message);
        }
      }
    }

    console.log('\n');

    // Seed female nicknames
    console.log(`📝 Seeding ${FEMALE_NAMES.length} female nicknames...`);
    for (const name of FEMALE_NAMES) {
      try {
        await prisma.nicknamesPool.create({
          data: {
            nickname: name,
            avatarEmoji: '👩',
            gender: 'female',
            isAvailable: true,
            timesUsed: 0
          }
        });
        inserted++;
        process.stdout.write('.');
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - nickname already exists
          skipped++;
          process.stdout.write('s');
        } else {
          errors++;
          console.error(`\n❌ Error inserting '${name}':`, error.message);
        }
      }
    }

    console.log('\n');

    // Summary
    console.log('✅ Seeding complete!\n');
    console.log('Summary:');
    console.log(`  ✓ Inserted: ${inserted} nicknames`);
    console.log(`  ⊘ Skipped (already exist): ${skipped} nicknames`);
    console.log(`  ✗ Errors: ${errors} nicknames`);
    console.log(`\n📊 Total nicknames in pool: ${inserted + skipped}`);

    // Verify counts
    const maleCount = await prisma.nicknamesPool.count({
      where: { gender: 'male' }
    });
    const femaleCount = await prisma.nicknamesPool.count({
      where: { gender: 'female' }
    });

    console.log(`\n🔍 Database verification:`);
    console.log(`  Male nicknames: ${maleCount}`);
    console.log(`  Female nicknames: ${femaleCount}`);
    console.log(`  Total: ${maleCount + femaleCount}`);

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run the seed function
seedNicknames()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });

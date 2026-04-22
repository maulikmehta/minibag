/**
 * Nickname Reservation Functions
 * Prevents race conditions when multiple users select nicknames simultaneously
 */

import { getDatabaseClient } from '../database/client.js';
import { NicknameOption } from './types.js';
import { nanoid } from 'nanoid';

// Fallback nickname lists (when pool is exhausted)
// 4-letter names for better gender identification and expanded pool
const FALLBACK_MALE_NAMES = [
  'Aadi', 'Ajay', 'Amar', 'Amit', 'Anil', 'Ansh', 'Arun', 'Arya',
  'Ashu', 'Atul', 'Bala', 'Chet', 'Deep', 'Dhir', 'Eesh', 'Firo',
  'Gaur', 'Guru', 'Hari', 'Ishu', 'Jain', 'Jeet', 'Jitu', 'Kavi',
  'Kush', 'Lalu', 'Manu', 'Neel', 'Ojas', 'Prem', 'Puru', 'Qais',
  'Raam', 'Raju', 'Ravi', 'Sanu', 'Shiv', 'Sonu', 'Teja', 'Uday',
  'Vasu', 'Veer', 'Yash', 'Zain'
];

const FALLBACK_FEMALE_NAMES = [
  'Adya', 'Anvi', 'Anya', 'Arti', 'Asha', 'Bina', 'Devi', 'Diya',
  'Esha', 'Fiza', 'Gita', 'Hema', 'Indu', 'Isha', 'Jaya', 'Kira',
  'Lata', 'Lila', 'Mala', 'Maya', 'Mira', 'Neha', 'Nila', 'Nita',
  'Noor', 'Osha', 'Pari', 'Puja', 'Rani', 'Renu', 'Rina', 'Ritu',
  'Riya', 'Sana', 'Shri', 'Sita', 'Soni', 'Tanu', 'Tara', 'Tina',
  'Urvi', 'Usha', 'Vani', 'Veda', 'Yami', 'Zara'
];

/**
 * Reserve a nickname with 5-minute TTL
 * @param nicknameId - Nickname ID to reserve
 * @param sessionId - Session ID reserving the nickname
 * @returns Reserved nickname or null if unavailable
 */
export async function reserveNickname(
  nicknameId: string,
  sessionId: string
): Promise<{ data: any | null; error: Error | null }> {
  if (!nicknameId || !sessionId) {
    return { data: null, error: new Error('nicknameId and sessionId required') };
  }

  const prisma = getDatabaseClient();
  const reservationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const now = new Date();

  try {
    // Use Prisma's update with complex where clause
    // Only update if: is_available = true AND (reserved_until is null OR reserved_until < now)
    const nickname = await prisma.nicknamesPool.updateMany({
      where: {
        id: nicknameId,
        isAvailable: true,
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lt: now } }
        ]
      },
      data: {
        reservedUntil: reservationExpiry,
        reservedBySession: sessionId
      }
    });

    if (nickname.count === 0) {
      return { data: null, error: new Error('Nickname not available') };
    }

    // Fetch the updated nickname
    const updated = await prisma.nicknamesPool.findUnique({
      where: { id: nicknameId }
    });

    return { data: updated, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get 2 available nickname options (1 male, 1 female)
 * Optionally matches first letter of user's name for personalization
 * Nicknames are reserved for 5 minutes to prevent race conditions
 *
 * @param firstLetter - First letter of user's name for personalization
 * @param sessionId - Session ID for reservation (uses session.id UUID, not text session_id)
 * @returns Array of 2 nickname options
 */
export async function getTwoNicknameOptions(
  firstLetter: string | null = null,
  sessionId: string | null = null
): Promise<NicknameOption[]> {
  const prisma = getDatabaseClient();
  let maleOption: NicknameOption | null = null;
  let femaleOption: NicknameOption | null = null;

  // Generate a temporary session ID if none provided (for reservation tracking)
  const tempSessionId = sessionId || `temp-${Date.now()}`;
  const now = new Date();

  // If firstLetter provided, try to find matching nicknames
  if (firstLetter) {
    const upperLetter = firstLetter.toUpperCase();

    // Try to get male nickname starting with letter
    const matchedMale = await prisma.nicknamesPool.findFirst({
      where: {
        isAvailable: true,
        gender: 'male',
        nickname: { startsWith: upperLetter, mode: 'insensitive' },
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lt: now } }
        ]
      }
    });

    // Immediately reserve if found
    if (matchedMale && sessionId) {
      const { data: reserved } = await reserveNickname(matchedMale.id, tempSessionId);
      if (reserved) {
        maleOption = {
          id: reserved.id,
          nickname: reserved.nickname,
          avatar_emoji: reserved.avatarEmoji,
          gender: reserved.gender as 'male' | 'female'
        };
      }
    } else if (matchedMale) {
      maleOption = {
        id: matchedMale.id,
        nickname: matchedMale.nickname,
        avatar_emoji: matchedMale.avatarEmoji,
        gender: matchedMale.gender as 'male' | 'female'
      };
    }

    // Try to get female nickname starting with letter
    const matchedFemale = await prisma.nicknamesPool.findFirst({
      where: {
        isAvailable: true,
        gender: 'female',
        nickname: { startsWith: upperLetter, mode: 'insensitive' },
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lt: now } }
        ]
      }
    });

    // Immediately reserve if found
    if (matchedFemale && sessionId) {
      const { data: reserved } = await reserveNickname(matchedFemale.id, tempSessionId);
      if (reserved) {
        femaleOption = {
          id: reserved.id,
          nickname: reserved.nickname,
          avatar_emoji: reserved.avatarEmoji,
          gender: reserved.gender as 'male' | 'female'
        };
      }
    } else if (matchedFemale) {
      femaleOption = {
        id: matchedFemale.id,
        nickname: matchedFemale.nickname,
        avatar_emoji: matchedFemale.avatarEmoji,
        gender: matchedFemale.gender as 'male' | 'female'
      };
    }
  }

  // Fallback: If we don't have both genders with matching letter, get any available
  if (!maleOption) {
    const anyMale = await prisma.nicknamesPool.findFirst({
      where: {
        isAvailable: true,
        gender: 'male',
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lt: now } }
        ]
      }
    });

    // Immediately reserve if found
    if (anyMale && sessionId) {
      const { data: reserved } = await reserveNickname(anyMale.id, tempSessionId);
      if (reserved) {
        maleOption = {
          id: reserved.id,
          nickname: reserved.nickname,
          avatar_emoji: reserved.avatarEmoji,
          gender: reserved.gender as 'male' | 'female'
        };
      }
    } else if (anyMale) {
      maleOption = {
        id: anyMale.id,
        nickname: anyMale.nickname,
        avatar_emoji: anyMale.avatarEmoji,
        gender: anyMale.gender as 'male' | 'female'
      };
    }
  }

  if (!femaleOption) {
    const anyFemale = await prisma.nicknamesPool.findFirst({
      where: {
        isAvailable: true,
        gender: 'female',
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lt: now } }
        ]
      }
    });

    // Immediately reserve if found
    if (anyFemale && sessionId) {
      const { data: reserved } = await reserveNickname(anyFemale.id, tempSessionId);
      if (reserved) {
        femaleOption = {
          id: reserved.id,
          nickname: reserved.nickname,
          avatar_emoji: reserved.avatarEmoji,
          gender: reserved.gender as 'male' | 'female'
        };
      }
    } else if (anyFemale) {
      femaleOption = {
        id: anyFemale.id,
        nickname: anyFemale.nickname,
        avatar_emoji: anyFemale.avatarEmoji,
        gender: anyFemale.gender as 'male' | 'female'
      };
    }
  }

  // Build options array
  const options: NicknameOption[] = [];

  if (maleOption) {
    options.push(maleOption);
  }

  if (femaleOption) {
    options.push(femaleOption);
  }

  // Fallback: If we couldn't find nicknames in pool, generate fallback options
  if (!maleOption) {
    options.push({
      id: `fallback-male-${nanoid(16)}`,
      nickname: FALLBACK_MALE_NAMES[Math.floor(Math.random() * FALLBACK_MALE_NAMES.length)],
      avatar_emoji: '👨',
      gender: 'male',
      fallback: true
    });
  }

  if (!femaleOption) {
    options.push({
      id: `fallback-female-${nanoid(16)}`,
      nickname: FALLBACK_FEMALE_NAMES[Math.floor(Math.random() * FALLBACK_FEMALE_NAMES.length)],
      avatar_emoji: '👩',
      gender: 'female',
      fallback: true
    });
  }

  return options;
}

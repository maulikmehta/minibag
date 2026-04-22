/**
 * Nickname Pool Types
 * For anonymous participation in sessions
 */

export interface Nickname {
  id: string;
  nickname: string;
  avatarEmoji: string;
  gender: string | null;
  isAvailable: boolean;
  currentlyUsedIn: string | null;
  reservedUntil: Date | null;
  reservedBySession: string | null;
  timesUsed: number;
  lastUsed: Date | null;
  languageOrigin: string | null;
  createdAt: Date;
  fallback?: boolean;
}

export interface NicknameOption {
  id: string;
  nickname: string;
  avatar_emoji: string;
  gender: 'male' | 'female';
  fallback?: boolean;
}

export interface ReserveNicknameResult {
  data: Nickname | null;
  error: Error | null;
}

export interface MarkNicknameUsedResult {
  data: Nickname[] | null;
  error: Error | null;
}

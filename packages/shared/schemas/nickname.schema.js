/**
 * Nickname Pool Schema - 3-letter names for anonymous identities
 */

export const nicknameSchema = {
  nickname: "string",
  avatar_emoji: "string",
  
  is_available: "boolean",
  currently_used_in: "string",
  
  times_used: "number",
  last_used: "timestamp",
  created_at: "timestamp",
  
  gender: "string",
  language_origin: "string",
  difficulty_level: "string"
};

export const nicknameRules = {
  autoReleaseHours: 24,
  maxConcurrentUse: 1,
  cooldownMinutes: 30,
  
  minAvailablePool: 50,
  maxUsageBeforeRest: 100,
  restPeriodHours: 168,
  
  preferLocalLanguage: true,
  genderNeutralDefault: true,
  easyPronunciationFirst: true,
  
  preferUnused: true,
  languageRotation: true,
  
  noPersonalData: true,
  autoExpireOnSessionEnd: true
};

-- Migration 037: Add 4-Letter Nicknames to Pool
-- Purpose: Replace 3-letter nicknames with 4-letter ones for better recognition
-- Created: 2025-11-19
-- Database: Supabase (minibag-2)

-- =============================================================================
-- Add 4-Letter Nicknames
-- =============================================================================

INSERT INTO nicknames_pool (nickname, avatar_emoji, gender, language_origin, difficulty_level) VALUES
-- Male Names (4 letters) - 44 total
('Aadi', '👨', 'male', 'hindi', 'easy'),
('Ajay', '👨', 'male', 'hindi', 'easy'),
('Amar', '👨', 'male', 'hindi', 'easy'),
('Amit', '👨', 'male', 'hindi', 'easy'),
('Anil', '👨', 'male', 'hindi', 'easy'),
('Ansh', '👨', 'male', 'hindi', 'easy'),
('Arun', '👨', 'male', 'hindi', 'easy'),
('Arya', '👨', 'male', 'hindi', 'easy'),
('Ashu', '👨', 'male', 'hindi', 'easy'),
('Atul', '👨', 'male', 'hindi', 'easy'),
('Bala', '👨', 'male', 'hindi', 'easy'),
('Chet', '👨', 'male', 'hindi', 'easy'),
('Deep', '👨', 'male', 'hindi', 'easy'),
('Dhir', '👨', 'male', 'hindi', 'easy'),
('Eesh', '👨', 'male', 'hindi', 'easy'),
('Firo', '👨', 'male', 'hindi', 'easy'),
('Gyan', '👨', 'male', 'hindi', 'easy'),
('Hari', '👨', 'male', 'hindi', 'easy'),
('Indu', '👨', 'male', 'hindi', 'easy'),
('Jeet', '👨', 'male', 'hindi', 'easy'),
('Kavi', '👨', 'male', 'hindi', 'easy'),
('Laav', '👨', 'male', 'hindi', 'easy'),
('Manu', '👨', 'male', 'hindi', 'easy'),
('Neel', '👨', 'male', 'hindi', 'easy'),
('Ojas', '👨', 'male', 'hindi', 'easy'),
('Prem', '👨', 'male', 'hindi', 'easy'),
('Ravi', '👨', 'male', 'hindi', 'easy'),
('Sahil', '👨', 'male', 'hindi', 'easy'),
('Tegh', '👨', 'male', 'hindi', 'easy'),
('Uday', '👨', 'male', 'hindi', 'easy'),
('Veer', '👨', 'male', 'hindi', 'easy'),
('Yash', '👨', 'male', 'hindi', 'easy'),
('Zain', '👨', 'male', 'hindi', 'easy'),
('Abhi', '👨', 'male', 'hindi', 'easy'),
('Biju', '👨', 'male', 'hindi', 'easy'),
('Raju', '👨', 'male', 'hindi', 'easy'),
('Sonu', '👨', 'male', 'hindi', 'easy'),
('Babu', '👨', 'male', 'hindi', 'easy'),
('Mani', '👨', 'male', 'hindi', 'easy'),
('Ramu', '👨', 'male', 'hindi', 'easy'),
('Venu', '👨', 'male', 'hindi', 'easy'),
('Shan', '👨', 'male', 'hindi', 'easy'),
('Giri', '👨', 'male', 'hindi', 'easy'),
('Kris', '👨', 'male', 'hindi', 'easy'),

-- Female Names (4 letters) - 46 total
('Adya', '👩', 'female', 'hindi', 'easy'),
('Anvi', '👩', 'female', 'hindi', 'easy'),
('Anya', '👩', 'female', 'hindi', 'easy'),
('Arti', '👩', 'female', 'hindi', 'easy'),
('Asha', '👩', 'female', 'hindi', 'easy'),
('Bina', '👩', 'female', 'hindi', 'easy'),
('Devi', '👩', 'female', 'hindi', 'easy'),
('Diya', '👩', 'female', 'hindi', 'easy'),
('Ekta', '👩', 'female', 'hindi', 'easy'),
('Gita', '👩', 'female', 'hindi', 'easy'),
('Hema', '👩', 'female', 'hindi', 'easy'),
('Isha', '👩', 'female', 'hindi', 'easy'),
('Jaya', '👩', 'female', 'hindi', 'easy'),
('Kala', '👩', 'female', 'hindi', 'easy'),
('Lata', '👩', 'female', 'hindi', 'easy'),
('Maya', '👩', 'female', 'hindi', 'easy'),
('Nita', '👩', 'female', 'hindi', 'easy'),
('Ojas', '👩', 'female', 'hindi', 'easy'),
('Pari', '👩', 'female', 'hindi', 'easy'),
('Riya', '👩', 'female', 'hindi', 'easy'),
('Sara', '👩', 'female', 'hindi', 'easy'),
('Tara', '👩', 'female', 'hindi', 'easy'),
('Usha', '👩', 'female', 'hindi', 'easy'),
('Vani', '👩', 'female', 'hindi', 'easy'),
('Zara', '👩', 'female', 'hindi', 'easy'),
('Aarti', '👩', 'female', 'hindi', 'easy'),
('Bhumi', '👩', 'female', 'hindi', 'easy'),
('Chhavi', '👩', 'female', 'hindi', 'easy'),
('Gauri', '👩', 'female', 'hindi', 'easy'),
('Kavya', '👩', 'female', 'hindi', 'easy'),
('Neha', '👩', 'female', 'hindi', 'easy'),
('Pooja', '👩', 'female', 'hindi', 'easy'),
('Radha', '👩', 'female', 'hindi', 'easy'),
('Saavi', '👩', 'female', 'hindi', 'easy'),
('Sita', '👩', 'female', 'hindi', 'easy'),
('Veda', '👩', 'female', 'hindi', 'easy'),
('Zoya', '👩', 'female', 'hindi', 'easy'),
('Ammu', '👩', 'female', 'hindi', 'easy'),
('Babu', '👩', 'female', 'hindi', 'easy'),
('Charu', '👩', 'female', 'hindi', 'easy'),
('Divya', '👩', 'female', 'hindi', 'easy'),
('Ganga', '👩', 'female', 'hindi', 'easy'),
('Indu', '👩', 'female', 'hindi', 'easy'),
('Jhansi', '👩', 'female', 'hindi', 'easy'),
('Kamla', '👩', 'female', 'hindi', 'easy'),
('Manju', '👩', 'female', 'hindi', 'easy')
ON CONFLICT (nickname) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_count INTEGER;
  male_count INTEGER;
  female_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM nicknames_pool;
  SELECT COUNT(*) INTO male_count FROM nicknames_pool WHERE gender = 'male';
  SELECT COUNT(*) INTO female_count FROM nicknames_pool WHERE gender = 'female';
  SELECT COUNT(*) INTO new_count FROM nicknames_pool WHERE LENGTH(nickname) = 4;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Migration 037: 4-Letter Nicknames';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Total nicknames: %', total_count;
  RAISE NOTICE 'Male nicknames: %', male_count;
  RAISE NOTICE 'Female nicknames: %', female_count;
  RAISE NOTICE '4-letter nicknames: %', new_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '==================================================';
END $$;

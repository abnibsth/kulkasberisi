-- ============================================================
-- DEBUG: Cek semua reviews di database
-- Jalankan di: https://supabase.com/dashboard/project/uksucknmlisquakjsyef/sql/new
-- ============================================================

-- 1. Lihat SEMUA reviews (termasuk yang hidden/private)
SELECT
  id,
  display_name,
  rating,
  is_public,
  -- Kolom ini mungkin belum ada jika admin_setup.sql belum dijalankan
  -- is_hidden,
  created_at,
  LEFT(message, 60) AS message_preview
FROM public.reviews
ORDER BY created_at DESC
LIMIT 20;

-- 2. Cek apakah kolom is_hidden sudah ada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reviews';

-- 3. Kalau kolom is_hidden belum ada, jalankan ini dulu:
-- ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- 4. Kalau review salman ada tapi is_public = false, jalankan ini:
-- UPDATE public.reviews SET is_public = true WHERE display_name ILIKE '%salman%';

-- 5. Kalau review salman ada tapi is_hidden = true, jalankan ini:
-- UPDATE public.reviews SET is_hidden = false WHERE display_name ILIKE '%salman%';

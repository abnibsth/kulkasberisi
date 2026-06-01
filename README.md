# KulkasBerisi 🍳

KulkasBerisi adalah aplikasi manajemen inventaris bahan makanan pintar yang membantu Anda melacak apa yang ada di kulkas dan secara otomatis menghasilkan resep masakan kreatif berdasarkan bahan-bahan yang tersedia menggunakan teknologi AI.

---

## 🌟 Fitur Utama

- **Smart Inventory Management**: Kelola bahan makanan (kulkas/pantry) dengan kategori, jumlah, dan tanggal kedaluwarsa.
- **AI Recipe Generator**: Menghasilkan 1 resep masakan Indonesia kreatif berdasarkan bahan yang ada dalam sekali klik.
- **Multi-Model Orchestration**:
  - **Gemini 2.5 Flash**: Menghasilkan teks resep, instruksi memasak, dan estimasi kalori secara akurat.
  - **Unsplash API**: Mencari foto makanan yang relevan secara otomatis sesuai dengan nama resep.
- **Dietary Filters**: Dukungan filter Halal dan Vegetarian untuk memastikan resep sesuai preferensi Anda.
- **Smart Logic**: Menghindari bahan non-halal (alkohol, babi, dll) meskipun dalam instruksi (misal: "tumis hingga harum" tidak akan terdeteksi sebagai "rum").
- **Admin & Monitoring**: Dashboard khusus untuk memantau aktivitas sistem, log generate resep, dan statistik penggunaan.

---

## 🚀 Alur Kerja Customer (User Flow)

1. **Registrasi & Login**: Customer masuk ke aplikasi menggunakan akun yang terdaftar via Supabase Auth.
2. **Input Bahan (Kulkas)**: 
   - Customer menambahkan bahan yang mereka miliki (misal: Ayam, Bawang Merah, Cabai).
   - Data bahan disimpan di database dan ditampilkan di halaman Dashboard/Kulkas.
3. **Generate Resep**:
   - Customer masuk ke halaman **Generator**.
   - Memilih **Bahan Utama** (misal: Ayam).
   - Mengatur **Filter** (Halal, Vegetarian, Tingkat Kesulitan, Waktu Maksimal).
   - Klik tombol **Generate**.
4. **Proses AI & Image**:
   - Sistem memanggil **Gemini AI** untuk meracik 1 resep terbaik.
   - Sistem secara otomatis mencari foto masakan tersebut di **Unsplash**.
5. **Hasil & Simpan**:
   - Resep muncul lengkap dengan foto, estimasi kalori, dan langkah-langkah.
   - Customer bisa klik **Simpan ke Favorit** untuk melihatnya lagi di kemudian hari.

---

## 👑 Alur Kerja Admin (Admin Flow)

Admin memiliki akses ke dashboard khusus untuk mengelola integritas data dan memantau performa aplikasi:

1. **Pemantauan Aktivitas (Logs)**:
   - Admin dapat melihat log setiap kali resep di-generate oleh user.
   - Berguna untuk debugging jika ada resep yang gagal atau format JSON yang rusak.
2. **Statistik Penggunaan**:
   - Melihat jumlah user aktif, jumlah resep yang tersimpan, dan bahan yang paling sering digunakan.
3. **Manajemen Data**:
   - Mengelola daftar bahan master (jika ada sistem master data).
   - Menghapus konten yang tidak pantas atau resep favorit yang melanggar aturan.
4. **Monitoring API Quota**:
   - Memantau penggunaan API Gemini, Firecrawl, dan Unsplash untuk memastikan kuota tidak habis tiba-tiba.

---

## 🛠️ Teknologi

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **State Management**: Zustand
- **AI**: Google Generative AI (Gemini 2.5 Flash)
- **Search & Scrape**: Firecrawl API (untuk memperkaya konteks resep)
- **Images**: Unsplash API
- **Styling**: Tailwind CSS & Lucide React Icons

---

## ⚙️ Persiapan Lingkungan (.env)

Buat file `.env.local` di direktori utama:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Search & Scrape
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Images
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

## 📦 Instalasi

1. **Clone & Install**:
   ```bash
   git clone https://github.com/username/kulkasberisi.git
   npm install
   ```
2. **Database Sync**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. **Run**:
   ```bash
   npm run dev
   ```

---
Dibuat dengan ❤️ untuk membantu Anda memasak lebih mudah setiap hari.

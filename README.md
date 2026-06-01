# KulkasBerisi 🍳

KulkasBerisi adalah aplikasi manajemen inventaris bahan makanan pintar yang membantu Anda melacak apa yang ada di kulkas dan secara otomatis menghasilkan resep masakan kreatif berdasarkan bahan-bahan yang tersedia menggunakan teknologi AI.

## 🌟 Fitur Utama

- **Smart Inventory Management**: Kelola bahan makanan (kulkas/pantry) dengan kategori, jumlah, dan tanggal kedaluwarsa.
<<<<<<< HEAD
- **AI Recipe Generator**: Menghasilkan 1 resep masakan Indonesia kreatif berdasarkan bahan yang ada.
=======
- **AI Recipe Generator**: Menghasilkan 1-3 resep masakan Indonesia kreatif berdasarkan bahan yang ada.
>>>>>>> 197dc2cd140f3873a2bb71314df8dc51ee1fa20d
- **Multi-Model Orchestration**:
  - **Gemini 2.5 Flash**: Menghasilkan teks resep, instruksi memasak, dan estimasi kalori secara akurat.
  - **Unsplash API**: Mencari foto makanan yang relevan secara otomatis sesuai dengan nama resep.
- **Dietary Filters**: Dukungan filter Halal dan Vegetarian untuk memastikan resep sesuai preferensi Anda.
- **Smart Logic**: Menghindari bahan non-halal (alkohol, babi, dll) meskipun dalam instruksi (misal: "tumis hingga harum" tidak akan terdeteksi sebagai "rum").
- **Admin Dashboard**: Panel manajemen untuk memantau data dan log aktivitas.

## 🚀 Alur Kerja Sistem (Flow)

1. **Manajemen Bahan**: Pengguna memasukkan bahan yang dibeli ke dalam sistem. Data disimpan ke database via **Supabase**.
2. **Input Generator**: Pengguna memilih bahan utama yang ingin diolah dan mengatur filter (Halal/Vegetarian/Difficulty).
3. **AI Processing**:
   - Sistem mengirimkan daftar bahan dan filter ke **Gemini AI**.
   - Gemini memproses permintaan dan mengembalikan data dalam format JSON yang berisi Nama Resep, Bahan Tambahan, Instruksi, dan `imageKeyword`.
4. **Image Fetching**: Sistem mengambil `imageKeyword` dari Gemini dan melakukan pencarian gambar ke **Unsplash API** secara paralel.
5. **Final Response**: Aplikasi menampilkan resep lengkap beserta instruksi detail dan foto makanan yang menggugah selera.
6. **Simpan Resep**: Pengguna dapat menyimpan resep favorit mereka untuk dilihat kembali nanti.

## 🛠️ Teknologi

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase
- **ORM**: Prisma
- **State Management**: Zustand (dengan persistence)
- **AI**: Google Generative AI (Gemini 2.5 Flash)
- **Search & Scrape**: Firecrawl API (untuk konteks resep web)
- **Images**: Unsplash API
- **Styling**: Tailwind CSS & Lucide React Icons

## ⚙️ Persiapan Lingkungan (.env)

Buat file `.env.local` di direktori utama dan isi dengan konfigurasi berikut:

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

1. Clone repositori ini:
   ```bash
   git clone https://github.com/username/kulkasberisi.git
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Sinkronisasi database (Prisma):
   ```bash
   npx prisma generate
   ```
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

---
Dibuat dengan ❤️ untuk membantu Anda memasak lebih mudah setiap hari.

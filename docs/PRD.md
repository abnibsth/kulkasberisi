# Product Requirements Document (PRD)
# Generator Resep Berbasis Sisa Bahan (Food Waste Recipe Generator)

**Version:** 1.0  
**Date:** 28 April 2026  
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Product Vision
Aplikasi web yang membantu pengguna mengurangi limbah makanan dengan menghasilkan resep kreatif berdasarkan bahan-bahan yang tersisa di kulkas, terutama yang mendekati tanggal kadaluarsa.

### 1.2 Problem Statement
- Banyak rumah tangga membuang makanan karena bahan mendekati kadaluarsa tanpa menyadari bisa diolah
- Aplikasi resep yang ada fokus pada "apa yang ingin dimasak", bukan "apa yang tersedia"
- Tidak ada cara mudah untuk melacak tanggal kadaluarsa bahan makanan

### 1.3 Solution
Platform yang memungkinkan pengguna:
1. Input bahan yang tersisa di kulkas
2. Mendapatkan resep AI yang relevan dan kreatif
3. Scan barcode untuk auto-track tanggal kadaluarsa

---

## 2. Target Users

### 2.1 Primary Users
- **Ibu Rumah Tangga** (25-50 tahun) yang mengelola dapur harian
- **Profesional Muda** (22-35 tahun) yang ingin mengurangi food waste
- **Keluarga Sadar Lingkungan** yang aktif mengurangi limbah

### 2.2 User Personas

#### Persona 1: Sari, 35 tahun (Ibu Rumah Tangga)
- **Goals:** Menghemat pengeluaran dapur, mengurangi makanan terbuang
- **Pain Points:** Sering lupa bahan di kulkas, bingung masak apa dengan sisa bahan
- **Tech Savviness:** Menengah, aktif menggunakan WhatsApp dan Instagram

#### Persona 2: Andi, 28 tahun (Profesional Muda)
- **Goals:** Hidup lebih sustainable, masak sederhana di rumah
- **Pain Points:** Sibuk kerja, sering beli bahan tapi tidak sempat masak
- **Tech Savviness:** Tinggi, early adopter aplikasi baru

---

## 3. Goals & Objectives

### 3.1 Business Goals
| Goal | Metric | Target |
|------|--------|--------|
| User Acquisition | Monthly Active Users (MAU) | 10,000 dalam 6 bulan |
| Engagement | Resep digenerate per user/hari | 2+ |
| Retention | Day-30 Retention Rate | 40% |
| Impact | Food waste reduced (kg/user/bulan) | 2kg |

### 3.2 Success Metrics (KPIs)
- **Primary:** Number of recipes generated per day
- **Secondary:** User retention rate (D7, D30)
- **Tertiary:** Number of ingredients tracked per user

---

## 4. Features

### 4.1 Core Features (MVP)

#### F1: Input Bahan Manual
**Description:** Pengguna dapat memasukkan bahan yang tersisa di kulkas secara manual

**Requirements:**
- Form input dengan auto-suggest nama bahan
- Kategori bahan (sayur, daging, bumbu, dll)
- Input jumlah dan satuan
- Input tanggal kadaluarsa (opsional)
- Visual indicator untuk bahan hampir kadaluarsa (< 3 hari)

**User Story:**
> Sebagai pengguna, saya ingin memasukkan bahan yang ada di kulkas agar AI bisa memberikan resep yang sesuai

**Acceptance Criteria:**
- [ ] User dapat menambah minimal 10 bahan
- [ ] Auto-suggest muncul setelah mengetik 2 karakter
- [ ] Bahan dapat diedit dan dihapus
- [ ] Visual badge untuk bahan < 3 hari dari kadaluarsa

---

#### F2: Generator Resep AI
**Description:** AI menghasilkan resep berdasarkan bahan yang diinput

**Requirements:**
- Integrasi dengan AI model (OpenAI/Local LLM)
- Filter berdasarkan: waktu masak, tingkat kesulitan, tipe masakan
- Output: nama resep, bahan, langkah, estimasi waktu, kalori
- Save resep ke history
- Share resep (WhatsApp, Instagram, dll)

**User Story:**
> Sebagai pengguna, saya ingin mendapatkan resep kreatif dari bahan yang ada agar tidak perlu belanja lagi

**Acceptance Criteria:**
- [ ] Generate 3-5 resep per request
- [ ] Resep selesai dalam < 10 detik
- [ ] Setiap resep menampilkan % bahan yang terpakai
- [ ] User dapat filter vegetarian/halal

---

#### F3: Barcode Scanner
**Description:** Scan barcode produk untuk auto-input bahan dan tanggal kadaluarsa

**Requirements:**
- Kamera access via browser (WebRTC)
- Database barcode produk Indonesia (minimal 1000 SKU)
- Auto-detect nama produk dan kategori
- Input manual tanggal kadaluarsa setelah scan
- Reminder notifikasi H-3 kadaluarsa

**User Story:**
> Sebagai pengguna, saya ingin scan barcode belanjaan agar tidak perlu input manual dan dapat reminder kadaluarsa

**Acceptance Criteria:**
- [ ] Scan berhasil dalam < 3 detik
- [ ] Coverage 80% produk makanan umum di Indonesia
- [ ] Fallback input manual jika barcode tidak dikenali
- [ ] Notifikasi push untuk reminder kadaluarsa

---

### 4.2 Post-MVP Features

#### F4: Smart Kulkas Dashboard
- Visual overview semua bahan di kulkas
- Sortir berdasarkan: tanggal kadaluarsa, kategori
- Progress tracking food waste yang berhasil dikurangi

#### F5: Komunitas & Share
- Feed resep dari pengguna lain
- Challenge "7 Hari Zero Waste"
- Badge dan achievement system

#### F6: Meal Planning
- Rencana makan mingguan
- Auto-generate shopping list
- Integrasi dengan e-grocery (GrabMart, GoMart)

#### F7: Nutrisi Tracker
- Kalkulasi kalori dan makro per resep
- Personalized recommendation berdasarkan dietary needs

---

## 5. Technical Requirements

### 5.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 15 + React | SSR untuk SEO, performa |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, konsisten |
| **State** | Zustand / React Query | Simple, lightweight |
| **Backend** | Next.js API Routes | Unified codebase |
| **Database** | PostgreSQL + Prisma | Relational data, type-safe |
| **AI** | OpenAI API / Local LLM | Recipe generation |
| **Barcode** | QuaggaJS / ZXing | Browser-based scanning |
| **Auth** | NextAuth.js | Multi-provider support |
| **Deploy** | Vercel | Zero-config, edge functions |

### 5.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Landing │  │  Dashboard│  │  Recipe Generator    │   │
│  │   Page   │  │   Page   │  │        Page          │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│  ┌──────────┐  ┌──────────┐                             │
│  │  Scanner │  │  Profile │                             │
│  │   Page   │  │   Page   │                             │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                   │
│  /api/ingredients  /api/recipes  /api/scan  /api/auth   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     External Services                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  OpenAI    │  │  Barcode   │  │   PostgreSQL     │   │
│  │    API     │  │  Database  │  │    (Vercel PG)   │   │
│  └────────────┘  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Data Models

#### Ingredient
```prisma
model Ingredient {
  id          String   @id @default(uuid())
  userId      String
  name        String
  category    String
  quantity    Float
  unit        String
  expiryDate  DateTime?
  barcode     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  recipeIngredients RecipeIngredient[]
}
```

#### Recipe
```prisma
model Recipe {
  id          String   @id @default(uuid())
  name        String
  description String
  prepTime    Int      // minutes
  cookTime    Int      // minutes
  servings    Int
  difficulty  String   // easy, medium, hard
  calories    Int?
  instructions Json    // array of steps
  imageUrl    String?
  source      String   // ai, user, community
  userId      String?
  createdAt   DateTime @default(now())
  
  recipeIngredients RecipeIngredient[]
}
```

#### User
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  image     String?
  ingredients Ingredient[]
  recipes   Recipe[]
  createdAt DateTime @default(now())
}
```

---

## 6. User Experience

### 6.1 User Flow

#### Main Flow: Generate Recipe
```
1. Landing Page
       │
       ▼
2. Input Ingredients (manual / scan)
       │
       ▼
3. Click "Generate Resep"
       │
       ▼
4. AI Processing (loading state)
       │
       ▼
5. View Recipe Results (3-5 options)
       │
       ├──► Save Recipe
       ├──► Share Recipe
       └──► Regenerate
```

#### Secondary Flow: Barcode Scan
```
1. Click Scan Button
       │
       ▼
2. Camera Permission Request
       │
       ▼
3. Scan Barcode
       │
       ▼
4. Product Found → Auto-fill Form
       │
       ▼
5. Input Expiry Date
       │
       ▼
6. Add to Fridge Inventory
```

### 6.2 Wireframes (Key Screens)

#### Screen 1: Landing Page
- Hero section dengan value proposition
- CTA "Mulai Generate Resep"
- Feature highlights (3 cards)
- Social proof (user count, food saved)

#### Screen 2: Dashboard / Ingredient Input
- List bahan dengan expiry indicator
- "Tambah Bahan" button (manual + scan)
- "Generate Resep" floating button
- Stats summary (total bahan, hampir kadaluarsa)

#### Screen 3: Recipe Results
- Card layout untuk setiap resep
- Match percentage dengan bahan tersedia
- Filter chips (waktu, difficulty)
- Save & Share actions

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Page load time < 2s (3G network)
- Recipe generation < 10s
- Barcode scan response < 3s
- Lighthouse score > 90 (Performance, Accessibility)

### 7.2 Security
- HTTPS only
- Input sanitization untuk mencegah XSS
- Rate limiting API (100 req/hour/user)
- Secure storage untuk user data

### 7.3 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratio > 4.5:1

### 7.4 Scalability
- Support 10,000 concurrent users
- Database query time < 100ms
- CDN untuk static assets

---

## 8. Go-to-Market Plan

### 8.1 Launch Phases

#### Phase 1: Alpha (Week 1-4)
- Internal testing
- Core features: Input manual + AI recipe
- Target: 50 beta users

#### Phase 2: Beta (Week 5-8)
- Barcode scanner integration
- Public beta launch
- Target: 500 users

#### Phase 3: Public Launch (Week 9-12)
- Full feature release
- Marketing campaign
- Target: 5,000 users bulan pertama

### 8.2 Marketing Channels
- **Social Media:** Instagram, TikTok (resep viral dari leftover)
- **Community:** Grup WhatsApp ibu-ibu, Reddit r/ZeroWaste
- **PR:** Media sustainability, food blogger collab
- **SEO:** Content marketing (blog resep, tips reduce waste)

---

## 9. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI recipe tidak akurat/tidak enak | High | Medium | Human taste testing, user feedback loop |
| Barcode database tidak lengkap | Medium | High | Crowdsourcing user submissions, fallback manual |
| Low user retention | High | Medium | Gamification, reminder notifications, community features |
| API cost (OpenAI) terlalu tinggi | Medium | Medium | Cache recipes, local LLM fallback, usage limits |

---

## 10. Timeline & Milestones

### Sprint 0: Setup (Week 1)
- [ ] Project scaffolding
- [ ] Database setup
- [ ] Auth implementation
- [ ] CI/CD pipeline

### Sprint 1-2: Core Features (Week 2-3)
- [ ] Ingredient input (manual)
- [ ] AI recipe generation
- [ ] Recipe display & save

### Sprint 3-4: Scanner & Polish (Week 4-5)
- [ ] Barcode scanner
- [ ] Expiry tracking
- [ ] UI/UX polish
- [ ] Testing

### Sprint 5: Launch Prep (Week 6)
- [ ] Beta user onboarding
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation

---

## 11. Open Questions

1. **AI Model:** OpenAI API vs local LLM (trade-off: cost vs control)?
2. **Barcode Database:** Build sendiri vs partner dengan existing provider?
3. **Monetization:** Freemium vs ads vs subscription?
4. **Geographic Scope:** Indonesia only vs expand to SEA?

---

## 12. Appendix

### 12.1 Glossary
- **Food Waste:** Makanan yang terbuang karena tidak dikonsumsi
- **Expiry Date:** Tanggal kadaluarsa produkwwwwwwww
- **SKU:** Stock Keeping Unit (unique product identifier)

### 12.2 References
- FAO Food Waste Statistics 2025
- Indonesia Food Loss and Waste Report
- OpenAI Recipe Generation Best Practices

---

**Document Owner:** Product Team  
**Last Updated:** 28 April 2026  
**Next Review:** After Alpha Launch

# PRD: Aplikasi Point of Sale (POS) — Desktop-First dengan Web Dashboard

**Versi:** 1.0
**Target Eksekusi:** AI Coding Agent (Cursor / Claude Code / Cline / dll)
**Tanggal:** 2026-05-03

---

## 1. Ringkasan Produk

Aplikasi POS berbasis **desktop (touchscreen-friendly)** bernama **OctaPOS** untuk berbagai jenis bisnis (retail, F&B, jasa) yang dapat beroperasi **offline-first** dan melakukan sinkronisasi otomatis ke cloud saat online. Pemilik bisnis dapat memantau seluruh outlet melalui **dashboard web** secara real-time dari perangkat apa pun.

### 1.1 Tujuan Utama
- Kasir tetap dapat melakukan transaksi meski internet mati (offline-first).
- Owner dapat memantau penjualan multi-cabang via web tanpa perlu install apa pun.
- UI dirancang untuk **layar sentuh** (tombol besar, gesture-friendly, minim typing).
- Mudah di-deploy oleh tim non-teknis.

### 1.2 Non-Goals (Tidak Termasuk MVP)
- Aplikasi mobile native (Android/iOS) — gunakan web responsive sebagai alternatif sementara.
- Integrasi akuntansi pihak ketiga (Accurate, Jurnal) — disiapkan API saja.
- Loyalty program / membership lanjutan (point, tier).
- Marketplace integration (Tokopedia, Shopee).
- Self-order kiosk / QR menu pelanggan.

---

## 2. Tech Stack Rekomendasi

### 2.1 Stack Final (Direkomendasikan)

| Layer | Teknologi | Alasan |
|---|---|---|
| **Desktop App** | **Tauri 2.0** + React + TypeScript + Vite | Bundle size kecil (~10MB vs Electron ~150MB), performa native, hemat RAM (penting untuk PC kasir spek rendah), keamanan lebih baik |
| **UI Framework** | **shadcn/ui** + Tailwind CSS | Komponen modern, customizable, touchscreen-friendly dengan sedikit override |
| **State Management** | **Zustand** + TanStack Query | Ringan, mudah dipakai oleh AI agent, tidak overkill |
| **Local Database** | **SQLite** (via `tauri-plugin-sql`) | Embedded, cepat, reliable untuk offline. Single file, mudah backup |
| **Local ORM** | **Drizzle ORM** | Type-safe, lightweight, schema-first, bagus untuk AI agent |
| **Cloud Backend** | **Supabase** (Postgres + Auth + Realtime + Storage) | All-in-one, free tier generous, realtime built-in, mudah di-setup oleh AI agent |
| **Sync Engine** | **Custom sync layer** dengan timestamp + tombstone (lihat §7) | Lebih sederhana dari CRDT, cukup untuk POS use case |
| **Web Dashboard** | **Next.js 15 (App Router)** + shadcn/ui | SSR untuk SEO, API routes built-in, deploy mudah ke Vercel |
| **Charts** | **Recharts** atau **Tremor** | Out-of-the-box dashboard look |
| **Print Thermal** | `tauri-plugin-printer` atau ESC/POS via USB/Bluetooth (`escpos-rs`) | Native akses ke printer |
| **Auth** | Supabase Auth (email + PIN untuk kasir) | PIN 4-6 digit untuk kasir cepat login di touchscreen |
| **Deployment Web** | Vercel (gratis untuk MVP) | Zero-config Next.js |
| **Distribusi Desktop** | Tauri Updater + GitHub Releases | Auto-update built-in |

### 2.2 Alternatif (Jika Stack Utama Bermasalah)

- **Electron + React** jika tim lebih familiar (kompromi: bundle besar).
- **PocketBase** sebagai pengganti Supabase (single binary, self-hosted murah).
- **PowerSync** atau **ElectricSQL** jika ingin sync engine siap pakai (lebih kompleks setup, tapi robust).

### 2.3 Bahasa & Tooling
- TypeScript strict mode di seluruh codebase (desktop & web share types via monorepo).
- **pnpm workspaces** atau **Turborepo** untuk monorepo.
- ESLint + Prettier + Husky pre-commit.
- Vitest untuk unit test, Playwright untuk E2E web.

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                      DESKTOP APP (Tauri)                     │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  React UI (POS)  │ ◄─────► │  Rust Backend (Tauri)   │  │
│  │  - Touchscreen   │         │  - SQLite (local)       │  │
│  │  - shadcn/ui     │         │  - Printer ESC/POS      │  │
│  │                  │         │  - Sync Service         │  │
│  └──────────────────┘         └────────────┬────────────┘  │
└──────────────────────────────────────────────│──────────────┘
                                                │ HTTPS (saat online)
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud)                          │
│  - Postgres (master data + transaksi tersinkron)            │
│  - Auth (JWT)                                                │
│  - Realtime (push update ke web dashboard)                  │
│  - Row Level Security (per outlet/tenant)                   │
└──────────────────────────────────────────────│──────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│              WEB DASHBOARD (Next.js)                         │
│  - Owner login                                               │
│  - Real-time monitoring multi-outlet                        │
│  - Laporan, analytics, manajemen master data                │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Prinsip Arsitektur
1. **Desktop = Source of Truth saat offline**, cloud menjadi otoritatif setelah sync.
2. **Tidak ada kehilangan transaksi**: setiap transaksi dapat ID lokal (UUID v7) sebelum sync.
3. **Web dashboard = Read-mostly** untuk owner. Tidak boleh trigger transaksi penjualan.
4. **Master data dua arah**: produk/harga dapat diubah di web → push ke desktop saat online.

---

## 4. Struktur Database

### 4.1 Skema Inti (berlaku untuk SQLite lokal & Postgres cloud)

Semua tabel transaksional WAJIB punya kolom: `id` (UUID v7), `created_at`, `updated_at`, `deleted_at` (soft delete), `synced_at`, `version` (untuk konflik), `outlet_id`, `tenant_id`.

```sql
-- TENANT & OUTLET
tenants(id, name, business_type, created_at, updated_at)
outlets(id, tenant_id, name, address, phone, timezone, receipt_header, receipt_footer)

-- USERS & ROLES
users(id, tenant_id, email, full_name, pin_hash, role, is_active, last_login_at)
-- role: 'owner' | 'admin' | 'cashier' | 'supervisor'
user_outlets(user_id, outlet_id)  -- many-to-many, kasir bisa di multi outlet

-- MASTER DATA
categories(id, tenant_id, name, color, sort_order, deleted_at)
products(
  id, tenant_id, sku, barcode, name, category_id,
  price, cost, tax_rate, image_url, is_active, track_stock,
  unit, deleted_at, version
)
product_variants(id, product_id, name, price_modifier, sku)  -- ukuran, warna, dll
modifiers(id, tenant_id, name, type)  -- F&B: extra cheese, less ice
modifier_options(id, modifier_id, name, price_delta)
product_modifiers(product_id, modifier_id)

-- INVENTORY (per outlet)
stock(outlet_id, product_id, quantity, min_stock, updated_at)
stock_movements(
  id, outlet_id, product_id, type, quantity, ref_type, ref_id, note, user_id, created_at
)
-- type: 'in' | 'out' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'sale' | 'void'

-- TRANSACTIONS (CORE)
transactions(
  id, tenant_id, outlet_id, invoice_no, cashier_id, customer_id,
  subtotal, discount_total, tax_total, service_charge, rounding,
  total, paid_amount, change_amount,
  status,  -- 'draft' | 'paid' | 'void' | 'refunded'
  payment_method,  -- 'cash' | 'qris' | 'edc_debit' | 'edc_credit' | 'transfer' | 'split'
  notes, voided_at, voided_by, void_reason,
  created_at, updated_at, synced_at, device_id
)
transaction_items(
  id, transaction_id, product_id, variant_id,
  product_name_snapshot, sku_snapshot, price_snapshot,
  quantity, discount, subtotal, notes
)
transaction_item_modifiers(item_id, modifier_option_id, name_snapshot, price_snapshot)
transaction_payments(
  id, transaction_id, method, amount, reference_no, paid_at
)  -- mendukung split payment

-- CUSTOMERS (opsional)
customers(id, tenant_id, name, phone, email, total_spent, visit_count, last_visit_at)

-- DISCOUNT & PROMO
discounts(id, tenant_id, name, type, value, min_purchase, valid_from, valid_until, is_active)
-- type: 'percentage' | 'fixed' | 'bogo'

-- CASH MANAGEMENT (Shift Kasir)
cash_sessions(
  id, outlet_id, cashier_id, opening_cash, closing_cash,
  expected_cash, variance, opened_at, closed_at, notes
)

-- AUDIT & SYNC
sync_log(id, table_name, row_id, action, payload, status, error, created_at)
audit_log(id, tenant_id, user_id, action, entity, entity_id, before, after, created_at)
```

### 4.2 Indexing
- Index `transactions(outlet_id, created_at DESC)` — query laporan harian.
- Index `products(tenant_id, barcode)` — scan barcode.
- Index `stock(outlet_id, product_id)` — cek stok cepat.
- Index `synced_at` di semua tabel transaksional — query delta sync.

---

## 5. Modul & Fitur Detail

### 5.1 Modul Autentikasi
- **Login Owner/Admin**: email + password.
- **Login Kasir**: pilih nama dari list → masukkan PIN 6 digit → masuk.
- Session disimpan di Tauri secure storage (keyring).
- Auto-logout setelah X menit idle (configurable, default 30 menit).
- Lock screen cepat (tombol "Lock" di pojok layar) yang minta PIN.

### 5.2 Modul POS (Layar Utama Kasir)

**Layout** (touchscreen, minimum 1024×768, optimal 1366×768 atau lebih):

```
┌───────────────────────────────────────────────────────────────┐
│ [Outlet] Cabang A | Kasir: Budi | 03/05/2026 14:32 | [Lock] │
├──────────────────────────────────┬────────────────────────────┤
│                                   │                            │
│   PRODUCT GRID (kiri 65%)         │   CART (kanan 35%)         │
│   - Tab kategori (horizontal)     │   - List item              │
│   - Grid produk dengan gambar     │   - Edit qty (+/-) besar   │
│   - Search bar di atas            │   - Hapus item (swipe)     │
│   - Tombol "Scan Barcode"         │                            │
│                                   │   ─────────────────────    │
│                                   │   Subtotal:    Rp xxx      │
│                                   │   Diskon:      Rp xxx      │
│                                   │   Pajak:       Rp xxx      │
│                                   │   TOTAL:       Rp xxx      │
│                                   │                            │
│                                   │   [    BAYAR    ]          │
│                                   │   [Tahan] [Diskon] [Note]  │
└──────────────────────────────────┴────────────────────────────┘
```

**Aturan UI Touchscreen**:
- Tombol minimum **48×48 px** (target tap), idealnya 64px untuk tombol utama.
- Spacing antar tombol minimum 8px.
- Font minimum 16px untuk body, 24px untuk angka di cart.
- **Tidak ada hover-only interaction** — semua harus bisa dengan tap.
- Numpad on-screen muncul untuk input qty, harga, PIN.
- Konfirmasi destruktif (void, hapus) wajib pakai modal dengan tombol besar.

**Fitur POS**:
1. Tambah produk dari grid (1 tap = qty 1, tap lagi = qty 2).
2. Scan barcode (USB scanner = keyboard input ke search bar).
3. Edit qty manual via numpad on-screen.
4. Diskon per item & per transaksi (% atau nominal).
5. Tahan transaksi (parking) — penting untuk F&B / antrian.
6. Catatan per item & per transaksi.
7. Pilih pelanggan (opsional) — search by phone/nama.
8. Modifier (F&B): pop-up pilih extra topping, level pedas, dll.

### 5.3 Modul Pembayaran

**Layar pembayaran (full screen modal)**:
- Tombol metode bayar besar: TUNAI, QRIS, DEBIT, KREDIT, TRANSFER, SPLIT.
- **Tunai**: numpad besar, quick-amount (Rp 50.000, 100.000, "Uang Pas"), tampil kembalian.
- **QRIS**:
  - Generate QR statis dari merchant QRIS code (disimpan per outlet), atau
  - Integrasi dinamis dengan **payment gateway** (Midtrans / Xendit / DOKU) — opsional MVP+.
- **EDC**: input nominal → cetak struk → kasir input ref number EDC.
- **Split Payment**: bagi total ke beberapa metode.
- Setelah sukses → otomatis cetak struk + opsi kirim digital (WhatsApp/email — opsional MVP+).

### 5.4 Modul Manajemen Produk
- CRUD produk (di desktop & web).
- Upload gambar produk (compress otomatis ke ≤200KB).
- Bulk import via CSV/Excel.
- Variant & modifier management.
- Atur kategori (drag & drop urutan).
- Toggle "track stock" per produk (jasa tidak perlu stok).

### 5.5 Modul Inventori
- Stock opname (hitung fisik → adjustment).
- Stock in (penerimaan barang dari supplier).
- Transfer antar outlet (kurangi outlet A, tambah outlet B).
- Riwayat pergerakan stok per produk.
- Notifikasi low stock (badge di dashboard).

### 5.6 Modul Multi-Outlet
- Owner bisa lihat semua outlet di web dashboard.
- Setiap outlet punya master data produk yang sama (tenant level), tapi **harga & stok bisa berbeda per outlet** (pakai tabel `outlet_product_overrides` jika dibutuhkan).
- Switch outlet di desktop tanpa logout (jika kasir punya akses multi-outlet).

### 5.7 Modul Laporan (Web Dashboard)

**Halaman utama dashboard**:
- KPI cards: Penjualan hari ini, transaksi, AOV, vs kemarin (%).
- Chart penjualan 7/30 hari.
- Top 10 produk (qty & revenue).
- Penjualan per outlet (jika multi-outlet).
- Penjualan per kasir.
- Real-time feed transaksi terbaru (via Supabase Realtime).

**Laporan detail**:
- Penjualan harian / mingguan / bulanan / custom range.
- Laporan per produk, per kategori, per metode bayar.
- Laporan kasir (shift, opening/closing cash, variance).
- Laporan inventory (nilai stok, low stock, movement).
- Export Excel / PDF.

### 5.8 Modul Cetak Struk
- Template struk customizable: header (logo/teks), footer ("Terima kasih"), font size.
- Format ESC/POS untuk printer thermal 58mm & 80mm.
- Re-print struk dari riwayat transaksi.
- Cetak laporan X (mid-shift) & Z (end-of-shift) dari mesin kasir.

### 5.9 Modul Shift / Cash Session
- Buka kasir: input opening cash → mulai shift.
- Tutup kasir: hitung fisik → sistem hitung expected → tampil variance.
- Cetak laporan Z otomatis saat tutup kasir.

---

## 6. UX & Design System Touchscreen

### 6.1 Prinsip Desain
- **Kecepatan > Kecantikan**: kasir harus bisa transaksi dalam <10 detik.
- **Forgiveness**: undo selalu tersedia, konfirmasi untuk aksi destruktif.
- **Visual hierarchy jelas**: tombol primary 1 saja per layar (warna brand).
- **Dark mode**: opsional, tapi default light untuk lingkungan terang.

### 6.2 Color & Typography
- Primary: biru tua atau hijau (warna trustworthy, kontras tinggi).
- Danger: merah hanya untuk void/hapus.
- Success: hijau untuk konfirmasi pembayaran.
- Font: Inter atau system font (San Francisco / Segoe UI).
- Angka: font monospace (mis. JetBrains Mono) untuk alignment.

### 6.3 Komponen Wajib
- `<TouchButton>` — minimum height 56px, ada haptic-like animasi.
- `<NumPad>` — on-screen numpad reusable (qty, harga, PIN, cash).
- `<ProductCard>` — gambar 1:1, nama 2 baris max, harga jelas.
- `<CartItem>` — swipe-to-delete, +/- qty.
- `<Modal>` — full-screen di mobile/tablet, centered di desktop.

---

## 7. Sync Engine (Penting!)

### 7.1 Strategi: **Last-Write-Wins dengan Versioning + Tombstone**

Sederhana, cukup untuk POS karena konflik master data jarang (yang sering = transaksi, dan transaksi selalu append-only).

**Aturan**:
1. Setiap row punya `version` (integer increment) dan `updated_at` (timestamp UTC).
2. Soft delete: set `deleted_at`, jangan hapus fisik (tombstone).
3. Setiap perubahan lokal masuk ke `sync_queue` (outbox pattern).
4. Sync worker jalan setiap N detik (default 30s) saat online.

### 7.2 Flow Sync

**Push (lokal → cloud)**:
```
1. Ambil semua row di sync_queue (status = pending), urut created_at ASC
2. Untuk setiap row:
   a. POST ke Supabase (upsert by id)
   b. Jika sukses → mark synced, update synced_at
   c. Jika gagal (network) → retry exponential backoff
   d. Jika konflik (409) → ambil versi cloud, bandingkan updated_at
      - Cloud lebih baru → terima cloud, log konflik untuk review
      - Lokal lebih baru → push paksa
```

**Pull (cloud → lokal)**:
```
1. GET /sync?since={last_pull_at}&outlet_id={x}
2. Apply per tabel:
   - Untuk row dengan deleted_at != null → soft delete lokal
   - Untuk row baru/update → upsert lokal
3. Update last_pull_at
```

**Realtime (cloud → web dashboard)**:
- Web dashboard subscribe ke Supabase Realtime untuk tabel `transactions`.
- Tidak perlu polling.

### 7.3 Penanganan Khusus Transaksi
- Transaksi **tidak boleh konflik** karena selalu append-only.
- `invoice_no` di-generate lokal dengan format `OUTLETCODE-YYYYMMDD-XXXXX` agar unik global.
- Jika invoice_no collision (sangat jarang) → append device_id suffix.

### 7.4 Indikator Sync di UI
- Pojok kanan atas: ikon cloud (✓ tersinkron / ⟳ sedang sync / ⚠ N pending).
- Klik ikon → modal detail jumlah pending per tabel.
- Manual trigger sync available.

---

## 8. Keamanan

1. **Auth**:
   - Password: bcrypt hash (cost 12).
   - PIN kasir: hash juga, bukan plaintext.
   - JWT dari Supabase, refresh token rotation.
2. **Multi-tenancy**: Row Level Security di Postgres berdasarkan `tenant_id` dari JWT claim.
3. **Local DB encryption**: SQLite encrypted dengan SQLCipher (key disimpan di OS keyring via Tauri).
4. **Audit log**: semua aksi destruktif (void, refund, hapus produk, ubah harga) tercatat.
5. **Role-based access**:
   - Cashier: hanya POS + lihat transaksinya sendiri.
   - Supervisor: + void, refund, diskon manual.
   - Admin: + master data.
   - Owner: full access + laporan keuangan.
6. **Rate limiting** di API Supabase (built-in).
7. **HTTPS only** untuk semua komunikasi cloud.

---

## 9. Struktur Project (Monorepo)

```
pos-app/
├── apps/
│   ├── desktop/              # Tauri + React
│   │   ├── src/              # React code
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── stores/       # Zustand
│   │   │   ├── lib/
│   │   │   └── main.tsx
│   │   ├── src-tauri/        # Rust code
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── db/       # SQLite handlers
│   │   │   │   ├── printer/  # ESC/POS
│   │   │   │   └── sync/     # Sync engine
│   │   │   └── Cargo.toml
│   │   └── package.json
│   └── web/                  # Next.js dashboard
│       ├── app/
│       ├── components/
│       └── package.json
├── packages/
│   ├── shared-types/         # TypeScript types shared
│   ├── shared-schema/        # Drizzle schema (dipakai keduanya)
│   ├── shared-utils/         # Format currency, date, dll
│   └── ui/                   # shadcn components shared
├── supabase/
│   ├── migrations/           # SQL migration
│   ├── seed.sql
│   └── functions/            # Edge functions (jika perlu)
├── docs/
│   ├── architecture.md
│   ├── sync-protocol.md
│   └── deployment.md
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 10. Roadmap Pengembangan (untuk AI Agent)

### Phase 0: Setup Foundation (1-2 hari kerja agent)
- [ ] Init monorepo (pnpm + Turborepo).
- [ ] Setup Tauri + React + TS + Tailwind + shadcn.
- [ ] Setup Next.js + shadcn.
- [ ] Setup Supabase project + migrasi awal.
- [ ] Setup shared-schema dengan Drizzle (works for SQLite & Postgres).

### Phase 1: Core POS Offline (3-5 hari)
- [ ] Auth lokal (login owner + PIN kasir).
- [ ] CRUD produk & kategori (lokal dulu).
- [ ] Layar POS: grid produk, cart, total.
- [ ] Pembayaran tunai + cetak struk.
- [ ] Riwayat transaksi.

### Phase 2: Sync Engine (3-4 hari)
- [ ] Implementasi sync_queue (outbox).
- [ ] Push worker dengan retry.
- [ ] Pull worker delta sync.
- [ ] Konflik handler.
- [ ] UI indikator sync.

### Phase 3: Web Dashboard (3-4 hari)
- [ ] Auth Supabase di Next.js.
- [ ] Dashboard utama dengan KPI + chart.
- [ ] Halaman laporan (filter, export).
- [ ] Realtime feed transaksi.
- [ ] Master data management.

### Phase 4: Fitur Lanjutan (5-7 hari)
- [ ] Multi-outlet.
- [ ] Multi-payment + QRIS + EDC.
- [ ] Inventory management lengkap.
- [ ] Shift / cash session.
- [ ] Diskon & promo.
- [ ] Customer management.
- [ ] Modifier (F&B).

### Phase 5: Polish & Deploy (2-3 hari)
- [ ] Bug fixing & UX polish.
- [ ] E2E test critical path.
- [ ] Setup auto-update Tauri.
- [ ] Deploy web ke Vercel.
- [ ] Build installer Windows (.msi) & macOS (.dmg).
- [ ] Dokumentasi user manual.

**Total estimasi**: 17-25 hari kerja agent (asumsi agent lebih murah seperti Sonnet/Haiku, dengan supervisi minimal).

---

## 11. Acceptance Criteria (Definition of Done)

### MVP Dianggap Selesai Jika:
1. ✅ Kasir bisa transaksi tunai end-to-end dalam mode **offline total** (cabut LAN).
2. ✅ Saat online kembali, semua transaksi tersinkron ke cloud dalam <2 menit.
3. ✅ Owner login web, lihat penjualan real-time dari outlet yang aktif.
4. ✅ Cetak struk thermal 58mm berfungsi (printer ESC/POS standar).
5. ✅ Multi-outlet: minimal 2 outlet bisa beroperasi paralel, data terpisah, owner lihat agregat.
6. ✅ Multi-user: 1 desktop bisa di-share 2+ kasir dengan PIN berbeda.
7. ✅ UI semua tombol kritis bisa dioperasikan tanpa keyboard fisik (touch-only test).
8. ✅ Tidak ada kehilangan transaksi setelah 1000 transaksi simulasi (stress test).
9. ✅ Aplikasi desktop start <5 detik di PC dengan 4GB RAM.
10. ✅ Bundle installer <30MB.

---

## 12. Catatan untuk AI Agent yang Mengeksekusi PRD Ini

### 12.1 Prioritas Implementasi
Kerjakan **per Phase secara berurutan**. Jangan lompat ke Phase 3 sebelum Phase 1-2 stabil. Setiap phase harus bisa di-demo standalone.

### 12.2 Konvensi Kode
- TypeScript strict, tidak ada `any` kecuali di-comment alasannya.
- Naming: `camelCase` variabel/fungsi, `PascalCase` komponen/type, `snake_case` kolom DB.
- Setiap fungsi penting WAJIB ada JSDoc singkat.
- Error handling eksplisit, tidak ada silent catch.
- File komponen max 300 baris, refactor jika lebih.

### 12.3 Testing Minimum
- Unit test: utility functions (format mata uang, kalkulasi diskon, kalkulasi pajak).
- Integration test: sync engine (mock Supabase).
- E2E test: 1 happy path transaksi + 1 path offline-online.

### 12.4 Saat Stuck
- Jika ada keputusan ambigu, dokumentasikan asumsi di `docs/decisions.md` (ADR format) lalu lanjut.
- Jangan over-engineer. Pilih solusi paling sederhana yang memenuhi acceptance criteria.
- Selalu prioritaskan **offline reliability** > feature richness.

### 12.5 Referensi Wajib Dibaca Agent
- Tauri 2.0 docs: https://v2.tauri.app
- Supabase JS client: https://supabase.com/docs/reference/javascript
- Drizzle ORM: https://orm.drizzle.team
- shadcn/ui: https://ui.shadcn.com
- ESC/POS commands: https://reference.epson-biz.com/modules/ref_escpos/

---

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Sync konflik di master data | Sedang | Last-write-wins + audit log. Edit master data sebaiknya dari web saja. |
| Printer thermal driver beda-beda | Tinggi | Pakai library ESC/POS umum (escpos-rs). Test dengan 3 brand: Epson, Xprinter, Iware. |
| PC kasir spek rendah lag | Tinggi | Pilih Tauri (bukan Electron). Lazy load gambar produk. Batasi grid produk dengan virtualisasi. |
| QRIS dinamis butuh integrasi gateway | Sedang | MVP pakai QRIS statis (1 QR per outlet). Gateway integrasi di Phase 4+. |
| Database lokal corrupt | Tinggi | Auto-backup harian ke folder lokal + opsi backup ke cloud storage. |
| Owner lupa password | Rendah | Reset via email Supabase built-in. |

---

## 14. Lampiran: Template ESC/POS Struk

```
[ALIGN CENTER]
[BOLD][SIZE 2x]NAMA OUTLET[/SIZE][/BOLD]
Alamat Lengkap
Telp: 0812-xxxx
[ALIGN LEFT]
================================
No: OUT-20260503-00123
Kasir: Budi
Tanggal: 03/05/2026 14:32
================================
Nasi Goreng        x2
                       30.000
  - Extra Telur        +5.000
Es Teh             x2
                       10.000
================================
Subtotal           45.000
Diskon             -5.000
Pajak (10%)         4.000
TOTAL              44.000
--------------------------------
Tunai              50.000
Kembali             6.000
================================
[ALIGN CENTER]
Terima kasih!
[QRCODE: invoice_url]
[CUT]
```

---

**END OF PRD**

Catatan: PRD ini adalah dokumen hidup. Update melalui PR ke `docs/prd.md` dengan changelog di bagian header.

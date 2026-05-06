# Panduan Deployment OctaPOS

## Prasyarat

- Node.js 20+, pnpm 9+
- Rust stable (untuk build desktop)
- Akun Supabase (gratis)
- Akun Vercel (gratis, untuk web dashboard)
- Akun GitHub (untuk CI/CD dan distribusi installer)

---

## 1. Setup Supabase

### 1.1 Buat Project Baru

1. Login ke [supabase.com](https://supabase.com) → **New Project**
2. Catat: **Project URL**, **anon key**, **service role key**

### 1.2 Jalankan Migrasi

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ke project
supabase link --project-ref <PROJECT_REF>

# Push migration
supabase db push
```

Atau copy-paste isi `supabase/migrations/*.sql` langsung ke SQL Editor di dashboard Supabase.

### 1.3 Konfigurasi Environment Variables

Buat file `.env.local` di `apps/web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 2. Deploy Web Dashboard ke Vercel

### 2.1 Via Vercel CLI

```bash
cd apps/web
npx vercel --prod
```

### 2.2 Via GitHub Integration

1. Push repo ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Import Project** → pilih repo
3. **Root Directory**: `apps/web`
4. Tambah Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Klik **Deploy**

### 2.3 Custom Domain (Opsional)

Di Vercel dashboard → **Settings** → **Domains** → tambahkan domain Anda.

---

## 3. Build Desktop App

### 3.1 Install Dependensi Build

**Windows:**
```powershell
# Install Visual C++ Build Tools (jalankan sebagai Administrator)
winget install Microsoft.VisualStudio.2022.BuildTools
# Pilih: Desktop development with C++
```

**macOS:**
```bash
xcode-select --install
```

### 3.2 Build Installer

```bash
cd apps/desktop

# Development
pnpm tauri:dev

# Production build
pnpm tauri:build
```

Output:
- **Windows**: `src-tauri/target/release/bundle/msi/*.msi`
- **macOS**: `src-tauri/target/release/bundle/dmg/*.dmg`

### 3.3 Setup Auto-Updater

1. Generate keypair untuk signing:
   ```bash
   pnpm tauri signer generate -w ~/.tauri/octapos.key
   ```
2. Simpan public key ke `tauri.conf.json` → `plugins.updater.pubkey`
3. Tambah ke GitHub Secrets:
   - `TAURI_SIGNING_PRIVATE_KEY` (isi private key)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

---

## 4. Release via GitHub Actions

### 4.1 Buat Tag Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow `.github/workflows/release.yml` otomatis:
- Build installer Windows (.msi) dan macOS (.dmg)
- Upload ke GitHub Releases sebagai draft
- Generate `latest.json` untuk auto-updater

### 4.2 Publish Release

Buka GitHub → **Releases** → edit draft → klik **Publish release**.

---

## 5. Distribusi ke Klien

### 5.1 Download Manual

User download installer dari link GitHub Release:
```
https://github.com/<org>/octapos/releases/latest
```

### 5.2 Auto-Update

Setelah instalasi pertama, OctaPOS otomatis cek update saat startup. Update dialog muncul jika ada versi baru.

---

## 6. Setup Pertama di Mesin Kasir

1. Install OctaPOS dari installer `.msi`/`.dmg`
2. Buka aplikasi → wizard **Setup OctaPOS** muncul
3. Isi:
   - Nama bisnis
   - Nama outlet
   - Email & password owner
4. Klik **Mulai Setup**
5. Login sebagai Owner → masuk ke halaman kasir
6. Di **Pengaturan Sync** → masukkan Supabase URL & anon key → **Simpan & Uji Koneksi**
7. Produk dan data master dapat diimport dari web dashboard

---

## 7. Environment Variables Lengkap

| Variable | Keterangan | Wajib |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) | ✅ |

---

## 8. Troubleshooting

### Build desktop gagal di Windows
Pastikan Visual C++ Build Tools terinstall. Cek dengan:
```powershell
cl.exe
```
Jika tidak dikenal, jalankan installer ulang.

### Sync tidak jalan
1. Cek koneksi internet
2. Buka **Pengaturan Sync** → pastikan URL & key benar
3. Klik **Sync Manual** untuk trigger manual

### Database corrupt
Backup `%APPDATA%\com.octapos.desktop\octapos.db` secara rutin.
Jika corrupt, hapus file tersebut → aplikasi akan buat database baru (data lokal hilang, tapi data cloud tetap aman).

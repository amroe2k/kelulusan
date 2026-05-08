# 🎓 Sistem Pengumuman Kelulusan Siswa

> Aplikasi web pengumuman kelulusan berbasis **Astro SSG + PHP API + MySQL**, mendukung multi-lembaga, SKL digital, dan deploy ke static hosting.

---

## ✨ Fitur Utama

### 👩‍🎓 Portal Siswa (Publik)
- **Pencarian kelulusan** berdasarkan NISN dengan perlindungan hash SHA-256
- **Pratinjau SKL** langsung di browser (tanpa login)
- **Download SKL PDF** per siswa (SKL1: Pengumuman / SKL2: Dengan Nilai)
- Tampilan responsif dark/light mode
- Animasi dan desain modern

### 🛡️ Dashboard Admin
- **Login aman** dengan session PHP + proteksi CSRF
- **Manajemen Data Siswa**: tambah, edit, hapus (single & **bulk/massal**), import/export Excel (.xlsx)
- **Manajemen Nilai**: input nilai per siswa untuk SKL dengan nilai
- **Identitas Sekolah**: konfigurasi lengkap data lembaga (nama, NPSN, NSS, alamat, kepala sekolah, dll.)
  - 🗺️ **Cascading Wilayah**: dropdown Provinsi → Kabupaten/Kota otomatis berisi dari data kemendagri
  - 🏙️ **Deteksi Kota/Kabupaten Otomatis**: label "Kabupaten X" atau "Kota X" tampil sesuai pilihan tanpa field tambahan
- **Aset Visual SKL** (drag & drop, auto-convert WebP, maks 3MB):
  - 🖼️ **Logo Sekolah**
  - 🔖 **Stempel / Cap Sekolah**
  - ✍️ **Tanda Tangan Kepala Sekolah**
  - 📄 **Kop Surat** (menggantikan header otomatis pada SKL)
- **Toggle aset** per item (aktifkan/nonaktifkan tampil di SKL)
- **SKL Preview** real-time di dashboard (SKL1 & SKL2)
- **Multi-Lembaga**: satu aplikasi untuk banyak sekolah
- **Sinkronisasi JSON**: export data ke `public/data.json` untuk static hosting
- **Deploy ke Hosting**: generate zip siap upload langsung dari dashboard

---

## 📋 Format Tabel Nilai SKL (Kemdikbud)

SKL dengan Nilai (SKL2) menggunakan format tabel **sesuai standar Kemdikbud** dengan sub-kategori mata pelajaran. Tabel dirender menggunakan font **Arial** untuk keterbacaan optimal pada media cetak.

### 🏫 SMA / MA

| Sub-Kategori | Contoh Mata Pelajaran |
|---|---|
| **Mata Pelajaran Wajib** | Pendidikan Agama & Budi Pekerti, Pancasila, B. Indonesia, Matematika, IPA, IPS, B. Inggris, PJOK, Informatika, Sejarah, Seni Budaya & Prakarya |
| **Mata Pelajaran Pilihan** | 4–5 mapel pilihan sesuai peminatan (diisi otomatis dari sisa data nilai) |
| **Muatan Lokal** | Mata pelajaran lokal khas daerah |
| *(Rata-rata)* | Dihitung otomatis dari semua nilai yang diinput |

### 🏭 SMK

| Sub-Kategori | Contoh Mata Pelajaran |
|---|---|
| **Mata Pelajaran Umum** | Pendidikan Agama, Pancasila, B. Indonesia, PJOK, Sejarah, Seni & Budaya |
| **Mata Pelajaran Kejuruan** | Matematika, B. Inggris, Informatika, IPAS, Dasar-dasar Program Keahlian, Konsentrasi Keahlian, Projek Kreativitas, PKL |
| **Mata Pelajaran Pilihan** | Mapel pilihan di luar kategori utama (diisi otomatis dari sisa data nilai) |
| **Muatan Lokal** | Mata pelajaran lokal khas daerah |
| *(Rata-rata)* | Dihitung otomatis dari semua nilai yang diinput |

> 💡 **Cara Kerja Pencocokan Otomatis:**  
> Sistem mencocokkan nama mata pelajaran yang diinput dengan kata kunci bawaan (contoh: `"agama"`, `"matematika"`, `"pkl"`).  
> Mata pelajaran yang tidak cocok dengan kategori manapun otomatis masuk ke **Mata Pelajaran Pilihan**.

### 🏙️ Deteksi Kota/Kabupaten Otomatis pada SKL

Sistem otomatis menampilkan label yang tepat pada paragraf SKL berdasarkan pilihan Identitas Lembaga:

| Pilihan di Identitas Lembaga | Tampilan di SKL |
|---|---|
| `Kab. Langkat` | **Kabupaten Langkat** |
| `Binjai` | **Kota Binjai** |
| *(kosong)* | `Kota/Kabupaten*) ........` |

Deteksi dilakukan berdasarkan prefix `"Kab. "` dari data wilayah Kemendagri — **tidak perlu field tambahan** di database.

---

## 🧱 Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | [Astro](https://astro.build/) v6 (SSG) + Tailwind CSS v3 |
| **Backend API** | PHP 8.x (Built-in Server / Apache / LiteSpeed) |
| **Database** | MySQL 8.x / MariaDB 10.x |
| **PDF Generation** | Puppeteer (Node.js) — mode server-side |
| **Excel Import/Export** | [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style) |
| **Image Processing** | Canvas API (WebP auto-convert, client-side) |
| **Package Manager** | npm + Composer |
| **Build Tool** | Vite (via Astro) |
| **Deployment Script** | Node.js `scripts/deploy.js` |

---

## 🖥️ Syarat Server Lokal (Development)

Pastikan semua software berikut sudah terinstall di komputer Anda:

| Software | Versi Minimal | Fungsi |
|---|---|---|
| **Node.js** | v18 LTS ke atas | Menjalankan Astro dev server & scripts |
| **npm** | v9+ (ikut Node.js) | Package manager frontend |
| **PHP** | v8.0+ | API server (endpoint `/api/*.php`) |
| **MySQL** | v8.0+ / MariaDB 10.6+ | Database utama |
| **Composer** | v2.x | Dependency manager PHP (opsional jika tidak ada package PHP) |
| **Git** | v2.x | Version control & deploy |

> 💡 **Rekomendasi**: Gunakan **Laragon** atau **XAMPP** di Windows untuk MySQL + PHP secara bersamaan.

**Port yang digunakan:**
- `4321` — Astro dev server (frontend)
- `8090` — PHP built-in server (API backend)

---

## 🚀 Langkah Instalasi (Development)

### 1. Clone Repositori
```bash
git clone https://github.com/username/kelulusan.git
cd kelulusan
```

### 2. Install Dependensi Node.js
```bash
npm install
```

### 3. Konfigurasi Database

Buat database MySQL baru:
```sql
CREATE DATABASE db_kelulusan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Sesuaikan kredensial database di `public/api/db.php`:
```php
$pdo = new PDO("mysql:host=localhost;dbname=db_kelulusan", "root", "password_anda");
```

### 4. Migrasi & Setup Database
```bash
# Buat tabel + isi data awal (sekali saja)
npm run db:setup

# Atau langkah per langkah:
npm run migrate          # Buat struktur tabel
npm run seed             # Isi data dummy (opsional)
npm run export-data      # Generate public/data.json
```

### 5. Jalankan Dev Server

**Windows (PowerShell) — cara termudah:**
```powershell
.\start-dev.ps1
```

Script ini otomatis menjalankan PHP server di port 8090 dan Astro dev server.

**Atau manual (2 terminal terpisah):**
```bash
# Terminal 1 — PHP API server
php -S localhost:8090 -t public -d variables_order=EGPCS

# Terminal 2 — Astro frontend
npm run dev
```

Akses aplikasi di: **http://localhost:4321**

---

## 🔑 Akun Default

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | (sesuai seed / set via dashboard) |

> Ganti password segera setelah login pertama melalui **Dashboard → Pengguna**.

---

## 📁 Struktur Direktori

```
kelulusan/
├── public/                  # File statis & PHP API
│   ├── api/                 # Endpoint PHP
│   │   ├── db.php           # Koneksi database
│   │   ├── identitas.php    # API data lembaga
│   │   ├── siswa.php        # API data siswa
│   │   ├── nilai.php        # API nilai siswa
│   │   ├── login.php        # Autentikasi
│   │   └── ...
│   ├── js/                  # JavaScript dashboard
│   │   ├── dash-init.js     # Init & identitas
│   │   ├── dash-crud.js     # CRUD siswa & nilai
│   │   └── dash-util.js     # Utilities & SKL builder
│   ├── data.json            # Data export (untuk static hosting)
│   └── users.json           # Data user export
├── src/                     # Source Astro
│   └── pages/
│       ├── index.astro      # Halaman pencarian siswa (publik)
│       ├── login.astro      # Halaman login admin
│       └── dashboard/
│           └── [view].astro # Dashboard admin (SPA)
├── scripts/                 # Node.js scripts
│   ├── migrate.js           # Migrasi database
│   ├── seed.js              # Data dummy
│   ├── export-data.js       # Export ke data.json
│   ├── generate-pdf.js      # Generate SKL PDF (Puppeteer)
│   ├── build-split.mjs      # ⚡ Build terpisah frontend/dashboard
│   └── deploy.js            # Build & package untuk hosting
├── astro.config.mjs         # Konfigurasi Astro (build lengkap)
├── astro.config.frontend.mjs  # Konfigurasi build frontend saja
├── astro.config.dashboard.mjs # Konfigurasi build dashboard saja
├── tailwind.config.mjs      # Konfigurasi Tailwind CSS
├── package.json             # Dependensi Node.js
├── composer.json            # Scripts Composer
└── start-dev.ps1            # Script dev server (Windows)
```

---

## 📦 Workflow Publish & Deploy ke Hosting

> 📖 **Panduan lengkap & step-by-step tersedia di: [DEPLOY.md](./DEPLOY.md)**  
> Mencakup deploy frontend ke shared hosting (cPanel) **dan** deploy dashboard admin ke VPS.

### Persiapan Data
Sebelum deploy, pastikan data sudah diekspor:
```bash
npm run export-data    # Export siswa + identitas → public/data.json
npm run export-users   # Export akun admin → public/users.json
```

### Build & Package

#### 🔵 Build Lengkap (Frontend + Dashboard jadi satu `dist/`)
```bash
# All-in-one: export data + build Astro + buat ZIP
npm run deploy

# Atau hanya build:
npm run build          # Build semua halaman ke /dist
```

#### ⚡ Build Terpisah (direkomendasikan untuk deploy terpisah)

```bash
# Build HANYA portal siswa (publik) → dist/frontend/
npm run build:frontend

# Build HANYA admin dashboard → dist/dashboard/
npm run build:dashboard

# Build keduanya sekaligus
npm run build:all
```

| Output | Isi | Tujuan Deploy |
|---|---|---|
| `dist/frontend/` | `index.html`, `404.html` | Shared hosting / cPanel |
| `dist/dashboard/` | `dashboard/*/` + `login/` | VPS / subdomain admin |

> 💡 **Cara kerja `build:frontend`**: Script sementara menyembunyikan folder `dashboard/` **dan** `login.astro` dari Astro, sehingga hanya halaman publik yang di-build (`index.html` + `404.html`). Setelah build, folder output juga dibersihkan dari sisa artefak yang tidak diinginkan. Sebaliknya saat `build:dashboard`, halaman `index.astro`, `login.astro`, dan `404.astro` disembunyikan sementara — kemudian `login.astro` tetap diikutsertakan di output dashboard. File selalu dikembalikan setelah build selesai (termasuk jika terjadi error).

### Deploy ke Hosting (Shared Hosting / cPanel)

> ⚠️ **Prasyarat Hosting**: Hosting harus mendukung **PHP 8.x** dan **MySQL**.

**Langkah:**

1. **Upload file** dari folder `/dist` + `/public` ke `public_html/` di hosting
2. **Upload folder `/public/api/`** ke dalam `public_html/api/` (PHP endpoint)
3. **Buat database MySQL** di cPanel dengan nama dan kredensial sesuai `db.php`
4. **Import SQL** (dari tabel yang sudah di-migrate) ke database hosting
5. **Update `db.php`** di hosting dengan kredensial database hosting:
   ```php
   $pdo = new PDO("mysql:host=localhost;dbname=nama_db_hosting", "user_hosting", "pass_hosting");
   ```
6. **Set `.htaccess`** di `public_html/` untuk routing Astro (jika Apache):
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ /index.html [L]
   ```
7. Akses `https://domain-anda.com` — aplikasi siap!

### Redeploy (Update Data/Konten)
```bash
# 1. Update data siswa di database lokal
# 2. Export ulang data
npm run export-data

# 3. Rebuild & package
npm run deploy

# 4. Upload ulang folder /dist ke hosting
# (atau gunakan git-push.bat jika hosting terhubung ke Git)
```

---

## 🔧 Scripts Tersedia

```bash
# ─── Development ───────────────────────────────────────────────────────────────
npm run dev              # Jalankan Astro dev server (dev mode)
npm run dev:php          # Jalankan PHP API server di port 8090
npm run preview          # Preview hasil build lokal

# ─── Build ─────────────────────────────────────────────────────────────────────
npm run build            # Build semua halaman → /dist (build standar)
npm run build:frontend   # Build HANYA portal siswa → /dist/frontend/
npm run build:dashboard  # Build HANYA admin dashboard → /dist/dashboard/
npm run build:all        # Build keduanya terpisah (frontend + dashboard)

# ─── Database ──────────────────────────────────────────────────────────────────
npm run migrate          # Buat tabel database
npm run seed             # Isi data dummy
npm run export-data      # Export data ke public/data.json
npm run export-users     # Export user ke public/users.json
npm run db:setup         # Setup database lengkap (migrate + seed + export)

# ─── Publish & Deploy ──────────────────────────────────────────────────────────
npm run generate-pdf     # Generate semua SKL PDF via Puppeteer
npm run publish          # Export + Generate PDF + Build
npm run deploy           # Full deploy: export + build + zip
```

---

## 🔒 Keamanan

- Password disimpan dengan **bcrypt hash** (via PHP `password_hash`)
- Data siswa di `data.json` menggunakan **NISN ter-hash SHA-256** — NISN asli tidak terekspos
- Session admin diproteksi dengan PHP session + role check
- API endpoint memerlukan autentikasi session yang valid
- Upload gambar dikonversi ke **WebP** client-side sebelum disimpan (tidak ada upload file server-side)

---

## 📅 Changelog

### v2.1 — Mei 2026
- ✅ **Tabel Nilai Format Kemdikbud**: SKL2 kini menggunakan tabel nilai bersub-kategori (Wajib / Kejuruan / Pilihan / Muatan Lokal) sesuai standar SMA dan SMK
- ✅ **Font Tabel Nilai**: Diubah ke **Arial** untuk keterbacaan optimal pada cetak
- ✅ **Deteksi Kota/Kabupaten Otomatis**: Label "Kabupaten X" / "Kota X" tampil otomatis sesuai pilihan identitas lembaga
- ✅ **Cascading Wilayah**: Dropdown Provinsi → Kabupaten/Kota pada form Identitas Lembaga menggunakan data Kemendagri
- ✅ **Bulk Delete Siswa**: Tombol "Hapus Terpilih" untuk menghapus banyak data siswa sekaligus
- ✅ **Template Import Excel Mapel Lengkap**: Template download kini memuat kolom mapel sesuai SKL Kemdikbud (SMA: 11 wajib + 5 pilihan + mulok; SMK: 6 umum + 8 kejuruan + 3 pilihan + mulok) beserta sheet **"Panduan Mapel"**
- ✅ **SKL2 Layout 2 Halaman**: Tanda tangan + kop surat otomatis pindah ke halaman 2 saat konten terlalu panjang
- ✅ **Foto 3×4 Placeholder**: Area foto siswa pada halaman 2 SKL2
- ✅ **Print CSS A4 Optimal**: Margin minimal `5mm 6mm` untuk memaksimalkan area cetak
- ✅ **Perbaikan Print Dialog**: Event listener print tidak lagi terpicu dua kali

### v2.0 — April 2026
- ✅ Template SKL SMA/SMK dipisah dengan identitas data berbeda
- ✅ Multi-lembaga dengan manajemen pengaturan per lembaga
- ✅ Preview SKL real-time di dashboard
- ✅ Stempel lulus terintegrasi di preview dan PDF

---

## 📝 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan pendidikan.

---

> Dibuat dengan ❤️ untuk mempermudah administrasi pengumuman kelulusan sekolah di Indonesia.

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
- **Manajemen Data Siswa**: tambah, edit, hapus, import/export Excel (.xlsx)
- **Manajemen Nilai**: input nilai per siswa untuk SKL dengan nilai
- **Identitas Sekolah**: konfigurasi lengkap data lembaga (nama, NPSN, NSS, alamat, kepala sekolah, dll.)
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
│   └── deploy.js            # Build & package untuk hosting
├── astro.config.mjs         # Konfigurasi Astro + proxy
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
```bash
# All-in-one: export data + build Astro + buat ZIP
npm run deploy

# Atau step by step:
npm run build          # Build Astro ke /dist
# → File zip siap deploy akan dibuat di root proyek
```

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
npm run dev              # Jalankan Astro dev server (dev mode)
npm run build            # Build production ke /dist
npm run preview          # Preview hasil build lokal
npm run migrate          # Buat tabel database
npm run seed             # Isi data dummy
npm run export-data      # Export data ke public/data.json
npm run export-users     # Export user ke public/users.json
npm run db:setup         # Setup database lengkap (migrate + seed + export)
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

## 📝 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan pendidikan.

---

> Dibuat dengan ❤️ untuk mempermudah administrasi pengumuman kelulusan sekolah di Indonesia.

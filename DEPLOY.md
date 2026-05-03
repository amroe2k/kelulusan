# 🚀 Panduan Deploy — Sistem Pengumuman Kelulusan

Dokumen ini menjelaskan dua jalur deploy yang tersedia:

| Jalur | Deskripsi | Target | Build Command |
|---|---|---|---|
| **[A] Frontend Statis** | Portal siswa (cek kelulusan + download SKL) | Shared Hosting / cPanel / Niagahoster | `npm run build:frontend` |
| **[B] Dashboard Admin** | Panel admin lengkap + database | VPS / Server dengan PHP & MySQL | `npm run build:dashboard` |

> **Arsitektur Singkat:**  
> Dashboard admin (VPS) → Generate `data.json` → Upload ke hosting → Portal siswa membaca `data.json`

> 💡 **Build terpisah tersedia**: Gunakan `npm run build:frontend` untuk hanya membangun portal publik (`dist/frontend/`), atau `npm run build:dashboard` untuk hanya dashboard admin (`dist/dashboard/`). Lihat **[💻 Panduan Build Terpisah](#-build-terpisah-frontend--dashboard)** di bawah.

---

## ❓ Apakah Dashboard Admin Butuh Node.js di Server?

**Tidak.** Node.js **hanya dibutuhkan saat proses build** — bisa dilakukan di komputer lokal.  
Setelah build selesai, server hanya butuh **PHP + MySQL**.

| Komponen | Node.js di Server? | Keterangan |
|---|---|---|
| Dashboard UI (`/dist`) | ❌ Tidak | File statis HTML/JS/CSS hasil build |
| PHP API (`/api/*.php`) | ❌ Tidak | Pure PHP + MySQL |
| Autentikasi & CRUD | ❌ Tidak | Dihandle PHP |
| Generate JSON | ❌ Tidak | `generate_json.php` v3 — Pure PHP (Node tidak diperlukan) |
| SKL Preview & PDF | ❌ Tidak | Render di browser (client-side) |
| Build Astro | ✅ **Sekali** | Jalankan `npm run build` di komputer lokal |
| Migrasi Database | ✅ **Sekali** | `npm run migrate` di lokal, atau import SQL |
| PDF Puppeteer (server) | ✅ Jika dipakai | Opsional — ada alternatif browser print |

**Alur build → deploy tanpa Node.js di server:**
```
Komputer Lokal (ada Node.js)       →    VPS/Hosting (cukup PHP + MySQL)
────────────────────────────────────────────────────────────────────────
  npm run migrate           # Setup DB   →  Import schema.sql via phpMyAdmin
  npm run build:frontend    # Build portal publik   →  Upload /dist/frontend/ ke hosting
  npm run build:dashboard   # Build admin dashboard →  Upload /dist/dashboard/ ke VPS
  npm run export-data       # Export JSON           →  Upload data.json ke server
```

---

## 📋 Prasyarat

### Untuk Frontend Hosting (Jalur A)
- Shared hosting dengan dukungan **PHP 8.x** (untuk `admin-upload.php`)
- Akses FTP / File Manager cPanel
- Domain atau subdomain aktif

### Untuk Dashboard Admin di VPS (Jalur B)
- VPS dengan OS **Ubuntu 20.04+** atau **Debian 11+**
- **PHP 8.1+** dengan ekstensi: `pdo_mysql`, `mbstring`, `json`, `session`
- **MySQL 8.0+** atau **MariaDB 10.6+**
- **Nginx** atau **Apache** sebagai web server
- **Node.js 18+** — hanya di mesin build/lokal, **tidak wajib di VPS**

---

## 💻 Build Terpisah: Frontend & Dashboard

Sejak versi terbaru, build dapat dilakukan secara **terpisah** antara portal siswa dan admin dashboard — menghasilkan output yang lebih bersih dan deployment yang lebih aman.

### Perbandingan Mode Build

| Mode | Command | Output | Isi |
|---|---|---|---|
| Build standar (semua) | `npm run build` | `dist/` | Semua halaman |
| Build frontend saja | `npm run build:frontend` | `dist/frontend/` | Portal siswa saja (index, 404) — **login tidak disertakan** |
| Build dashboard saja | `npm run build:dashboard` | `dist/dashboard/` | Semua halaman `/dashboard/*` + login |
| Build keduanya | `npm run build:all` | `dist/frontend/` + `dist/dashboard/` | Keduanya terpisah |

### Cara Kerja

Script `scripts/build-split.mjs` menangani pemisahan secara otomatis:

```
npm run build:frontend
  │
  ├─ Sembunyikan sementara: src/pages/dashboard/ + src/pages/login.astro
  ├─ Jalankan: astro build --config astro.config.frontend.mjs
  ├─ Output: dist/frontend/  (hanya index.html + 404.html)
  ├─ Cleanup: hapus dist/frontend/login/ jika ada (safety net)
  └─ Kembalikan: src/pages/dashboard/ + src/pages/login.astro  ← selalu dikembalikan, bahkan jika error
```

```
npm run build:dashboard
  │
  ├─ Sembunyikan sementara: src/pages/index.astro + login.astro
  ├─ Jalankan: astro build --config astro.config.dashboard.mjs
  ├─ Output: dist/dashboard/  (hanya halaman /dashboard/*)
  └─ Kembalikan: src/pages/index.astro + login.astro
```

### Keuntungan Build Terpisah

| Keuntungan | Keterangan |
|---|---|
| **Keamanan** | File dashboard tidak ikut ke hosting frontend publik |
| **Ukuran lebih kecil** | Tiap bundle hanya berisi halaman yang diperlukan |
| **Deploy lebih cepat** | Update frontend → hanya rebuild frontend, tidak perlu rebuild dashboard |
| **Pemisahan infrastruktur** | Frontend di shared hosting, dashboard di VPS — build-nya pun terpisah |

### Contoh Workflow Lengkap

```bash
# ── Pertama kali setup ──────────────────────────────────────────
npm run export-data          # Export data.json dari DB

# Build frontend untuk shared hosting
npm run build:frontend       # → dist/frontend/

# Build dashboard untuk VPS
npm run build:dashboard      # → dist/dashboard/

# ── Update data saja (tanpa perubahan kode) ────────────────────
npm run export-data          # Export ulang data.json
# Tidak perlu rebuild! Cukup upload data.json terbaru

# ── Update kode frontend saja ──────────────────────────────────
npm run build:frontend       # Hanya rebuild frontend
# Upload dist/frontend/ ke shared hosting

# ── Update kode dashboard saja ────────────────────────────────
npm run build:dashboard      # Hanya rebuild dashboard
# Upload dist/dashboard/ ke VPS
```

### File Konfigurasi

| File | Fungsi |
|---|---|
| `astro.config.mjs` | Config Astro default (build standar — semua halaman ke `dist/`) |
| `astro.config.frontend.mjs` | Config build frontend saja (`outDir: dist/frontend`) |
| `astro.config.dashboard.mjs` | Config build dashboard saja (`outDir: dist/dashboard`) |
| `scripts/build-split.mjs` | Engine script yang mengorkestrasi proses build terpisah |

---

## [C] Bundle Self-Deploy — ZIP Siap Upload per Lembaga

### Konsep
Fitur ini menghasilkan **1 file ZIP per lembaga** yang benar-benar siap deploy — cukup extract ke `public_html/` dan portal langsung aktif. Tidak perlu konfigurasi tambahan.

```
Admin Dashboard (VPS)
        │
        ▼
[Sinkronisasi → Bundle ZIP]
        │
        ▼
 bundle-smanegeri1-2026-05-01.zip
 ├── index.html           ← Portal utama
 ├── _astro/              ← JS/CSS bundle
 ├── data.json            ← Data siswa lembaga ini
 ├── bundle-config.js     ← Kunci keamanan lembaga
 ├── admin-upload.php     ← Panel update data
 ├── .htaccess            ← Routing Apache (SPA)
 └── README-DEPLOY.md     ← Panduan deploy
        │
        ▼
 Kirim ZIP ke operator IT sekolah
        │
        ▼
 Extract ke public_html/ → Selesai!
```

---

### Cara Menggunakan Fitur Bundle di Dashboard

1. **Login** ke Dashboard Admin
2. Buka **Sinkronisasi Cloud** (`/dashboard/sync`)
3. **Langkah 1** — Generate JSON lembaga
4. **Langkah 4** — Pilih lembaga → klik **Buat Bundle ZIP**
5. Klik **Unduh Bundle** — dapatkan file `bundle-{slug}-{tanggal}.zip`
6. Kirim ZIP ke operator IT sekolah/lembaga

---

### Yang Wajib Dilakukan Lembaga (Self-Deploy)

| Langkah | Tindakan |
|---|---|
| 1 | Extract isi ZIP ke `public_html/` hosting |
| 2 | Pastikan `index.html` ada di root (bukan subfolder) |
| 3 | **Set password** `admin-upload.php`: buka file → ubah `UPLOAD_PASSWORD` |
| 4 | Akses domain → portal aktif |
| 5 | Update data kapan saja via `https://domain.com/admin-upload.php` |

> ⚠️ **Langkah 3 wajib** — default password di `admin-upload.php` harus diganti sebelum portal dipublikasikan.

---

### Isi Lengkap Bundle ZIP

| File | Sumber | Fungsi |
|---|---|---|
| `index.html` | `/dist/` | Halaman utama portal siswa |
| `_astro/` | `/dist/_astro/` | Aset JS/CSS/Font |
| `data.json` | `/public/exports/` | Data siswa + identitas lembaga |
| `bundle-config.js` | Generated | Kunci integritas unik per lembaga |
| `admin-upload.php` | `/public/` | Panel update `data.json` di hosting |
| `.htaccess` | Generated | Routing Apache untuk SPA |
| `README-DEPLOY.md` | Generated | Panduan deploy dalam bundle |

---

### Catatan Penting Bundle

- **1 bundle = 1 lembaga** — ZIP berisi `data.json` spesifik lembaga, tidak bisa dipakai campur-aduk
- **Bundle lama otomatis dihapus** — setiap generate bundle baru untuk lembaga yang sama, bundle lama dihapus
- **Bundle menggunakan `/dist` saat ini** — jika ada update tampilan, jalankan `npm run build` sebelum generate bundle baru
- **Tidak butuh PHP di build server** — proses buat ZIP dilakukan di VPS oleh `create-bundle.php`

---

## [A] Deploy Frontend — Static Hosting (Shared Hosting / cPanel)

### Konsep
Portal siswa adalah **aplikasi statis** (HTML + JS + CSS) yang berjalan tanpa PHP/database. Data siswa dibaca dari file `data.json` yang diupload oleh admin.

```
Alur Data:
Admin Dashboard (VPS) ──Generate──▶ data.json ──Upload──▶ Hosting
                                                              │
                                                    Siswa akses portal
```

---

### Langkah A1 — Build Frontend

Di **komputer lokal** (yang ada Node.js):

```bash
# 1. Export data terbaru dari database ke data.json
npm run export-data

# 2. Build HANYA halaman frontend publik → dist/frontend/
npm run build:frontend
```

> Setelah selesai, folder `/dist/frontend/` berisi semua file statis siap upload.  
> Folder ini **tidak mengandung** file dashboard admin.

<details>
<summary>Atau build semua sekaligus (jika ingin keduanya)</summary>

```bash
# Build semua halaman ke satu folder /dist (cara lama)
npm run build

# Build keduanya terpisah di satu langkah
npm run build:all
```

</details>

---

### Langkah A2 — Siapkan File untuk Upload

Struktur yang perlu diupload ke `public_html/`:

```
public_html/
├── index.html              ← dari /dist/frontend/index.html
├── _astro/                 ← dari /dist/frontend/_astro/ (JS/CSS bundle)
├── favicon.svg             ← dari /dist/frontend/
├── data.json               ← dari /public/data.json  ⚠️ PENTING
├── admin-upload.php        ← dari /public/admin-upload.php  ⚠️ PENTING
└── (file statis lainnya dari /dist/frontend/)
```

> ⚠️ **`data.json` wajib ada** — Portal tidak akan berfungsi tanpanya.  
> ⚠️ **`admin-upload.php`** diperlukan untuk update data di kemudian hari.

**Cara termudah**: gunakan fitur **Bundle ZIP** di Dashboard Admin (`Sinkronisasi Cloud → Langkah 4`). ZIP berisi semua file siap upload termasuk `data.json`.

---

### Langkah A3 — Upload ke cPanel

**Via File Manager cPanel:**
1. Login ke cPanel → **File Manager**
2. Buka folder `public_html/`
3. Upload file ZIP hasil bundle → klik kanan → **Extract**
4. Pastikan `index.html` berada langsung di `public_html/` (bukan di subfolder)

**Via FTP (FileZilla / WinSCP):**
```
Host     : ftp.namadomain.com
Port     : 21
Username : user_cpanel_anda
Password : pass_cpanel_anda
Remote   : /public_html/
```

---

### Langkah A4 — Konfigurasi `.htaccess` (Apache)

Buat file `.htaccess` di `public_html/` agar routing Astro berfungsi:

```apache
Options -MultiViews
RewriteEngine On

# Izinkan akses ke file/folder yang memang ada
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Semua route lainnya → index.html (SPA fallback)
RewriteRule ^(.*)$ /index.html [L,QSA]

# Cache control untuk aset statis
<FilesMatch "\.(js|css|webp|png|svg|woff2)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Jangan cache data.json (selalu fresh)
<FilesMatch "data\.json$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
```

> Untuk **Nginx**, lihat konfigurasi di bagian [B] bawah.

---

### Langkah A5 — Set Password `admin-upload.php`

File `admin-upload.php` adalah endpoint untuk update `data.json` dari admin.

1. Buka `admin-upload.php` di hosting menggunakan text editor / file manager
2. Ubah password di baris pertama:

```php
// Baris ~10 di admin-upload.php
define('UPLOAD_PASSWORD', 'GANTI_PASSWORD_KUAT_ANDA');
```

3. Simpan. Akses panel upload via:
   ```
   https://namadomain.com/admin-upload.php
   ```

> 💡 Password juga bisa diset dari Dashboard Admin → **Sinkronisasi Cloud → Set Password admin-upload.php**

---

### Langkah A6 — Verifikasi

Cek portal berfungsi:
- ✅ `https://namadomain.com` → Halaman cari NISN muncul
- ✅ `https://namadomain.com/admin-upload.php` → Halaman upload muncul (minta password)
- ✅ Input NISN siswa → Muncul status kelulusan

---

### Update Data (Setelah Deployment Awal)

Setiap kali ada perubahan data siswa:

**Dari Dashboard Admin:**
1. Edit/import data siswa di `Data Kelulusan`
2. Pergi ke `Sinkronisasi Cloud → Generate JSON`
3. Download file `data.json` yang baru
4. Upload ke `https://namadomain.com/admin-upload.php`

**Via Bundle ZIP:**
1. `Sinkronisasi Cloud → Bundle ZIP` → Pilih lembaga → Buat Bundle
2. Download ZIP → Extract → Upload ke cPanel

---

## [B] Deploy Dashboard Admin — VPS (PHP Only, Tanpa Node.js)

### Konsep
Dashboard admin berjalan dengan **PHP + MySQL + Nginx** saja di server.  
Node.js hanya diperlukan di **mesin lokal** untuk build dan migrasi awal.

> 💡 **Rekomendasi**: VPS minimal **1GB RAM**, **1 vCPU**, **10GB storage**.

---

### Langkah B1 — Persiapan VPS (PHP + MySQL + Nginx)

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install hanya yang dibutuhkan (tanpa Node.js)
sudo apt install -y nginx php8.2-fpm php8.2-mysql php8.2-mbstring \
  php8.2-json php8.2-curl php8.2-xml php8.2-zip \
  mysql-server unzip

# Verifikasi
php --version    # PHP 8.2.x
mysql --version  # mysql  Ver 8.x
nginx -v         # nginx/1.x.x
```

---

### Langkah B2 — Siapkan File Build (di Komputer Lokal)

**Di komputer lokal** (yang ada Node.js):

```bash
# 1. Konfigurasi db.php untuk database VPS
#    Edit public/api/db.php → ganti host, dbname, user, password

# 2. Jalankan migrasi (generate file SQL)
npm run migrate           # Buat struktur tabel di DB lokal dulu
# Atau: generate SQL dump manual
mysqldump -u root db_kelulusan --no-data > schema.sql

# 3. Build KHUSUS dashboard admin → dist/dashboard/
npm run build:dashboard

# 4. Export data
npm run export-data       # → public/data.json

# 5. Zip semua yang dibutuhkan server
# Yang perlu diupload:
#   - /dist/dashboard/  (hasil build dashboard)
#   - /public/api/      (PHP backend)
#   - /public/admin-upload.php
#   - /public/data.json
#   - schema.sql        (untuk import ke MySQL VPS)
```

---

### Langkah B3 — Upload ke VPS

**Via SCP (dari lokal ke VPS):**

```bash
# Upload folder dist/dashboard ke VPS (khusus dashboard)
scp -r dist/dashboard/ user@ip-vps:/var/www/kelulusan/dist/

# Upload folder public/api/
scp -r public/api/ user@ip-vps:/var/www/kelulusan/public/

# Upload file penting
scp public/admin-upload.php user@ip-vps:/var/www/kelulusan/public/
scp public/data.json user@ip-vps:/var/www/kelulusan/public/
scp schema.sql user@ip-vps:~/
```

**Atau via Git** (cara lebih mudah):
```bash
# Di VPS — clone dari GitHub (sudah include /dist jika di-commit)
cd /var/www
sudo git clone https://github.com/username/kelulusan.git
```

---

### Langkah B4 — Setup Database MySQL di VPS

**Di VPS:**

```bash
# Masuk MySQL
sudo mysql

# Buat database dan user
CREATE DATABASE db_kelulusan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kelulusan_user'@'localhost' IDENTIFIED BY 'password_kuat_db';
GRANT ALL PRIVILEGES ON db_kelulusan.* TO 'kelulusan_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema (struktur tabel)
mysql -u kelulusan_user -p db_kelulusan < ~/schema.sql
```

**Atau via phpMyAdmin** (jika hosting menyediakan):
1. Buka phpMyAdmin → Pilih database
2. Tab **Import** → Upload `schema.sql` → Klik Go

---

### Langkah B5 — Konfigurasi Database via `.env`

Sejak versi terbaru, kredensial database dibaca dari file `.env` — **jangan edit `db.php` langsung**.

```bash
# Buat file .env di root project VPS
nano /var/www/kelulusan/.env
```

```ini
# /var/www/kelulusan/.env
# ──────────────────────────────────────
#  JANGAN commit file ini ke Git!
# ──────────────────────────────────────

# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=db_kelulusan
DB_USER=kelulusan_user
DB_PASS=password_kuat_db
DB_CHARSET=utf8mb4

# Aplikasi
APP_ENV=production
APP_URL=https://admin.namadomain.com

# Session
SESSION_NAME=kls_session

# JSON Retention (max arsip per lembaga)
JSON_RETENTION_LIMIT=5
```

```bash
# Proteksi file .env agar tidak bisa diakses via browser
chmod 640 /var/www/kelulusan/.env
chown www-data:www-data /var/www/kelulusan/.env
```

> 💡 Template tersedia di `.env.example` — salin dan sesuaikan nilainya.

> ⚠️ Pastikan Nginx **memblokir akses langsung ke `.env`**:
> ```nginx
> location ~ /\.env { deny all; return 404; }
> ```

---

### Langkah B6 — Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/kelulusan-admin
```

```nginx
server {
    listen 80;
    server_name admin.namadomain.com;  # ← Ganti dengan domain/IP Anda

    root /var/www/kelulusan/dist;
    index index.html;
    charset utf-8;

    access_log /var/log/nginx/kelulusan-access.log;
    error_log  /var/log/nginx/kelulusan-error.log;

    # Aset statis — cache lama
    location ~* \.(js|css|webp|png|svg|woff2|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # data.json — jangan di-cache (agar update langsung terlihat)
    location = /data.json {
        root /var/www/kelulusan/public;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    # PHP API endpoint (/api/*.php)
    location /api/ {
        alias /var/www/kelulusan/public/api/;
        try_files $uri $uri/ =404;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
            fastcgi_param PHP_VALUE "variables_order=EGPCS";
        }
    }

    # admin-upload.php
    location = /admin-upload.php {
        root /var/www/kelulusan/public;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        include fastcgi_params;
    }

    # SPA Fallback — semua route → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Aktifkan dan reload
sudo ln -s /etc/nginx/sites-available/kelulusan-admin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### Langkah B7 — Konfigurasi PHP-FPM

```bash
sudo nano /etc/php/8.2/fpm/php.ini
```

```ini
session.gc_maxlifetime = 7200
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 120
memory_limit = 256M
variables_order = EGPCS
display_errors = Off        ; ← Wajib Off di produksi
```

```bash
sudo systemctl restart php8.2-fpm
```

---

### Langkah B8 — Permission File

```bash
# Ownership
sudo chown -R www-data:www-data /var/www/kelulusan

# Permission standar
sudo find /var/www/kelulusan -type d -exec chmod 755 {} \;
sudo find /var/www/kelulusan -type f -exec chmod 644 {} \;

# data.json harus bisa ditulis PHP (untuk Generate JSON)
sudo chmod 664 /var/www/kelulusan/public/data.json
```

---

### Langkah B9 — SSL dengan Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.namadomain.com
sudo certbot renew --dry-run    # Test auto-renewal
```

---

### Langkah B10 — Buat Akun Admin Pertama

Karena tidak ada `npm run seed`, buat akun admin langsung via MySQL:

```bash
# Generate SHA-256 hash password (sesuai sistem autentikasi portal)
php -r "echo hash('sha256', 'password_baru_anda') . PHP_EOL;"
# Output: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3

# Masuk MySQL di VPS
sudo mysql db_kelulusan

# Insert akun admin (ganti HASH_DI_ATAS dengan output perintah php di atas)
INSERT INTO users (id, username, password_hash, nama, role, aktif)
VALUES (UUID(), 'admin', 'HASH_DI_ATAS', 'Administrator', 'admin', 1);
EXIT;
```

Akses dashboard:
```
https://admin.namadomain.com/login
```

> **⚠️ Ganti password segera** via **Dashboard → Manajemen Akun**

---

### Langkah B11 — Verifikasi

```bash
# Test PHP API
curl -I https://admin.namadomain.com/api/login.php

# Cek error log jika ada masalah
sudo tail -f /var/log/nginx/kelulusan-error.log
sudo tail -f /var/log/php8.2-fpm.log
```

---

### Update Deployment (Jika Ada Perubahan Frontend)

Jika ada update tampilan/fitur (yang memerlukan rebuild Astro):

```bash
# Di komputer lokal — pull update & build ulang
git pull
npm install

# Build HANYA dashboard (lebih cepat dari build penuh)
npm run build:dashboard

# Upload ulang folder /dist/dashboard/ ke VPS
scp -r dist/dashboard/ user@ip-vps:/var/www/kelulusan/dist/
```

> **Data siswa di database tidak terpengaruh** oleh update frontend.

---

## 🔄 Workflow Update Data Harian (Rutin)

Setelah deployment awal, alur kerja admin setiap ada perubahan data:

```
1. Login Dashboard Admin (VPS / browser)
         │
         ▼
2. Kelola Data Siswa
   (Tambah / Edit / Import XLSX / Toggle Status)
         │
         ▼
3. Sinkronisasi Cloud → Generate JSON
   (Masukkan password → Klik Generate)
         │
         ▼
4. Pilihan deploy ke hosting frontend:
   ┌─────────────────────────────────┐
   │ A. Upload Manual                │
   │    Download data.json →         │
   │    Upload ke admin-upload.php   │
   ├─────────────────────────────────┤
   │ B. Bundle ZIP                   │
   │    Generate bundle →            │
   │    Upload semua file ke hosting │
   └─────────────────────────────────┘
```

---

## 🛡️ Checklist Keamanan Produksi

- [ ] Ganti password admin default
- [ ] Set password kuat di `admin-upload.php`
- [ ] Aktifkan HTTPS (SSL Let's Encrypt)
- [ ] Ganti kredensial database dari default
- [ ] `display_errors = Off` di `php.ini`
- [ ] Aktifkan firewall: `sudo ufw allow 'Nginx Full' && sudo ufw enable`
- [ ] Backup database rutin via cron:
  ```bash
  # /etc/cron.d/kelulusan-backup
  0 2 * * * www-data mysqldump -u kelulusan_user -p'password' db_kelulusan | gzip > /backup/db_$(date +\%Y\%m\%d).sql.gz
  ```

---

## 🔧 Troubleshooting Umum

| Masalah | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Portal siswa kosong | `data.json` tidak ada | Upload via `admin-upload.php` |
| API 401 Unauthorized | Session PHP bermasalah | Cek `session.save_path`, restart PHP-FPM |
| API 500 Error | Koneksi DB gagal | Cek `db.php`, cek MySQL service |
| Login dashboard gagal | Password / cookies | Clear browser cookies, cek `login.php` |
| Nginx 502 Bad Gateway | PHP-FPM tidak jalan | `sudo systemctl restart php8.2-fpm` |
| `data.json` tidak bisa ditulis | Permission salah | `sudo chmod 664 public/data.json` |
| SKL Preview tidak tampil | Asset belum diupload | Upload via **Identitas Lembaga → Aset Visual** |
| Halaman `/dashboard/*` 404 | SPA fallback belum dikonfigurasi | Tambahkan `.htaccess` atau konfigurasi Nginx |
| Upload XLSX gagal | `upload_max_filesize` kecil | Naikkan ke `10M` di `php.ini` |

---

## 📞 Referensi

- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/)
- [Nginx PHP-FPM Setup](https://www.nginx.com/resources/wiki/start/topics/examples/phpfcgi/)
- [Let's Encrypt Certbot](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal)
- [README Utama](./README.md)

---

> Dibuat untuk kemudahan tim IT sekolah dalam melakukan deployment mandiri.  
> Jika menemui kendala, cek log server dan pastikan semua permission file sudah benar.

---

## 🛠️ Script: `deploy-dashboard.ps1`

Script PowerShell ini bertugas **mengemas seluruh komponen Dashboard Admin** menjadi satu file ZIP siap deploy ke VPS atau cPanel. Jalankan dari komputer lokal (Windows).

### Cara Pakai

```powershell
.\deploy-dashboard.ps1              # Build ulang + bundle (default)
.\deploy-dashboard.ps1 -SkipBuild  # Bundle tanpa rebuild (gunakan dist/ yang ada)
.\deploy-dashboard.ps1 -SkipDb     # Bundle tanpa export skema SQL
.\deploy-dashboard.ps1 -OutputDir .\release  # Tentukan folder output
```

### Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Node.js | Untuk `npm run build:dashboard` |
| mysqldump | Untuk export schema (auto-detect XAMPP/Laragon/WAMP) |
| PowerShell 5.1+ | Sudah tersedia di Windows 10/11 |

### Alur Eksekusi

```
[1] Baca .env              → Ambil koneksi DB otomatis
[2] npm run build:dashboard → Compile UI ke dist/dashboard/
[3] mysqldump --no-data    → Export struktur tabel ke schema.sql
[4] Susun bundle temp/     → dashboard/, api/, js/, .env.example
[5] Generate setup-vps.sh  → Script deploy siap pakai (5 langkah)
[6] Generate nginx-vhost.conf → Konfigurasi virtual host Nginx
[7] Generate .htaccess     → Konfigurasi routing Apache/cPanel
[8] Generate SETUP.md      → Panduan deploy ringkas
[9] Compress ke ZIP        → deploy/deploy-dashboard-YYYYMMDD-HHmmss.zip
```

### Isi File ZIP yang Dihasilkan

| File/Folder | Isi |
|---|---|
| `dashboard/` | Build Astro UI dashboard (HTML/CSS/JS) |
| `api/` | Semua file PHP di `public/api/` |
| `js/` | Semua file `dash-*.js` dari `public/js/` |
| `schema.sql` | Struktur tabel MySQL (tanpa data) |
| `.env.example` | Template konfigurasi environment |
| `.htaccess` | Routing SPA untuk Apache/cPanel |
| `nginx-vhost.conf` | Konfigurasi virtual host Nginx VPS |
| `setup-vps.sh` | Script bash deploy untuk Linux VPS |
| `SETUP.md` | Panduan deploy ringkas |

> **Catatan:** `data.json`, `users.json`, dan folder `bundles/` **tidak ikut dikemas** untuk alasan keamanan.

### `setup-vps.sh` — Asumsi Server Sudah Siap

Script bash yang dihasilkan **mengasumsikan server (cPanel/VPS managed) sudah memiliki**:
- ✅ PHP 8.x (sudah terinstall)
- ✅ MySQL/MariaDB (sudah terinstall)  
- ✅ Nginx atau Apache (sudah terinstall)

Yang dilakukan `setup-vps.sh`:
1. Membuat struktur direktori web root
2. Menyalin file dari bundle (`dashboard/`, `api/`, `js/`)
3. Import `schema.sql` ke database yang sudah disiapkan
4. Membuat file `.env` dengan kredensial DB
5. Set permission file yang tepat

**Sebelum menjalankan**, edit bagian konfigurasi di atas:
```bash
DOMAIN="admin.namadomain.com"   # GANTI domain Anda
WEBROOT="/var/www/kelulusan"    # Path web root di server
DB_NAME="db_kelulusan"          # Nama database (sudah dibuat)
DB_USER="kelulusan_user"        # User database (sudah dibuat)
DB_PASS="GANTI_PASSWORD_DB"     # Password user database
```


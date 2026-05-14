<?php
/**
 * create-bundle.php
 * Buat bundle ZIP dari /dist + data.json lembaga untuk self-deploy ke hosting.
 */
session_start();
require_once 'db.php';

// ── Auth check ────────────────────────────────────────────────────────────
if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'operator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

if (!class_exists('ZipArchive')) {
    echo json_encode(['success' => false, 'error' => 'PHP ZipArchive tidak tersedia di server ini.']);
    exit;
}

$body      = getJsonBody();
$lembagaId = trim($body['lembaga_id'] ?? '');
$fileName  = trim($body['file_name'] ?? '');

if (!$lembagaId) {
    echo json_encode(['success' => false, 'error' => 'lembaga_id diperlukan.']);
    exit;
}

// ── Ambil info lembaga ────────────────────────────────────────────────────
$stmt = $pdo->prepare("SELECT nama, slug FROM lembaga WHERE id = ?");
$stmt->execute([$lembagaId]);
$lembaga = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$lembaga) {
    echo json_encode(['success' => false, 'error' => 'Lembaga tidak ditemukan.']);
    exit;
}
$slug            = $lembaga['slug'];
$integritySecret = !empty($lembaga['integrity_secret'])
    ? $lembaga['integrity_secret']
    : 'kls-portal-integrity-2026';

// ── Tentukan file data.json yang digunakan ────────────────────────────────
$exportsDir = dirname(__DIR__) . '/exports/';

if ($fileName) {
    // File spesifik dipilih user
    $dataJsonSrc = $exportsDir . basename($fileName);
} else {
    // Cari arsip terbaru untuk lembaga ini
    $stmt2 = $pdo->prepare(
        "SELECT file_name FROM json_history
         WHERE lembaga_id = ? AND file_name IS NOT NULL
         ORDER BY generated_at DESC LIMIT 1"
    );
    $stmt2->execute([$lembagaId]);
    $row = $stmt2->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['success' => false, 'error' => 'Belum ada arsip JSON untuk lembaga ini. Generate dulu via Langkah 1.']);
        exit;
    }
    $dataJsonSrc = $exportsDir . $row['file_name'];
    $fileName    = $row['file_name'];
}

if (!file_exists($dataJsonSrc)) {
    echo json_encode(['success' => false, 'error' => 'File JSON arsip tidak ditemukan: ' . basename($dataJsonSrc)]);
    exit;
}

// ── Tentukan folder dist ──────────────────────────────────────────────────
// Prioritas: dist/frontend/ (build terpisah) → dist/ (build lengkap legacy)
$rootDir          = dirname(__DIR__, 2);
$distFrontendDir  = $rootDir . '/dist/frontend';
$distLegacyDir    = $rootDir . '/dist';

$buildMode = 'none';
if (is_dir($distFrontendDir) && file_exists($distFrontendDir . '/index.html')) {
    // ✅ Build terpisah tersedia — gunakan dist/frontend/ (hanya portal siswa)
    $distDir   = $distFrontendDir;
    $buildMode = 'frontend';
} elseif (is_dir($distLegacyDir) && file_exists($distLegacyDir . '/index.html')) {
    // ⚠️ Fallback ke dist/ (build lengkap — termasuk dashboard)
    $distDir   = $distLegacyDir;
    $buildMode = 'legacy';
} else {
    echo json_encode([
        'success' => false,
        'error'   => 'Folder build belum ada. Jalankan "npm run build:frontend" untuk build terpisah, atau "npm run build" untuk build lengkap.',
    ]);
    exit;
}

// ── Buat folder bundles ───────────────────────────────────────────────────
$bundlesDir = dirname(__DIR__) . '/bundles/';
if (!is_dir($bundlesDir)) mkdir($bundlesDir, 0755, true);

// ── Nama file ZIP output ──────────────────────────────────────────────────
$date      = date('Ymd-His');
$zipName   = "bundle-{$slug}-{$date}.zip";
$zipPath   = $bundlesDir . $zipName;

// Hapus bundle lama untuk slug ini (hanya simpan 1 per lembaga)
foreach (glob($bundlesDir . "bundle-{$slug}-*.zip") as $old) {
    @unlink($old);
}

// ── Buat ZIP ──────────────────────────────────────────────────────────────
$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    echo json_encode(['success' => false, 'error' => 'Gagal membuat file ZIP.']);
    exit;
}

// Rekursif tambah semua file dari /dist ke ZIP
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($distDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

$totalFiles = 0;
foreach ($iterator as $file) {
    if (!$file->isFile()) continue;
    $filePath   = $file->getRealPath();
    $relativePath = substr($filePath, strlen(realpath($distDir)) + 1);
    $relativePath = str_replace('\\', '/', $relativePath);

    // Ganti data.json dari dist dengan data.json lembaga
    if ($relativePath === 'data.json') continue; // Akan ditambahkan manual

    $zip->addFile($filePath, $relativePath);
    $totalFiles++;
}

// Tambahkan data.json lembaga di root ZIP
$zip->addFile($dataJsonSrc, 'data.json');

// Tambahkan bundle-config.js dengan secret unik lembaga
$bundleConfigContent =
    "/* AUTO-GENERATED — DO NOT EDIT */\n" .
    "/* Bundle: {$slug} | {$lembaga['nama']} */\n" .
    "window.BUNDLE_SECRET = '{$integritySecret}';\n";
$zip->addFromString('bundle-config.js', $bundleConfigContent);

// Tambahkan admin-upload.php (endpoint update data.json di hosting)
$adminUploadSrc = dirname(__DIR__) . '/admin-upload.php';
if (file_exists($adminUploadSrc)) {
    $zip->addFile($adminUploadSrc, 'admin-upload.php');
    $totalFiles++;
}

// Tambahkan .htaccess untuk Apache (SPA routing)
$htaccessContent =
    "Options -MultiViews\n" .
    "RewriteEngine On\n\n" .
    "# Izinkan akses file/folder yang ada\n" .
    "RewriteCond %{REQUEST_FILENAME} !-f\n" .
    "RewriteCond %{REQUEST_FILENAME} !-d\n\n" .
    "# SPA Fallback — semua route ke index.html\n" .
    "RewriteRule ^(.*)$ /index.html [L,QSA]\n\n" .
    "# Cache aset statis\n" .
    "<FilesMatch \"\\.(js|css|webp|png|svg|woff2)$\">\n" .
    "  Header set Cache-Control \"public, max-age=31536000, immutable\"\n" .
    "</FilesMatch>\n\n" .
    "# Jangan cache data.json\n" .
    "<FilesMatch \"data\\.json$\">\n" .
    "  Header set Cache-Control \"no-cache, no-store, must-revalidate\"\n" .
    "</FilesMatch>\n";
$zip->addFromString('.htaccess', $htaccessContent);

// Tambahkan README
$readmeContent = "# Bundle Portal Pengumuman Kelulusan\n\n"
    . "Lembaga : {$lembaga['nama']}\n"
    . "Tanggal : " . date('d F Y') . "\n"
    . "File JSON: {$fileName}\n\n"
    . "## Isi Bundle\n\n"
    . "```\n"
    . "├── index.html          ← Halaman utama portal\n"
    . "├── _astro/             ← Aset JS/CSS\n"
    . "├── data.json           ← Data siswa lembaga ini\n"
    . "├── bundle-config.js    ← Konfigurasi keamanan (jangan edit)\n"
    . "├── admin-upload.php    ← Panel update data.json\n"
    . "├── .htaccess           ← Routing Apache (SPA)\n"
    . "└── README-DEPLOY.md    ← Panduan ini\n"
    . "```\n\n"
    . "## Cara Deploy ke Hosting (cPanel / Shared Hosting)\n\n"
    . "1. Extract semua isi ZIP ke `public_html/` di hosting\n"
    . "2. Pastikan `index.html` ada langsung di `public_html/` (bukan subfolder)\n"
    . "3. Akses domain Anda — portal sudah aktif!\n\n"
    . "## Update Data di Kemudian Hari\n\n"
    . "1. Minta admin untuk generate `data.json` terbaru\n"
    . "2. Buka: `https://namadomain.com/admin-upload.php`\n"
    . "3. Masukkan password yang diberikan admin\n"
    . "4. Upload file `data.json` — selesai!\n\n"
    . "## Pengaturan Penting (admin-upload.php)\n\n"
    . "Ganti password default di baris pertama `admin-upload.php`:\n"
    . "```php\n"
    . "define('UPLOAD_PASSWORD', 'GANTI_PASSWORD_ANDA_DISINI');\n"
    . "```\n\n"
    . "## Catatan Keamanan\n\n"
    . "Bundle ini dibuat khusus untuk {$lembaga['nama']}.\n"
    . "Mengubah identitas lembaga di data.json akan memblokir portal.\n";
$zip->addFromString('README-DEPLOY.md', $readmeContent);

$zip->close();

// ── Hitung ukuran ─────────────────────────────────────────────────────────
$sizeKb = round(filesize($zipPath) / 1024);

// Pesan info build mode untuk ditampilkan di UI
$buildModeInfo = $buildMode === 'frontend'
    ? null  // mode benar, tidak perlu pesan
    : 'Bundle menggunakan /dist/ (build lengkap). Jalankan "npm run build:frontend" untuk bundle yang lebih bersih (tanpa file dashboard).';

echo json_encode([
    'success'          => true,
    'zip_name'         => $zipName,
    'zip_url'          => '/bundles/' . $zipName,
    'size_kb'          => $sizeKb,
    'total_files'      => $totalFiles + 1, // +1 untuk data.json
    'lembaga'          => $lembaga['nama'],
    'data_json'        => basename($fileName),
    'build_mode'       => $buildMode,       // 'frontend' | 'legacy'
    'build_mode_info'  => $buildModeInfo,   // null jika benar, string jika perlu warning
    'dist_used'        => str_replace($rootDir, '', $distDir), // '/dist/frontend' atau '/dist'
]);

<?php
/**
 * delete-bundle.php
 * Hapus file bundle ZIP dari folder public/bundles/ di server.
 * Hanya admin & operator yang berwenang.
 */
session_start();
require_once 'db.php';

header('Content-Type: application/json');

// ── Auth check ────────────────────────────────────────────────────────────────
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

$body     = getJsonBody();
$action   = trim($body['action'] ?? '');
$fileName = trim($body['file_name'] ?? '');

$bundlesDir = dirname(__DIR__) . '/bundles/';

// ── LIST: Ambil semua bundle yang ada ────────────────────────────────────────
if ($action === 'list') {
    $files = [];
    if (is_dir($bundlesDir)) {
        $pattern = $bundlesDir . 'bundle-*.zip';
        foreach (glob($pattern) as $filePath) {
            $name    = basename($filePath);
            $size    = filesize($filePath);
            $mtime   = filemtime($filePath);

            // Parse nama: bundle-{slug}-{date}.zip
            // Ambil slug dari nama file
            $slug = '';
            if (preg_match('/^bundle-(.+)-\d{8}-\d{6}\.zip$/', $name, $m)) {
                $slug = $m[1];
            }

            $files[] = [
                'file_name'  => $name,
                'slug'       => $slug,
                'size_bytes' => $size,
                'size_kb'    => round($size / 1024),
                'size_mb'    => round($size / (1024 * 1024), 1),
                'created_at' => date('Y-m-d H:i:s', $mtime),
                'url'        => '/bundles/' . $name,
            ];
        }
        // Urutkan dari terbaru
        usort($files, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
    }

    echo json_encode(['success' => true, 'data' => $files, 'total' => count($files)]);
    exit;
}

// ── DELETE: Hapus 1 file ──────────────────────────────────────────────────────
if ($action === 'delete') {
    if (!$fileName) {
        echo json_encode(['success' => false, 'error' => 'file_name diperlukan.']);
        exit;
    }

    // Sanitasi ketat — hanya izinkan nama file bundle yang valid
    $baseName = basename($fileName);
    if (!preg_match('/^bundle-[\w\-]+-\d{8}-\d{6}\.zip$/', $baseName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Nama file tidak valid.']);
        exit;
    }

    $filePath = $bundlesDir . $baseName;

    if (!file_exists($filePath)) {
        echo json_encode(['success' => false, 'error' => 'File tidak ditemukan: ' . $baseName]);
        exit;
    }

    if (unlink($filePath)) {
        echo json_encode(['success' => true, 'message' => 'Bundle berhasil dihapus: ' . $baseName, 'file_name' => $baseName]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menghapus file. Periksa izin folder.']);
    }
    exit;
}

// ── DELETE ALL: Hapus semua bundle ────────────────────────────────────────────
if ($action === 'delete_all') {
    if (!is_dir($bundlesDir)) {
        echo json_encode(['success' => true, 'deleted' => 0, 'message' => 'Tidak ada bundle untuk dihapus.']);
        exit;
    }

    $deleted  = 0;
    $failed   = 0;
    foreach (glob($bundlesDir . 'bundle-*.zip') as $filePath) {
        if (unlink($filePath)) {
            $deleted++;
        } else {
            $failed++;
        }
    }

    echo json_encode([
        'success' => true,
        'deleted' => $deleted,
        'failed'  => $failed,
        'message' => "Berhasil menghapus {$deleted} bundle." . ($failed ? " Gagal: {$failed}." : ''),
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Action tidak dikenal. Gunakan: list, delete, delete_all']);

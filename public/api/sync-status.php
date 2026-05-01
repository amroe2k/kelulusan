<?php
/**
 * api/sync-status.php
 * Membandingkan data di database (sumber kebenaran) dengan data.json aktif.
 * Mencakup: data siswa + asset gambar (logo, stempel, ttd, kop_surat).
 */
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
require 'db.php';

if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'guru'])) {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

$lembagaId = getActiveLembagaId($pdo);
if (!$lembagaId) {
    http_response_code(400);
    exit(json_encode(['error' => 'Tidak ada lembaga yang aktif']));
}

// ── 1. Data Siswa dari Database ────────────────────────────────────────
$stmt = $pdo->prepare("SELECT id, nisn, status FROM siswa WHERE lembaga_id = ? ORDER BY nisn ASC");
$stmt->execute([$lembagaId]);
$dbSiswa = $stmt->fetchAll(PDO::FETCH_ASSOC);

$dbTotal      = count($dbSiswa);
$dbLulus      = 0;
$dbTidakLulus = 0;
$dbNisnMap    = [];
foreach ($dbSiswa as $s) {
    $key = hash('sha256', trim((string)$s['nisn']));
    $dbNisnMap[$key] = $s['status'];
    if ($s['status'] === 'LULUS') $dbLulus++; else $dbTidakLulus++;
}

// ── 2. Asset dari Database (pengaturan) ────────────────────────────────
$ASSET_KEYS = ['logo', 'stempel', 'ttd', 'kop_surat'];
$metaStmt = $pdo->prepare("SELECT logo, stempel, ttd, kop_surat FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
$metaStmt->execute([$lembagaId]);
$dbMeta = $metaStmt->fetch(PDO::FETCH_ASSOC) ?: [];

// Hitung hash/size setiap asset dari DB (tidak kirim raw base64 ke client)
$dbAssets = [];
foreach ($ASSET_KEYS as $key) {
    $val = $dbMeta[$key] ?? null;
    $dbAssets[$key] = [
        'exists'    => !empty($val),
        'size_kb'   => !empty($val) ? round(strlen($val) * 3 / 4 / 1024, 1) : 0,
        'hash'      => !empty($val) ? substr(hash('sha256', $val), 0, 16) : null,
        'label'     => ['logo'=>'Logo Sekolah','stempel'=>'Stempel','ttd'=>'Tanda Tangan','kop_surat'=>'Kop Surat'][$key],
    ];
}

// ── 3. Baca data.json aktif ────────────────────────────────────────────
$jsonPath   = realpath(__DIR__ . '/../../public') . '/data.json';
$jsonExists = file_exists($jsonPath);
$jsonTotal  = 0; $jsonLulus = 0; $jsonTidakLulus = 0;
$jsonGeneratedAt = null;
$jsonNisnMap = [];
$statusChanges = [];
$jsonAssets  = [];
$jsonMeta    = [];

foreach ($ASSET_KEYS as $key) {
    $jsonAssets[$key] = ['exists' => false, 'size_kb' => 0, 'hash' => null,
        'label' => ['logo'=>'Logo Sekolah','stempel'=>'Stempel','ttd'=>'Tanda Tangan','kop_surat'=>'Kop Surat'][$key]];
}

if ($jsonExists) {
    $raw  = file_get_contents($jsonPath);
    $json = json_decode($raw, true);
    if ($json) {
        $jsonMeta        = $json['_meta'] ?? [];
        $jsonGeneratedAt = $jsonMeta['generated_at'] ?? null;

        // Siswa
        foreach (($json['siswa'] ?? []) as $key => $s) {
            $jsonNisnMap[$key] = $s['status'];
            $jsonTotal++;
            if ($s['status'] === 'LULUS') $jsonLulus++; else $jsonTidakLulus++;
        }

        // Asset dari _meta JSON
        foreach ($ASSET_KEYS as $key) {
            $val = $jsonMeta[$key] ?? null;
            $jsonAssets[$key] = [
                'exists'  => !empty($val),
                'size_kb' => !empty($val) ? round(strlen($val) * 3 / 4 / 1024, 1) : 0,
                'hash'    => !empty($val) ? substr(hash('sha256', $val), 0, 16) : null,
                'label'   => $dbAssets[$key]['label'],
            ];
        }
    }

    // Deteksi perubahan status siswa
    foreach ($dbNisnMap as $key => $dbStatus) {
        $jsonStatus = $jsonNisnMap[$key] ?? null;
        if ($jsonStatus === null) {
            $statusChanges[] = ['type' => 'added',   'key' => substr($key, 0, 8)];
        } elseif ($jsonStatus !== $dbStatus) {
            $statusChanges[] = ['type' => 'changed', 'key' => substr($key, 0, 8), 'from' => $jsonStatus, 'to' => $dbStatus];
        }
    }
    foreach ($jsonNisnMap as $key => $jsonStatus) {
        if (!isset($dbNisnMap[$key])) {
            $statusChanges[] = ['type' => 'removed', 'key' => substr($key, 0, 8)];
        }
    }
}

// ── 4. Bandingkan Asset DB vs JSON ────────────────────────────────────
$assetComparison = [];
$assetOutOfSync  = false;

foreach ($ASSET_KEYS as $key) {
    $db   = $dbAssets[$key];
    $json = $jsonAssets[$key];

    // Tentukan status asset
    if (!$db['exists'] && !$json['exists']) {
        $assetStatus = 'none';       // tidak ada di keduanya (normal)
    } elseif ($db['exists'] && !$json['exists']) {
        $assetStatus = 'missing_json'; // ada di DB, belum di JSON
        $assetOutOfSync = true;
    } elseif (!$db['exists'] && $json['exists']) {
        $assetStatus = 'extra_json';   // dihapus dari DB, masih ada di JSON
        $assetOutOfSync = true;
    } elseif ($db['hash'] === $json['hash']) {
        $assetStatus = 'match';       // sama persis
    } else {
        $assetStatus = 'changed';     // ada di keduanya tapi beda (diubah)
        $assetOutOfSync = true;
    }

    $assetComparison[$key] = [
        'label'        => $db['label'],
        'status'       => $assetStatus,
        'db_exists'    => $db['exists'],
        'db_size_kb'   => $db['size_kb'],
        'json_exists'  => $json['exists'],
        'json_size_kb' => $json['size_kb'],
    ];
}

// ── 5. Status Sinkronisasi Global ────────────────────────────────────
$dataSynced  = $jsonExists && $dbTotal === $jsonTotal && $dbLulus === $jsonLulus && empty($statusChanges);
$assetSynced = !$assetOutOfSync;

$syncStatus = !$jsonExists ? 'no_json'
    : (!$dataSynced || !$assetSynced ? 'out_of_sync' : 'in_sync');

// ── 6. Hitung waktu sejak generate ───────────────────────────────────
$generatedAgo = null;
if ($jsonGeneratedAt) {
    $ts = strtotime($jsonGeneratedAt);
    if ($ts) {
        $diff = time() - $ts;
        if ($diff < 60)        $generatedAgo = $diff . ' detik lalu';
        elseif ($diff < 3600)  $generatedAgo = round($diff/60) . ' menit lalu';
        elseif ($diff < 86400) $generatedAgo = round($diff/3600) . ' jam lalu';
        else                   $generatedAgo = round($diff/86400) . ' hari lalu';
    }
}

echo json_encode([
    'success'          => true,
    'sync_status'      => $syncStatus,
    'data_synced'      => $dataSynced,
    'asset_synced'     => $assetSynced,
    'db' => [
        'total'        => $dbTotal,
        'lulus'        => $dbLulus,
        'tidak_lulus'  => $dbTidakLulus,
    ],
    'json' => [
        'exists'       => $jsonExists,
        'total'        => $jsonTotal,
        'lulus'        => $jsonLulus,
        'tidak_lulus'  => $jsonTidakLulus,
        'generated_at' => $jsonGeneratedAt,
        'generated_ago'=> $generatedAgo,
        'file_size_kb' => $jsonExists ? round(filesize($jsonPath) / 1024, 1) : 0,
    ],
    'changes'          => $statusChanges,
    'changes_count'    => count($statusChanges),
    'assets'           => $assetComparison,
    'asset_out_of_sync'=> $assetOutOfSync,
]);

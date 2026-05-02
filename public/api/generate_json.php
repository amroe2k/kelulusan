<?php
/**
 * generate_json.php  v3 — Pure PHP (No Node.js Required)
 * ─────────────────────────────────────────────────────────
 * Menggantikan scripts/export-data.js + scripts/export-users.js
 *
 * Tugas:
 *   1. Ambil lembaga AKTIF & pengaturannya
 *   2. Hash NISN (SHA-256) → kunci object siswa di JSON
 *   3. HMAC-SHA256 integrity check untuk data _meta
 *   4. Simpan ke public/data.json  (file aktif)
 *   5. Simpan arsip ke public/exports/data-{slug}-{ts}.json
 *   6. Catat ke tabel json_history (retensi max 5 arsip per lembaga)
 *   7. Tulis public/bundle-config.js (integrity secret per-lembaga)
 *   8. Generate users.json (admin + siswa auto-generated)
 */

session_start();
require_once 'db.php';   // sudah include env.php dan koneksi PDO

// ── Auth ─────────────────────────────────────────────────────────────────────
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// ── Verifikasi Password ───────────────────────────────────────────────────────
$body          = getJsonBody();
$inputPassword = $body['password'] ?? '';

$stmt = $pdo->prepare("SELECT password_hash FROM users WHERE username = ?");
$stmt->execute([$_SESSION['username']]);
$user = $stmt->fetch();

if (!$user || hash('sha256', $inputPassword) !== $user['password_hash']) {
    http_response_code(401);
    exit(json_encode(['error' => 'Akses ditolak: Password salah.']));
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/** SHA-256 string */
function sha256(string $str): string {
    return hash('sha256', $str);
}

/** UUID v4 */
function uuid4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/** Masking NISN: 012****678 */
function maskNISN(string $n): string {
    if (strlen($n) < 6) return $n;
    return substr($n, 0, 3) . '****' . substr($n, -3);
}

/** Format tanggal DB (Date/DateTime/string YYYY-MM-DD) → "d Bulan YYYY" */
function formatTanggal(mixed $d): string {
    static $bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];
    if (!$d) return '-';
    if ($d instanceof DateTime) {
        return $d->format('j') . ' ' . $bulan[(int)$d->format('n') - 1] . ' ' . $d->format('Y');
    }
    $s = (string) $d;
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $s, $m)) {
        return (int)$m[3] . ' ' . $bulan[(int)$m[2] - 1] . ' ' . $m[1];
    }
    return $s;
}

/** Konversi ke format YYYY-MM-DD (string aman untuk JSON) */
function toDateString(mixed $d): ?string {
    if (!$d) return null;
    if ($d instanceof DateTime) return $d->format('Y-m-d');
    $s = (string) $d;
    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $s, $m)) return $m[1];
    return $s;
}

/** Nama file arsip: data-smkn1-binjai-2026-04-30-19-30-45.json (presisi detik) */
function makeArchiveFileName(string $slug): string {
    return 'data-' . $slug . '-' . date('Y-m-d-H-i-s') . '.json';
}

/** HMAC-SHA256 integrity (sama persis dengan export-data.js) */
function computeIntegrity(array $meta, string $secret): string {
    $fields  = ['lembaga_id','lembaga_nama','lembaga_slug','sekolah','nss','npsn','kepala_sekolah'];
    $payload = implode('|', array_map(fn($k) => $meta[$k] ?? '', $fields));
    return hash_hmac('sha256', $payload, $secret);
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 1 — Ambil lembaga aktif
// ─────────────────────────────────────────────────────────────────────────────
$log = [];
$log[] = '━━━ GENERATE JSON (PHP) ━━━━━━━━━━━━━━━━━━━━';

$stmt = $pdo->query("SELECT * FROM lembaga WHERE aktif = 1 LIMIT 1");
$lembaga = $stmt->fetch();
if (!$lembaga) {
    http_response_code(500);
    exit(json_encode(['error' => 'Tidak ada lembaga aktif. Aktifkan dulu via dashboard.']));
}
$INTEGRITY_SECRET = $lembaga['integrity_secret'] ?: 'kls-portal-integrity-2026';
$log[] = "✓ Lembaga aktif: {$lembaga['nama']} [{$lembaga['slug']}]";

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 2 — Ambil pengaturan (meta sekolah)
// ─────────────────────────────────────────────────────────────────────────────
$stmt = $pdo->prepare("SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
$stmt->execute([$lembaga['id']]);
$m = $stmt->fetch();
if (!$m) {
    http_response_code(500);
    exit(json_encode(['error' => 'Data pengaturan untuk lembaga ini belum ada.']));
}

$generatedAt = (new DateTime())->format(DateTime::ATOM);
$meta = [
    // Identitas lembaga
    'lembaga_id'                 => $lembaga['id'],
    'lembaga_nama'               => $lembaga['nama'],
    'lembaga_slug'               => $lembaga['slug'],
    'generated_at'               => $generatedAt,
    // Data sekolah
    'sekolah'                    => $m['sekolah'],
    'nss'                        => $m['nss'],
    'npsn'                       => $m['npsn'],
    'alamat'                     => $m['alamat'],
    'kota'                       => $m['kota'] ?? '',
    'jenjang'                    => $m['jenjang'] ?? 'SMA',
    'kompetensi_keahlian'        => $m['kompetensi_keahlian'] ?? '',
    // Kepala Sekolah
    'kepala_sekolah'             => $m['kepala_sekolah'],
    'jabatan_kepsek'             => $m['jabatan_kepsek'] ?? '',
    'nip_kepsek'                 => $m['nip_kepsek'] ?? '',
    'nuptk_kepsek'               => $m['nuptk_kepsek'] ?? '',
    'id_kepsek_mode'             => $m['id_kepsek_mode'] ?? 'nip',
    // Tahun & Tanggal
    'tahun_ajaran'               => $m['tahun_ajaran'],
    'tanggal_pengumuman'         => $m['tanggal_pengumuman'] ? toDateString($m['tanggal_pengumuman']) : null,
    'tanggal_pengumuman_display' => $m['tanggal_pengumuman'] ? formatTanggal($m['tanggal_pengumuman']) : null,
    'tanggal_skl2'               => $m['tanggal_skl2'] ? toDateString($m['tanggal_skl2']) : null,
    'tanggal_skl2_display'       => $m['tanggal_skl2'] ? formatTanggal($m['tanggal_skl2']) : null,
    // Nomor Surat
    'nomor_surat_mode'           => $m['nomor_surat_mode'] ?? 'auto',
    'nomor_surat_suffix'         => $m['nomor_surat_suffix'] ?? '',
    'nomor_surat_statis'         => $m['nomor_surat_statis'] ?? '',
    // Kontak & Domain
    'telepon'                    => $m['telepon'] ?? '',
    'email'                      => $m['email'] ?? '',
    'domain'                     => $m['domain'] ?? '',
    // Aset Visual
    'logo'                       => $m['logo'] ?? null,
    'stempel'                    => $m['stempel'] ?? null,
    'ttd'                        => $m['ttd'] ?? null,
    'kop_surat'                  => $m['kop_surat'] ?? null,
];

// Tambahkan integrity hash
$meta['_integrity'] = computeIntegrity($meta, $INTEGRITY_SECRET);
$log[] = "✓ Meta: {$meta['sekolah']} ({$meta['tahun_ajaran']})";
$log[] = "✓ Integrity: " . substr($meta['_integrity'], 0, 16) . "...";

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 3 — Ambil data siswa + nilai
// ─────────────────────────────────────────────────────────────────────────────
$stmt = $pdo->prepare(
    "SELECT id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir,
            kelas, kompetensi_keahlian, status
     FROM siswa WHERE lembaga_id = ? ORDER BY nama ASC"
);
$stmt->execute([$lembaga['id']]);
$siswaRows = $stmt->fetchAll();
$log[] = "✓ Ditemukan " . count($siswaRows) . " siswa.";

$siswaObj  = [];
$lulus     = 0;
$tidakLulus = 0;

$stmtNilai = $pdo->prepare(
    "SELECT mapel, nilai FROM nilai WHERE siswa_id = ? ORDER BY urutan ASC, mapel ASC"
);

foreach ($siswaRows as $s) {
    $stmtNilai->execute([$s['id']]);
    $nilaiRows = $stmtNilai->fetchAll();
    $nilaiArr  = array_map(fn($n) => ['mapel' => $n['mapel'], 'nilai' => (float)$n['nilai']], $nilaiRows);

    $rataRata = count($nilaiArr)
        ? round(array_sum(array_column($nilaiArr, 'nilai')) / count($nilaiArr), 2)
        : 0;

    $nisn = (string) $s['nisn'];
    $key  = sha256(trim($nisn));

    $siswaObj[$key] = [
        'nisn'               => $nisn,
        'nisn_display'       => maskNISN($nisn),
        'nama'               => $s['nama'],
        'kelas'              => $s['kelas'],
        'kompetensi_keahlian'=> $s['kompetensi_keahlian'] ?? '',
        'jenis_kelamin'      => $s['jenis_kelamin'],
        'tempat_lahir'       => $s['tempat_lahir'],
        'tanggal_lahir'      => formatTanggal($s['tanggal_lahir']),
        'status'             => $s['status'],
        'nilai'              => $nilaiArr,
        'rata_rata'          => $rataRata,
    ];

    if ($s['status'] === 'LULUS') $lulus++; else $tidakLulus++;
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 4 — Tulis public/data.json (file aktif)
// ─────────────────────────────────────────────────────────────────────────────
$output   = ['_meta' => $meta, 'siswa' => $siswaObj];
$jsonStr  = json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$rootDir  = realpath(__DIR__ . '/../../');
$publicDir = $rootDir . '/public';

$dataJsonPath = $publicDir . '/data.json';
file_put_contents($dataJsonPath, $jsonStr);
$log[] = "✓ data.json ditulis → " . basename($dataJsonPath);

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 5 — Tulis bundle-config.js
// ─────────────────────────────────────────────────────────────────────────────
$bundleConfigPath    = $publicDir . '/bundle-config.js';
$bundleConfigContent = "/* AUTO-GENERATED — DO NOT EDIT */\n"
                     . "/* Bundle: {$lembaga['slug']} */\n"
                     . "window.BUNDLE_SECRET = '{$INTEGRITY_SECRET}';\n";
file_put_contents($bundleConfigPath, $bundleConfigContent);
$log[] = "✓ bundle-config.js ditulis untuk {$lembaga['slug']}";

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 6 — Simpan arsip ke public/exports/
// ─────────────────────────────────────────────────────────────────────────────
$exportsDir  = $publicDir . '/exports';
if (!is_dir($exportsDir)) mkdir($exportsDir, 0755, true);

$archiveName = makeArchiveFileName($lembaga['slug']);
$archivePath = $exportsDir . '/' . $archiveName;
file_put_contents($archivePath, $jsonStr);
$log[] = "✓ Arsip disimpan → exports/{$archiveName}";

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 7 — Catat ke json_history
// ─────────────────────────────────────────────────────────────────────────────
$stmt = $pdo->prepare(
    "INSERT INTO json_history (id, lembaga_id, lembaga_nama, lembaga_slug, file_name, jumlah_siswa, lulus, tidak_lulus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute([
    uuid4(),
    $lembaga['id'],
    $lembaga['nama'],
    $lembaga['slug'],
    $archiveName,
    count($siswaRows),
    $lulus,
    $tidakLulus,
]);
$log[] = "✓ Dicatat ke json_history";

// ─── Retention Policy: max N arsip per lembaga (dari .env: JSON_RETENTION_LIMIT) ─
$retentionLimit = max(1, (int) env('JSON_RETENTION_LIMIT', 5));

$stmt = $pdo->prepare(
    "SELECT id, file_name FROM json_history
     WHERE lembaga_id = ? AND file_name IS NOT NULL
     ORDER BY generated_at DESC"
);
$stmt->execute([$lembaga['id']]);
$allHistory = $stmt->fetchAll();

if (count($allHistory) > $retentionLimit) {
    $toDelete = array_slice($allHistory, $retentionLimit);
    $delStmt  = $pdo->prepare("DELETE FROM json_history WHERE id = ?");
    foreach ($toDelete as $row) {
        $oldFile = $exportsDir . '/' . $row['file_name'];
        if (file_exists($oldFile)) {
            unlink($oldFile);
            $log[] = "  ✓ Hapus arsip lama: {$row['file_name']}";
        }
        $delStmt->execute([$row['id']]);
    }
    $log[] = "  ✓ Cleanup: " . count($toDelete) . " arsip lama dihapus (retensi max {$retentionLimit}).";
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGKAH 8 — Generate users.json
// ─────────────────────────────────────────────────────────────────────────────
$usersResult = [];
$coveredNisn = [];

// 8a. User manual dari tabel users
$stmt = $pdo->query(
    "SELECT u.id, u.username, u.password_hash, u.nama, u.role, u.kelas, u.aktif,
            s.nisn AS nisn_hash_source
     FROM users u
     LEFT JOIN siswa s ON u.siswa_id = s.id
     WHERE u.aktif = 1
     ORDER BY u.role, u.nama"
);
$userRows = $stmt->fetchAll();

foreach ($userRows as $r) {
    $authHash = sha256($r['username'] . '|' . $r['password_hash']);
    $nisnHashSource = $r['nisn_hash_source'] ? (string) $r['nisn_hash_source'] : null;
    $usersResult[$r['username']] = [
        'auth_hash' => $authHash,
        'nama'      => $r['nama'],
        'role'      => $r['role'],
        'kelas'     => $r['kelas'],
        'nisn_hash' => $nisnHashSource ? sha256($nisnHashSource) : null,
    ];
    if ($r['role'] === 'siswa' && $nisnHashSource) {
        $coveredNisn[] = $nisnHashSource;
    }
}

// 8b. Auto-generate akun untuk siswa yang belum punya akun
$stmt = $pdo->query("SELECT id, nisn, nama FROM siswa ORDER BY nama ASC");
$allSiswaRows = $stmt->fetchAll();
$autoCount = 0;

foreach ($allSiswaRows as $s) {
    $nisn = trim((string) $s['nisn']);
    if (in_array($nisn, $coveredNisn)) continue; // sudah punya akun manual

    $passwordHash = sha256($nisn);
    $authHash     = sha256($nisn . '|' . $passwordHash);
    $usersResult[$nisn] = [
        'auth_hash' => $authHash,
        'nama'      => $s['nama'],
        'role'      => 'siswa',
        'kelas'     => null,
        'nisn_hash' => sha256($nisn),
    ];
    $autoCount++;
}

$usersJsonPath = $publicDir . '/users.json';
file_put_contents(
    $usersJsonPath,
    json_encode($usersResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);
$log[] = "✓ " . count($userRows) . " user manual + {$autoCount} siswa auto-generated";
$log[] = "✓ users.json ditulis → " . count($usersResult) . " total";

// ─────────────────────────────────────────────────────────────────────────────
// SELESAI
// ─────────────────────────────────────────────────────────────────────────────
$log[] = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
$log[] = "✓ Export selesai!";
$log[] = "  Lembaga  : {$lembaga['nama']}";
$log[] = "  Total    : " . count($siswaRows) . " siswa";
$log[] = "  Lulus    : {$lulus}";
$log[] = "  Tdk Lulus: {$tidakLulus}";
$log[] = "  Arsip    : exports/{$archiveName}";

echo json_encode([
    'success'       => true,
    'output'        => implode("\n", $log),
    'lembaga'       => $lembaga['nama'],
    'total_siswa'   => count($siswaRows),
    'lulus'         => $lulus,
    'tidak_lulus'   => $tidakLulus,
    'archive_name'  => $archiveName,
]);

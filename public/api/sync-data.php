<?php
/**
 * api/sync-data.php
 * Regenerasi data.json otomatis tanpa konfirmasi password.
 * Dipanggil setelah aktivasi lembaga (internal, hanya admin session).
 */
session_start();
require 'db.php';

if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'operator'])) {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// ── Ambil lembaga aktif (beserta integrity_secret) ───────────────────
$lembaga = $pdo->query("SELECT *, integrity_secret FROM lembaga WHERE aktif = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$lembaga) {
    http_response_code(400);
    exit(json_encode(['error' => 'Tidak ada lembaga aktif']));
}

$lembagaId = $lembaga['id'];

// ── Ambil pengaturan lembaga aktif ──────────────────────────────────────
$meta_row = $pdo->prepare("SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
$meta_row->execute([$lembagaId]);
$m = $meta_row->fetch(PDO::FETCH_ASSOC);
if (!$m) {
    http_response_code(400);
    exit(json_encode(['error' => 'Data pengaturan lembaga tidak ditemukan']));
}

// ── Helper: format tanggal ───────────────────────────────────────────────
function formatTglDisplay($val) {
    if (!$val) return null;
    $bulan = ['Januari','Februari','Maret','April','Mei','Juni',
              'Juli','Agustus','September','Oktober','November','Desember'];
    $ts = strtotime($val);
    if (!$ts) return $val;
    return date('j', $ts) . ' ' . $bulan[date('n', $ts)-1] . ' ' . date('Y', $ts);
}

function toDateString($val) {
    if (!$val) return null;
    $ts = strtotime($val);
    return $ts ? date('Y-m-d', $ts) : null;
}

function maskNISN($n) {
    $n = (string)$n;
    return strlen($n) < 6 ? $n : substr($n,0,3).'****'.substr($n,-3);
}

// ── Integrity Protection ────────────────────────────────────────────
// Gunakan secret per-lembaga dari DB, fallback ke konstanta jika kolom belum ada
$INTEGRITY_SECRET = !empty($lembaga['integrity_secret'])
    ? $lembaga['integrity_secret']
    : 'kls-portal-integrity-2026';

if (!defined('INTEGRITY_SECRET')) {
    define('INTEGRITY_SECRET', $INTEGRITY_SECRET);
}
function computeIntegrity(array $m): string {
    $payload = implode('|', [
        $m['lembaga_id']    ?? '',
        $m['lembaga_nama']  ?? '',
        $m['lembaga_slug']  ?? '',
        $m['sekolah']       ?? '',
        $m['nss']           ?? '',
        $m['npsn']          ?? '',
        $m['kepala_sekolah']?? '',
    ]);
    return hash_hmac('sha256', $payload, INTEGRITY_SECRET);
}

// ── Build _meta ─────────────────────────────────────────────────────────
$meta = [
    'lembaga_id'               => $lembaga['id'],
    'lembaga_nama'             => $lembaga['nama'],
    'lembaga_slug'             => $lembaga['slug'],
    'generated_at'             => date('c'),
    'sekolah'                  => $m['sekolah'],
    'nss'                      => $m['nss'],
    'npsn'                     => $m['npsn'],
    'alamat'                   => $m['alamat'],
    'kota'                     => $m['kota'] ?? '',
    'jenjang'                  => $m['jenjang'] ?? 'SMA',
    'kompetensi_keahlian'      => $m['kompetensi_keahlian'] ?? '',
    'kepala_sekolah'           => $m['kepala_sekolah'],
    'nip_kepsek'               => $m['nip_kepsek'],
    'tahun_ajaran'             => $m['tahun_ajaran'],
    'tanggal_pengumuman'       => $m['tanggal_pengumuman'] ?? null,
    'tanggal_pengumuman_display'=> $m['tanggal_pengumuman'] ? formatTglDisplay($m['tanggal_pengumuman']) : null,
    'tanggal_skl2'             => $m['tanggal_skl2'] ? toDateString($m['tanggal_skl2']) : null,
    'tanggal_skl2_display'     => $m['tanggal_skl2'] ? formatTglDisplay($m['tanggal_skl2']) : null,
    'nomor_surat_suffix'       => $m['nomor_surat_suffix'] ?? '',
    'telepon'                  => $m['telepon'] ?? '',
    'email'                    => $m['email'] ?? '',
    'domain'                   => $m['domain'] ?? '',
    'logo'                     => $m['logo'] ?? null,
    'stempel'                  => $m['stempel'] ?? null,
    'ttd'                      => $m['ttd'] ?? null,
    'kop_surat'                => $m['kop_surat'] ?? null,
];

// Inject integrity hash ke _meta
$meta['_integrity'] = computeIntegrity($meta);


// ── Ambil data siswa + nilai ────────────────────────────────────────────
$siswaStmt = $pdo->prepare(
    "SELECT id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status
     FROM siswa WHERE lembaga_id = ? ORDER BY nama ASC"
);
$siswaStmt->execute([$lembagaId]);
$siswaRows = $siswaStmt->fetchAll(PDO::FETCH_ASSOC);

$siswaObj = [];
$lulus = 0; $tidakLulus = 0;

foreach ($siswaRows as $s) {
    $nilaiStmt = $pdo->prepare(
        "SELECT mapel, nilai FROM nilai WHERE siswa_id = ? ORDER BY urutan ASC, mapel ASC"
    );
    $nilaiStmt->execute([$s['id']]);
    $nilaiRows = $nilaiStmt->fetchAll(PDO::FETCH_ASSOC);

    $nilaiArr = array_map(fn($n) => ['mapel' => $n['mapel'], 'nilai' => (float)$n['nilai']], $nilaiRows);
    $rataRata = count($nilaiArr)
        ? round(array_sum(array_column($nilaiArr,'nilai')) / count($nilaiArr), 2)
        : 0;

    // Format tanggal lahir
    $tglLahir = '';
    if ($s['tanggal_lahir']) {
        $bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
        $ts = strtotime($s['tanggal_lahir']);
        $tglLahir = $ts ? date('j', $ts).' '.$bulan[date('n',$ts)-1].' '.date('Y',$ts) : $s['tanggal_lahir'];
    }

    $key = hash('sha256', trim((string)$s['nisn']));
    $siswaObj[$key] = [
        'nisn'                => (string)$s['nisn'],
        'nisn_display'        => maskNISN($s['nisn']),
        'nama'                => $s['nama'],
        'kelas'               => $s['kelas'],
        'kompetensi_keahlian' => $s['kompetensi_keahlian'] ?? '',
        'jenis_kelamin'       => $s['jenis_kelamin'],
        'tempat_lahir'        => $s['tempat_lahir'],
        'tanggal_lahir'       => $tglLahir,
        'status'              => $s['status'],
        'nilai'               => $nilaiArr,
        'rata_rata'           => $rataRata,
    ];
    if ($s['status'] === 'LULUS') $lulus++; else $tidakLulus++;
}

// ── Tulis ke public/data.json ───────────────────────────────────────────
$output   = ['_meta' => $meta, 'siswa' => $siswaObj];
$jsonStr  = json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$outPath  = realpath(__DIR__ . '/../../public') . '/data.json';

if (file_put_contents($outPath, $jsonStr) === false) {
    http_response_code(500);
    exit(json_encode(['error' => 'Gagal menulis data.json']));
}

// ── Tulis bundle-config.js (harus sinkron dengan secret lembaga aktif) ──
$bundleConfigPath = realpath(__DIR__ . '/../../public') . '/bundle-config.js';
$bundleConfigContent =
    "/* AUTO-GENERATED — DO NOT EDIT */\n" .
    "/* Bundle: {$lembaga['slug']} | {$lembaga['nama']} */\n" .
    "window.BUNDLE_SECRET = '{$INTEGRITY_SECRET}';\n";
file_put_contents($bundleConfigPath, $bundleConfigContent);

// ── Catat ke json_history (tanpa arsip file — auto-sync tidak perlu file) ──
try {
    $uuid = sprintf('%s-%s-%s-%s-%s',
        bin2hex(random_bytes(4)), bin2hex(random_bytes(2)),
        bin2hex(random_bytes(2)), bin2hex(random_bytes(2)),
        bin2hex(random_bytes(6))
    );
    $pdo->prepare(
        "INSERT INTO json_history (id, lembaga_id, lembaga_nama, lembaga_slug, file_name, jumlah_siswa, lulus, tidak_lulus)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)"
    )->execute([$uuid, $lembagaId, $lembaga['nama'], $lembaga['slug'],
                count($siswaRows), $lulus, $tidakLulus]);

    // ── Cleanup: hapus entri auto-sync (file_name IS NULL) lama
    //    Simpan hanya 3 entri auto-sync terbaru per lembaga ──────────────
    $autoOld = $pdo->prepare(
        "SELECT id FROM json_history
         WHERE lembaga_id = ? AND file_name IS NULL
         ORDER BY generated_at DESC"
    );
    $autoOld->execute([$lembagaId]);
    $autoRows = $autoOld->fetchAll(PDO::FETCH_COLUMN);
    if (count($autoRows) > 3) {
        $toDelete = array_slice($autoRows, 3);
        $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
        $pdo->prepare("DELETE FROM json_history WHERE id IN ($placeholders)")
            ->execute($toDelete);
    }
} catch (Exception $e) { /* non-fatal */ }

echo json_encode([
    'success'      => true,
    'lembaga'      => $lembaga['nama'],
    'jumlah_siswa' => count($siswaRows),
    'lulus'        => $lulus,
    'tidak_lulus'  => $tidakLulus,
    'file'         => 'public/data.json',
]);


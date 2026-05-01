<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ─── Load .env ─────────────────────────────────────────────────────────────────
// Cari .env mulai dari direktori api/ ke atas (root project)
require_once __DIR__ . '/env.php';

$envPaths = [
    __DIR__ . '/../../.env',      // root project (development)
    __DIR__ . '/../../../.env',   // satu level lebih atas (VPS dengan public_html)
    __DIR__ . '/.env',            // fallback: di folder api/
];

foreach ($envPaths as $envPath) {
    if (file_exists($envPath)) {
        loadEnv($envPath);
        break;
    }
}

// Helper: read JSON body (strips UTF-8 BOM if present)
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $raw = ltrim($raw, "\xef\xbb\xbf"); // strip BOM
    return json_decode($raw, true) ?? [];
}

function getActiveLembagaId(PDO $pdo): ?string {
    $stmt = $pdo->query("SELECT id FROM lembaga WHERE aktif = 1 LIMIT 1");
    return $stmt->fetchColumn() ?: null;
}

// ─── Koneksi Database ──────────────────────────────────────────────────────────
try {
    $dbHost    = env('DB_HOST', 'localhost');
    $dbPort    = env('DB_PORT', '3306');
    $dbName    = env('DB_NAME', 'db_kelulusan');
    $dbUser    = env('DB_USER', 'root');
    $dbPass    = env('DB_PASS', '');
    $dbCharset = env('DB_CHARSET', 'utf8mb4');

    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset={$dbCharset}";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

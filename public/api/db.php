<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

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

try {
    $pdo = new PDO("mysql:host=localhost;dbname=db_kelulusan", "root", "@demo1234");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

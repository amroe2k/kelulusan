<?php
/**
 * api/set-upload-password.php
 * Ganti UPLOAD_PASSWORD di admin-upload.php dari dashboard lokal.
 */
session_start();
require 'db.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$data = getJsonBody();
$newPassword     = trim($data['new_password']     ?? '');
$confirmPassword = trim($data['confirm_password'] ?? '');
$adminPassword   = trim($data['admin_password']   ?? '');

// Validasi input
if (!$newPassword || !$confirmPassword || !$adminPassword) {
    http_response_code(400);
    exit(json_encode(['error' => 'Semua field wajib diisi.']));
}
if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    exit(json_encode(['error' => 'Konfirmasi password tidak cocok.']));
}
if (strlen($newPassword) < 8) {
    http_response_code(400);
    exit(json_encode(['error' => 'Password minimal 8 karakter.']));
}

// Verifikasi password admin dashboard
$stmt = $pdo->prepare("SELECT password_hash FROM users WHERE username = ? AND role = 'admin' LIMIT 1");
$stmt->execute([$_SESSION['username']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user || hash('sha256', $adminPassword) !== $user['password_hash']) {
    http_response_code(401);
    exit(json_encode(['error' => 'Password dashboard admin salah.']));
}

// Path ke admin-upload.php
$phpFile  = realpath(__DIR__ . '/../admin-upload.php');
$distFile = realpath(__DIR__ . '/../../dist/admin-upload.php');

if (!$phpFile || !file_exists($phpFile)) {
    http_response_code(500);
    exit(json_encode(['error' => 'File admin-upload.php tidak ditemukan.']));
}

$content = file_get_contents($phpFile);

// Replace UPLOAD_PASSWORD value (tangani single atau double quote)
$escaped  = addslashes($newPassword);
$newLine  = "define('UPLOAD_PASSWORD', '" . $escaped . "');";
$replaced = preg_replace(
    "/define\s*\(\s*['\"]UPLOAD_PASSWORD['\"]\s*,\s*['\"][^'\"]*['\"]\s*\)\s*;/",
    $newLine,
    $content,
    -1,
    $count
);

if ($count === 0 || $replaced === null) {
    http_response_code(500);
    exit(json_encode(['error' => 'Gagal menemukan konstanta UPLOAD_PASSWORD di file.']));
}

// Simpan ke public/
file_put_contents($phpFile, $replaced);

// Sync ke dist/ jika ada
$syncedDist = false;
if ($distFile && file_exists($distFile)) {
    file_put_contents($distFile, $replaced);
    $syncedDist = true;
}

echo json_encode([
    'success'     => true,
    'message'     => 'Password admin-upload.php berhasil diperbarui.' . ($syncedDist ? ' (sync ke dist/ selesai)' : ''),
    'synced_dist' => $syncedDist,
]);

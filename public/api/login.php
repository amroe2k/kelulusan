<?php
session_start();
require 'db.php';

$data = getJsonBody();

if (isset($data['username']) && isset($data['password'])) {
    $stmt = $pdo->prepare("SELECT role, password_hash FROM users WHERE username = ? AND aktif = 1");
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && hash('sha256', $data['password']) === $user['password_hash']) {
        $_SESSION['role'] = $user['role'];
        $_SESSION['username'] = $data['username'];
        // Ambil data lengkap user
        $stmt2 = $pdo->prepare("SELECT id, nama, kelas FROM users WHERE username = ?");
        $stmt2->execute([$data['username']]);
        $info = $stmt2->fetch(PDO::FETCH_ASSOC);
        echo json_encode([
            'success'  => true,
            'role'     => $user['role'],
            'username' => $data['username'],
            'nama'     => $info['nama'] ?? $data['username'],
            'kelas'    => $info['kelas'] ?? null,
            'id'       => $info['id'] ?? null,
        ]);
        exit;
    }
}

http_response_code(401);
echo json_encode(['error' => 'Invalid credentials']);

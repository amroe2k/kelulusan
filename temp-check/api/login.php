<?php
session_start();
require 'db.php';

$data = getJsonBody();

if (isset($data['username']) && isset($data['password'])) {
    $username = $data['username'];
    $password = $data['password'];

    $stmt = $pdo->prepare("SELECT id, role, password_hash, nama, kelas FROM users WHERE username = ? AND role = 'admin' AND aktif = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && hash('sha256', $password) === $user['password_hash']) {
        $_SESSION['role'] = $user['role'];
        $_SESSION['username'] = $username;
        $_SESSION['user_id'] = $user['id'];
        
        echo json_encode([
            'success'  => true,
            'role'     => $user['role'],
            'username' => $username,
            'nama'     => $user['nama'] ?? $username,
            'id'       => $user['id'],
        ]);
        exit;
    }
}

http_response_code(401);
echo json_encode(['error' => 'Username atau password salah']);

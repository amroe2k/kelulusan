<?php
session_start();
require 'db.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonBody();
    $inputPassword = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE username = ?");
    $stmt->execute([$_SESSION['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || hash('sha256', $inputPassword) !== $user['password_hash']) {
        http_response_code(401);
        echo json_encode(['error' => 'Akses ditolak: Password salah.']);
        exit;
    }

    // Jalankan script export-data.js & export-users.js menggunakan node
    $project_root = realpath(__DIR__ . '/../../');
    $script_path_data  = realpath(__DIR__ . '/../../scripts/export-data.js');
    $script_path_users = realpath(__DIR__ . '/../../scripts/export-users.js');
    
    $output = "";
    if ($script_path_data && $project_root) {
        // Jalankan dari root project agar process.cwd() benar
        $cmd1 = "cd " . escapeshellarg($project_root) . " && node " . escapeshellarg($script_path_data) . " 2>&1";
        $output .= shell_exec($cmd1) . "\n";
    }
    if ($script_path_users && $project_root) {
        $cmd2 = "cd " . escapeshellarg($project_root) . " && node " . escapeshellarg($script_path_users) . " 2>&1";
        $output .= shell_exec($cmd2) . "\n";
    }
    
    echo json_encode(['success' => true, 'output' => $output]);
    exit;
}

<?php
session_start();
require 'db.php';

if (!isset($_SESSION['role']) || ($_SESSION['role'] !== 'admin' && $_SESSION['role'] !== 'guru')) {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: ambil nilai berdasarkan siswa_id
if ($method === 'GET') {
    $siswa_id = $_GET['siswa_id'] ?? '';
    if (!$siswa_id) { echo json_encode(['success'=>true,'data'=>[]]); exit; }

    $rows = $pdo->prepare("SELECT id, mapel, nilai, urutan FROM nilai WHERE siswa_id = ? ORDER BY urutan ASC, mapel ASC");
    $rows->execute([$siswa_id]);
    echo json_encode(['success' => true, 'data' => $rows->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === 'POST') {
    $data   = getJsonBody();
    $action = $data['action'] ?? '';

    // Ganti semua nilai untuk satu siswa (upsert bulk)
    if ($action === 'save') {
        $siswa_id = $data['siswa_id'] ?? '';
        $nilai_list = $data['nilai'] ?? []; // [{mapel, nilai, urutan}]

        if (!$siswa_id) { echo json_encode(['error' => 'siswa_id wajib.']); exit; }

        $pdo->beginTransaction();
        // Hapus semua nilai lama
        $pdo->prepare("DELETE FROM nilai WHERE siswa_id = ?")->execute([$siswa_id]);

        $stmt = $pdo->prepare("INSERT INTO nilai (id, siswa_id, mapel, nilai, urutan) VALUES (UUID(), ?, ?, ?, ?)");
        foreach ($nilai_list as $i => $n) {
            $mapel = trim($n['mapel'] ?? '');
            $val   = floatval($n['nilai'] ?? 0);
            if (!$mapel) continue;
            $stmt->execute([$siswa_id, $mapel, $val, $i + 1]);
        }
        $pdo->commit();
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}

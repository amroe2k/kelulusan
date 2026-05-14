<?php
/**
 * Script endpoint untuk menerima upload data.json & users.json dari dashboard.
 * Serta melakukan sinkronisasi kembali ke database MySQL.
 */
header('Content-Type: application/json');

$SECRET_PASSWORD = "SuperSecretAdmin123!"; 

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Hanya menerima request POST']);
    exit;
}

if (($_POST['password'] ?? '') !== $SECRET_PASSWORD) {
    http_response_code(401);
    echo json_encode(['error' => 'Akses ditolak: Password Sinkronisasi salah.']);
    exit;
}

$uploaded = [];
$db_updated = false;

// Connect DB
try {
    $pdo = new PDO("mysql:host=localhost;dbname=db_kelulusan", "root", "@demo1234");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    $pdo = null;
}

// Handle data.json
if (isset($_FILES['data_file']) && $_FILES['data_file']['error'] === UPLOAD_ERR_OK) {
    $dest = __DIR__ . '/data.json';
    if (move_uploaded_file($_FILES['data_file']['tmp_name'], $dest)) {
        $uploaded[] = 'data.json';
        
        // Update Database!
        if ($pdo) {
            $json = json_decode(file_get_contents($dest), true);
            if ($json) {
                // 1. Update Pengaturan (Meta)
                if (isset($json['_meta'])) {
                    $m = $json['_meta'];
                    $stmt = $pdo->prepare("UPDATE pengaturan SET 
                        sekolah = ?, npsn = ?, nss = ?, tahun_ajaran = ?, alamat = ?, 
                        kepala_sekolah = ?, nip_kepsek = ?, tanggal_pengumuman = ?
                    ");
                    $stmt->execute([
                        $m['sekolah'] ?? '',
                        $m['npsn'] ?? '',
                        $m['nss'] ?? '',
                        $m['tahun_ajaran'] ?? '',
                        $m['alamat'] ?? '',
                        $m['kepala_sekolah'] ?? '',
                        $m['nip_kepsek'] ?? '',
                        $m['tanggal_pengumuman'] ?? ''
                    ]);
                }
                
                // 2. Update Status Siswa
                if (isset($json['siswa'])) {
                    $siswa_db = $pdo->query("SELECT id, nisn FROM siswa")->fetchAll(PDO::FETCH_ASSOC);
                    $updateStmt = $pdo->prepare("UPDATE siswa SET status = ? WHERE id = ?");
                    foreach ($siswa_db as $s) {
                        $hash = hash('sha256', trim($s['nisn']));
                        if (isset($json['siswa'][$hash])) {
                            $status = $json['siswa'][$hash]['status'];
                            $updateStmt->execute([$status, $s['id']]);
                        }
                    }
                }
                $db_updated = true;
            }
        }
    }
}

// Handle users.json
if (isset($_FILES['users_file']) && $_FILES['users_file']['error'] === UPLOAD_ERR_OK) {
    $dest = __DIR__ . '/users.json';
    if (move_uploaded_file($_FILES['users_file']['tmp_name'], $dest)) {
        $uploaded[] = 'users.json';
    }
}

if (count($uploaded) > 0) {
    $msg = 'File JSON terupdate';
    if ($db_updated) $msg .= ' & Database tersinkronisasi!';
    echo json_encode(['success' => true, 'message' => $msg]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Tidak ada file valid yang diunggah.']);
}


<?php
header('Content-Type: application/json');
require 'db.php';

$token = $_GET['token'] ?? null;
if (!$token) {
    echo json_encode(['error' => 'Token tidak ditemukan.']);
    exit;
}

// Cari lembaga berdasarkan token
$stmt = $pdo->prepare("SELECT id, nama, slug, form_token_expires FROM lembaga WHERE form_token = ? LIMIT 1");
$stmt->execute([$token]);
$lembaga = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lembaga) {
    echo json_encode(['error' => 'Token tidak valid.']);
    exit;
}

if ($lembaga['form_token_expires'] && strtotime($lembaga['form_token_expires']) < time()) {
    echo json_encode(['error' => 'Token sudah kadaluarsa. Silakan minta admin untuk generate ulang.']);
    exit;
}

$lembagaId = $lembaga['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
    $stmt->execute([$lembagaId]);
    $pengaturan = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    
    echo json_encode([
        'success' => true,
        'lembaga' => [
            'id' => $lembaga['id'],
            'nama' => $lembaga['nama'],
            'slug' => $lembaga['slug']
        ],
        'data' => $pengaturan
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        $data = $_POST;
    }
    
    // Jangan izinkan update gambar (logo, stempel, ttd, kop_surat) via API publik ini.
    // Jika ada dikirim, diabaikan.
    
    $fields = ['sekolah','npsn','nss','jenjang','kompetensi_keahlian','kurikulum','tahun_ajaran','alamat','kota','provinsi','kepala_sekolah','jabatan_kepsek','nip_kepsek','nuptk_kepsek','id_kepsek_mode','tanggal_pengumuman','nomor_surat_suffix','nomor_surat_mode','nomor_surat_statis','tanggal_skl2','telepon','email','domain','pengumuman'];
    
    $sets = []; $vals = [];
    foreach($fields as $f){
        if(array_key_exists($f, $data)){
            $val = $data[$f];
            // Convert empty strings to null for date fields to avoid MySQL strict mode errors
            if (($f === 'tanggal_pengumuman' || $f === 'tanggal_skl2') && trim((string)$val) === '') {
                $val = null;
            }
            $sets[]="$f=?"; 
            $vals[]=$val; 
        }
    }
    
    if(empty($sets)){ 
        echo json_encode(['success'=>true, 'message' => 'Tidak ada perubahan.']); 
        exit; 
    }
    
    $vals[] = $lembagaId;
    $stmt = $pdo->prepare('UPDATE pengaturan SET '.implode(',',$sets).' WHERE lembaga_id = ?');
    
    try {
        // Update data pengaturan
        $stmt->execute($vals);

        // Regenerate token lembaga agar token lama hangus
        $newToken = bin2hex(random_bytes(32));
        $stmtToken = $pdo->prepare("UPDATE lembaga SET form_token = ? WHERE id = ?");
        $stmtToken->execute([$newToken, $lembagaId]);

        echo json_encode(['success' => true, 'message' => 'Profil berhasil disimpan.', 'new_token' => $newToken]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal menyimpan: ' . $e->getMessage()]);
    }
    exit;
}

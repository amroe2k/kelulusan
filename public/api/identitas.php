<?php
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
require 'db.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}


$lembagaId = getActiveLembagaId($pdo);
if (!$lembagaId) {
    echo json_encode(['error' => 'Tidak ada lembaga yang aktif']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
    $stmt->execute([$lembagaId]);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        $data = $_POST;
    }
    
    // Build dynamic SET clause untuk hanya update kolom yang dikirim
    $fields = ['sekolah','npsn','nss','jenjang','kompetensi_keahlian','tahun_ajaran','alamat','kota','kepala_sekolah','nip_kepsek','tanggal_pengumuman','nomor_surat_suffix','tanggal_skl2','telepon','email','domain'];
    $sets = []; $vals = [];
    foreach($fields as $f){
        if(isset($data[$f])){ $sets[]="$f=?"; $vals[]=$data[$f]; }
    }
    // Gambar: key_exists check agar null = hapus, key absen = jangan ubah
    foreach(['logo','stempel','ttd','kop_surat'] as $img){
        if(array_key_exists($img,$data)){
            $sets[]=($data[$img]===null) ? "$img=NULL" : "$img=?";
            if($data[$img]!==null) $vals[]=$data[$img];
        }
    }
    if(empty($sets)){ echo json_encode(['success'=>true]); exit; }
    $vals[] = $lembagaId;
    $stmt=$pdo->prepare('UPDATE pengaturan SET '.implode(',',$sets).' WHERE lembaga_id = ?');
    $stmt->execute($vals);
    echo json_encode(['success' => true]);
    exit;
}

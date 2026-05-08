<?php
require 'db.php';
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method Not Allowed']));
}

try {
    $lembagaId = getActiveLembagaId($pdo);
    if (!$lembagaId) {
        throw new Exception('Tidak ada lembaga yang aktif');
    }

    // 1. Meta Sekolah
    $stmt = $pdo->prepare("SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1");
    $stmt->execute([$lembagaId]);
    $meta = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$meta) {
        $meta = [
            'sekolah' => '', 'nss' => '', 'npsn' => '', 'alamat' => '',
            'kepala_sekolah' => '', 'nip_kepsek' => '', 'tahun_ajaran' => '',
            'tanggal_pengumuman' => ''
        ];
    }
    
    // 2. Data Siswa & Nilai
    $siswaStmt = $pdo->prepare("
        SELECT s.id, s.nisn, s.nama, s.jenis_kelamin, s.tempat_lahir, s.tanggal_lahir, s.kelas, s.kompetensi_keahlian, s.status,
               (SELECT GROUP_CONCAT(CONCAT(mapel, ':', nilai) SEPARATOR '|') FROM nilai WHERE siswa_id = s.id ORDER BY urutan ASC, mapel ASC) as nilai_mapel
        FROM siswa s WHERE s.lembaga_id = ? ORDER BY s.nama ASC
    ");
    $siswaStmt->execute([$lembagaId]);
    $siswaRows = $siswaStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $siswaObj = [];
    
    foreach ($siswaRows as $s) {
        // Parse nilai
        $nilaiArr = [];
        $totalNilai = 0;
        $rataRata = 0;
        if (!empty($s['nilai_mapel'])) {
            $parts = explode('|', $s['nilai_mapel']);
            foreach ($parts as $p) {
                list($mapel, $nilai) = explode(':', $p);
                $val = floatval($nilai);
                $nilaiArr[] = ['mapel' => $mapel, 'nilai' => $val];
                $totalNilai += $val;
            }
            if (count($nilaiArr) > 0) {
                $rataRata = round($totalNilai / count($nilaiArr), 2);
            }
        }
        
        $key = hash('sha256', trim($s['nisn']));
        $maskNISN = strlen($s['nisn']) >= 6 ? substr($s['nisn'], 0, 3) . '****' . substr($s['nisn'], -3) : $s['nisn'];
        
        // Format tanggal
        $tanggal_lahir_formatted = '-';
        if (!empty($s['tanggal_lahir'])) {
            $d = new DateTime($s['tanggal_lahir']);
            $bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            $tanggal_lahir_formatted = $d->format('j') . ' ' . $bulan[$d->format('n') - 1] . ' ' . $d->format('Y');
        }
        
        $siswaObj[$key] = [
            'nisn_display' => $maskNISN,
            'nisn'         => $s['nisn'],
            'nama'         => $s['nama'],
            'kelas'        => $s['kelas'],
            'jenis_kelamin' => $s['jenis_kelamin'],
            'tempat_lahir' => $s['tempat_lahir'],
            'tanggal_lahir' => $tanggal_lahir_formatted,
            'tanggal_lahir_raw' => $s['tanggal_lahir'],
            'status'       => $s['status'],
            'kompetensi_keahlian' => $s['kompetensi_keahlian'] ?? '',
            'nilai'        => $nilaiArr,
            'rata_rata'    => $rataRata
        ];
    }
    
    echo json_encode([
        '_meta' => $meta,
        'siswa' => $siswaObj
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

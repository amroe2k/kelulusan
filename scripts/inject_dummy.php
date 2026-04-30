<?php
require __DIR__ . '/../public/api/db.php';

$siswa = [
    ['nisn' => '0061234561', 'nama' => 'Aditya Pratama Putra', 'jk' => 'L', 'tempat' => 'Surabaya', 'tgl' => '2006-03-15', 'kelas' => 'XII IPA 1', 'status' => 'LULUS'],
    ['nisn' => '0061234562', 'nama' => 'Bunga Citra Lestari', 'jk' => 'P', 'tempat' => 'Jakarta', 'tgl' => '2006-05-22', 'kelas' => 'XII IPA 1', 'status' => 'LULUS'],
    ['nisn' => '0061234563', 'nama' => 'Chandra Wijaya', 'jk' => 'L', 'tempat' => 'Bandung', 'tgl' => '2006-08-10', 'kelas' => 'XII IPS 2', 'status' => 'LULUS'],
    ['nisn' => '0061234564', 'nama' => 'Dewi Anggraini', 'jk' => 'P', 'tempat' => 'Yogyakarta', 'tgl' => '2006-11-05', 'kelas' => 'XII IPS 1', 'status' => 'LULUS'],
    ['nisn' => '0061234565', 'nama' => 'Eko Prasetyo', 'jk' => 'L', 'tempat' => 'Semarang', 'tgl' => '2005-12-12', 'kelas' => 'XII IPA 2', 'status' => 'LULUS'],
    ['nisn' => '0061234566', 'nama' => 'Fadhil Muhammad', 'jk' => 'L', 'tempat' => 'Medan', 'tgl' => '2006-02-28', 'kelas' => 'XII IPA 3', 'status' => 'LULUS'],
    ['nisn' => '0061234567', 'nama' => 'Gita Gutawa', 'jk' => 'P', 'tempat' => 'Bali', 'tgl' => '2006-07-19', 'kelas' => 'XII Bahasa', 'status' => 'LULUS'],
    ['nisn' => '0061234568', 'nama' => 'Hendra Setiawan', 'jk' => 'L', 'tempat' => 'Makassar', 'tgl' => '2006-09-09', 'kelas' => 'XII IPS 2', 'status' => 'TIDAK LULUS'],
    ['nisn' => '0061234569', 'nama' => 'Intan Nuraini', 'jk' => 'P', 'tempat' => 'Palembang', 'tgl' => '2006-04-14', 'kelas' => 'XII IPA 1', 'status' => 'LULUS'],
    ['nisn' => '0061234570', 'nama' => 'Joko Anwar', 'jk' => 'L', 'tempat' => 'Solo', 'tgl' => '2006-01-03', 'kelas' => 'XII IPS 3', 'status' => 'LULUS'],
];

$mapel = [
    'Pendidikan Agama Islam', 'Pendidikan Pancasila', 'Bahasa Indonesia',
    'Matematika', 'Sejarah Indonesia', 'Bahasa Inggris', 'Seni Budaya', 'PJOK'
];

try {
    $pdo->beginTransaction();
    $insertSiswa = $pdo->prepare("INSERT INTO siswa (id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, status) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)");
    $insertNilai = $pdo->prepare("INSERT INTO nilai (id, siswa_id, mapel, nilai, urutan) VALUES (UUID(), ?, ?, ?, ?)");

    foreach ($siswa as $s) {
        $insertSiswa->execute([$s['nisn'], $s['nama'], $s['jk'], $s['tempat'], $s['tgl'], $s['kelas'], $s['status']]);
        $id = $pdo->query("SELECT id FROM siswa WHERE nisn = '{$s['nisn']}'")->fetchColumn();
        
        $urutan = 1;
        foreach ($mapel as $m) {
            $nilai = rand(75, 98);
            if ($s['status'] === 'TIDAK LULUS') $nilai = rand(40, 70);
            $insertNilai->execute([$id, $m, $nilai, $urutan++]);
        }
    }
    $pdo->commit();
    echo "10 Data dummy inserted successfully!\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}

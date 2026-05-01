<?php
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
require 'db.php';

if (!isset($_SESSION['role']) || ($_SESSION['role'] !== 'admin' && $_SESSION['role'] !== 'guru')) {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized']));
}

$method = $_SERVER['REQUEST_METHOD'];

$lembagaId = getActiveLembagaId($pdo);
if (!$lembagaId) {
    http_response_code(400);
    exit(json_encode(['error' => 'Tidak ada lembaga yang aktif']));
}

// ─── GET: List siswa (for dashboard table) ─────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT s.id, s.nisn, s.nama, s.jenis_kelamin, s.tempat_lahir, s.tanggal_lahir, s.kelas, s.kompetensi_keahlian, s.status,
               (SELECT GROUP_CONCAT(CONCAT(mapel, ':', nilai) SEPARATOR '|') FROM nilai WHERE siswa_id = s.id ORDER BY urutan ASC, mapel ASC) as nilai_mapel
        FROM siswa s WHERE s.lembaga_id = ? ORDER BY s.nama ASC
    ");
    $stmt->execute([$lembagaId]);
    $siswaRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($siswaRows as $s) {
        $nilaiArr = [];
        $totalNilai = 0;
        if (!empty($s['nilai_mapel'])) {
            foreach (explode('|', $s['nilai_mapel']) as $p) {
                if (!str_contains($p, ':')) continue;
                list($mapel, $nilai) = explode(':', $p, 2);
                $val = floatval($nilai);
                $nilaiArr[] = ['mapel' => $mapel, 'nilai' => $val];
                $totalNilai += $val;
            }
        }
        $rataRata = count($nilaiArr) ? round($totalNilai / count($nilaiArr), 2) : 0;
        $key = hash('sha256', trim($s['nisn']));
        $maskNISN = strlen($s['nisn']) >= 6 ? substr($s['nisn'], 0, 3) . '****' . substr($s['nisn'], -3) : $s['nisn'];
        $tanggal_lahir_formatted = '-';
        if (!empty($s['tanggal_lahir'])) {
            $d = new DateTime($s['tanggal_lahir']);
            $bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            $tanggal_lahir_formatted = $d->format('j') . ' ' . $bulan[$d->format('n') - 1] . ' ' . $d->format('Y');
        }
        $result[] = [
            'id'            => $s['id'],  // direct UUID for CRUD
            '_key'          => $key,
            'nisn'          => $s['nisn'], // raw NISN for admin editing
            'nisn_display'  => $maskNISN,
            'nama'          => $s['nama'],
            'kelas'         => $s['kelas'],
            'jenis_kelamin' => $s['jenis_kelamin'],
            'tempat_lahir'  => $s['tempat_lahir'],
            'tanggal_lahir' => $s['tanggal_lahir'], // raw date for forms
            'tanggal_lahir_display' => $tanggal_lahir_formatted,
            'status'               => $s['status'],
            'kompetensi_keahlian'  => $s['kompetensi_keahlian'] ?? null,
            'nilai'                => $nilaiArr,
            'rata_rata'            => $rataRata,
        ];
    }
    echo json_encode(['success' => true, 'data' => $result]);
    exit;
}

// ─── POST: Create/Update/Delete/ImportCSV ─────────────────────────────────
if ($method === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    // ── Import CSV ────────────────────────────────────────────────────────
    if (str_contains($contentType, 'multipart/form-data')) {
        if (!isset($_FILES['csv_file'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Tidak ada file yang diunggah.']);
            exit;
        }
        $file = $_FILES['csv_file']['tmp_name'];
        if (!is_readable($file)) {
            http_response_code(400);
            echo json_encode(['error' => 'File tidak dapat dibaca.']);
            exit;
        }

        $rows = array_map('str_getcsv', file($file));
        $header = array_map('trim', array_shift($rows));
        $header = array_map('strtolower', $header);

        // Expected columns: nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, status
        $required = ['nisn', 'nama', 'kelas', 'status'];
        foreach ($required as $req) {
            if (!in_array($req, $header)) {
                echo json_encode(['error' => "Kolom '$req' tidak ditemukan di header CSV."]);
                exit;
            }
        }

        $insertSiswa = $pdo->prepare("
            INSERT INTO siswa (id, lembaga_id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status)
            VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nama=VALUES(nama), jenis_kelamin=VALUES(jenis_kelamin),
            tempat_lahir=VALUES(tempat_lahir), tanggal_lahir=VALUES(tanggal_lahir),
            kelas=VALUES(kelas), kompetensi_keahlian=VALUES(kompetensi_keahlian), status=VALUES(status)
        ");

        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        $pdo->beginTransaction();

        foreach ($rows as $i => $row) {
            if (count($row) < count($required)) { $skipped++; continue; }
            $col = array_combine($header, array_map('trim', $row));

            $nisn          = $col['nisn'] ?? '';
            $nama          = mb_convert_case(mb_strtolower(trim($col['nama'] ?? ''), 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
            $kelas         = $col['kelas'] ?? '';
            $kompetensi    = $col['kompetensi_keahlian'] ?? '';
            $status        = strtoupper($col['status'] ?? 'LULUS');
            $jk            = strtoupper($col['jenis_kelamin'] ?? 'L');
            $tempat_lahir  = $col['tempat_lahir'] ?? '';
            $tanggal_lahir = $col['tanggal_lahir'] ?? null;

            if (empty($nisn) || empty($nama) || empty($kelas)) { $skipped++; continue; }
            if (!in_array($status, ['LULUS', 'TIDAK LULUS'])) $status = 'LULUS';
            if (!in_array($jk, ['L', 'P'])) $jk = 'L';

            // parse tanggal
            if (!empty($tanggal_lahir)) {
                $parsed = DateTime::createFromFormat('Y-m-d', $tanggal_lahir)
                    ?? DateTime::createFromFormat('d/m/Y', $tanggal_lahir)
                    ?? DateTime::createFromFormat('d-m-Y', $tanggal_lahir);
                $tanggal_lahir = $parsed ? $parsed->format('Y-m-d') : null;
            } else {
                $tanggal_lahir = null;
            }

            try {
                $insertSiswa->execute([$lembagaId, $nisn, $nama, $jk, $tempat_lahir, $tanggal_lahir, $kelas, $kompetensi ?: null, $status]);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Baris " . ($i + 2) . ": " . $e->getMessage();
                $skipped++;
            }
        }

        $pdo->commit();
        echo json_encode([
            'success'  => true,
            'imported' => $imported,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ]);
        exit;
    }

    // ── JSON Body Actions ─────────────────────────────────────────────────
    $data   = getJsonBody();
    $action = $data['action'] ?? '';

    // ── import_json
    if ($action === 'import_json') {
        $rows     = $data['rows'] ?? [];
        $imported = 0; $skipped = 0; $errors = [];

        $stmt = $pdo->prepare("
            INSERT INTO siswa (id, lembaga_id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status)
            VALUES (UUID(), :lembaga, :nisn, :nama, :jk, :tempat, :tgl, :kelas, :kompetensi, :status)
            ON DUPLICATE KEY UPDATE
              nama=VALUES(nama), jenis_kelamin=VALUES(jenis_kelamin),
              tempat_lahir=VALUES(tempat_lahir), tanggal_lahir=VALUES(tanggal_lahir),
              kelas=VALUES(kelas), kompetensi_keahlian=VALUES(kompetensi_keahlian), status=VALUES(status)
        ");

        $pdo->beginTransaction();
        foreach ($rows as $i => $col) {
            $nisn   = trim($col['nisn']   ?? '');
            $nama   = mb_convert_case(mb_strtolower(trim($col['nama']   ?? ''), 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
            $kelas  = trim($col['kelas']  ?? '');
            $kompetensi = trim($col['kompetensi_keahlian'] ?? '');
            $status = strtoupper($col['status'] ?? 'LULUS');
            $jk     = strtoupper($col['jenis_kelamin'] ?? 'L');
            $tempat = trim($col['tempat_lahir'] ?? '');
            $tgl    = !empty($col['tanggal_lahir']) ? $col['tanggal_lahir'] : null;

            if (!$nisn || !$nama || !$kelas) { $skipped++; continue; }
            if (!in_array($status, ['LULUS','TIDAK LULUS'])) $status = 'LULUS';
            if (!in_array($jk, ['L','P'])) $jk = 'L';

            try {
                $stmt->execute([':lembaga'=>$lembagaId, ':nisn'=>$nisn,':nama'=>$nama,':jk'=>$jk,':tempat'=>$tempat,':tgl'=>$tgl,':kelas'=>$kelas,':kompetensi'=>$kompetensi ?: null,':status'=>$status]);
                $imported++;
            } catch(\Exception $e) {
                $errors[] = "Baris ".($i+2).": ".$e->getMessage();
                $skipped++;
            }
        }
        $pdo->commit();
        echo json_encode(['success'=>true,'imported'=>$imported,'skipped'=>$skipped,'errors'=>$errors]);
        exit;
    }


    // ── update_status (single or bulk) ───────────────────────────────────
    if ($action === 'update_status') {
        $id_list    = $data['keys'] ?? [];
        $new_status = $data['status'];
        if (!in_array($new_status, ['LULUS', 'TIDAK LULUS'])) {
            echo json_encode(['error' => 'Status tidak valid']); exit;
        }
        $updateStmt = $pdo->prepare("UPDATE siswa SET status = ? WHERE id = ?");
        $updated = 0;
        foreach ($id_list as $uuid) {
            $updateStmt->execute([$new_status, $uuid]);
            $updated += $updateStmt->rowCount();
        }
        echo json_encode(['success' => true, 'updated' => $updated]);
        exit;
    }

    // ── create ────────────────────────────────────────────────────────────
    if ($action === 'create') {
        $nisn          = trim($data['nisn'] ?? '');
        $nama          = mb_convert_case(mb_strtolower(trim($data['nama'] ?? ''), 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        $kelas         = trim($data['kelas'] ?? '');
        $status        = $data['status'] ?? 'LULUS';
        $jk            = $data['jenis_kelamin'] ?? 'L';
        $tempat_lahir  = $data['tempat_lahir'] ?? '';
        $tanggal_lahir = $data['tanggal_lahir'] ?: null;

        if (!$nisn || !$nama || !$kelas) {
            echo json_encode(['error' => 'NISN, Nama, dan Kelas wajib diisi.']);
            exit;
        }
        $check = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
        $check->execute([$nisn]);
        if ($check->fetch()) {
            echo json_encode(['error' => 'NISN sudah terdaftar.']);
            exit;
        }
        $kompetensi_keahlian = trim($data['kompetensi_keahlian'] ?? '');
        $stmt = $pdo->prepare("INSERT INTO siswa (id, lembaga_id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$lembagaId, $nisn, $nama, $jk, $tempat_lahir, $tanggal_lahir, $kelas, $kompetensi_keahlian ?: null, $status]);
        $newId = $pdo->query("SELECT id FROM siswa WHERE nisn = '" . $nisn . "'")->fetchColumn();
        echo json_encode(['success' => true, 'id' => $newId]);
        exit;
    }

    // ── update ────────────────────────────────────────────────────────────
    if ($action === 'update') {
        $id            = $data['id'];
        $nama          = mb_convert_case(mb_strtolower(trim($data['nama'] ?? ''), 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        $kelas         = trim($data['kelas'] ?? '');
        $status        = $data['status'] ?? 'LULUS';
        $jk            = $data['jenis_kelamin'] ?? 'L';
        $tempat_lahir  = $data['tempat_lahir'] ?? '';
        $tanggal_lahir = $data['tanggal_lahir'] ?: null;

        if (!$id || !$nama || !$kelas) {
            echo json_encode(['error' => 'Data tidak lengkap.']);
            exit;
        }
        $kompetensi_keahlian = trim($data['kompetensi_keahlian'] ?? '');
        $stmt = $pdo->prepare("UPDATE siswa SET nama=?, jenis_kelamin=?, tempat_lahir=?, tanggal_lahir=?, kelas=?, kompetensi_keahlian=?, status=? WHERE id=?");
        $stmt->execute([$nama, $jk, $tempat_lahir, $tanggal_lahir, $kelas, $kompetensi_keahlian ?: null, $status, $id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── delete ────────────────────────────────────────────────────────────
    if ($action === 'delete') {
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['error' => 'Hanya Admin yang dapat menghapus data.']);
            exit;
        }
        $id = $data['id'];
        if (!$id) { echo json_encode(['error' => 'ID tidak valid.']); exit; }
        $pdo->prepare("DELETE FROM nilai WHERE siswa_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM siswa WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}

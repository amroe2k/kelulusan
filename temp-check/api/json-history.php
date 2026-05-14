<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$body   = $method === 'POST' ? getJsonBody() : [];

// ── GET: list json_history ─────────────────────────────────────────────
if ($method === 'GET') {
    $lembagaFilter = $_GET['lembaga_id'] ?? '';
    if ($lembagaFilter) {
        $stmt = $pdo->prepare(
            "SELECT * FROM json_history WHERE lembaga_id = ? ORDER BY generated_at DESC"
        );
        $stmt->execute([$lembagaFilter]);
    } else {
        $stmt = $pdo->query("SELECT * FROM json_history ORDER BY generated_at DESC LIMIT 100");
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cek file fisik ada atau tidak
    $exportsDir = dirname(__DIR__) . '/exports/';
    foreach ($rows as &$row) {
        $filePath = $exportsDir . $row['file_name'];
        $row['file_exists'] = file_exists($filePath);
        $row['file_size']   = $row['file_exists'] ? filesize($filePath) : 0;
    }
    unset($row);

    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
}

// ── POST ──────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $act = $body['action'] ?? '';

    // ── Restore: import JSON arsip → DB ───────────────────────────────
    if ($act === 'restore') {
        $fileName  = $body['file_name'] ?? '';
        $lembagaId = $body['lembaga_id'] ?? '';
        if (!$fileName || !$lembagaId) {
            echo json_encode(['success'=>false,'error'=>'file_name dan lembaga_id diperlukan']); exit;
        }

        // Sanitasi nama file
        $fileName  = basename($fileName);
        $exportsDir = dirname(__DIR__) . '/exports/';
        $filePath   = $exportsDir . $fileName;

        if (!file_exists($filePath)) {
            echo json_encode(['success'=>false,'error'=>'File tidak ditemukan: '.$fileName]); exit;
        }

        $json = json_decode(file_get_contents($filePath), true);
        if (!$json || empty($json['siswa'])) {
            echo json_encode(['success'=>false,'error'=>'Format JSON tidak valid atau kosong']); exit;
        }

        $pdo->beginTransaction();
        try {
            // Hapus semua nilai siswa lama untuk lembaga ini
            $siswaIds = $pdo->prepare("SELECT id FROM siswa WHERE lembaga_id = ?");
            $siswaIds->execute([$lembagaId]);
            foreach ($siswaIds->fetchAll(PDO::FETCH_COLUMN) as $sid) {
                $pdo->prepare("DELETE FROM nilai WHERE siswa_id = ?")->execute([$sid]);
            }
            $pdo->prepare("DELETE FROM siswa WHERE lembaga_id = ?")->execute([$lembagaId]);

            $stmtS = $pdo->prepare(
                "INSERT INTO siswa (id, lembaga_id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmtN = $pdo->prepare(
                "INSERT INTO nilai (siswa_id, mapel, nilai, urutan) VALUES (?, ?, ?, ?)"
            );

            $imported = 0;
            foreach ($json['siswa'] as $key => $s) {
                $sId = bin2hex(random_bytes(16));
                $sId = substr($sId,0,8).'-'.substr($sId,8,4).'-'.substr($sId,12,4).'-'.substr($sId,16,4).'-'.substr($sId,20);

                // Parse tanggal_lahir
                $tgl = null;
                if (!empty($s['tanggal_lahir'])) {
                    $tglRaw = $s['tanggal_lahir'];
                    // Format "dd Bulan YYYY" → YYYY-MM-DD
                    $bulan = ['Januari'=>'01','Februari'=>'02','Maret'=>'03','April'=>'04','Mei'=>'05',
                              'Juni'=>'06','Juli'=>'07','Agustus'=>'08','September'=>'09','Oktober'=>'10',
                              'November'=>'11','Desember'=>'12'];
                    if (preg_match('/^(\d{1,2})\s+(\w+)\s+(\d{4})$/', trim($tglRaw), $m)) {
                        $mo = $bulan[$m[2]] ?? null;
                        if ($mo) $tgl = sprintf('%04d-%s-%02d', $m[3], $mo, $m[1]);
                    } else {
                        // Coba parse langsung
                        $ts = strtotime($tglRaw);
                        if ($ts) $tgl = date('Y-m-d', $ts);
                    }
                }

                $stmtS->execute([
                    $sId, $lembagaId, $s['nisn'] ?? '', $s['nama'] ?? '',
                    $s['jenis_kelamin'] ?? 'L', $s['tempat_lahir'] ?? '', $tgl,
                    $s['kelas'] ?? '', $s['kompetensi_keahlian'] ?? '', $s['status'] ?? 'LULUS'
                ]);

                foreach ($s['nilai'] ?? [] as $i => $n) {
                    $stmtN->execute([$sId, $n['mapel'], $n['nilai'], $i + 1]);
                }
                $imported++;
            }

            // Update pengaturan dari meta JSON (tanpa logo/stempel/ttd agar tidak overwrite)
            $meta = $json['_meta'] ?? [];
            if ($meta) {
                $pdo->prepare(
                    "UPDATE pengaturan SET
                        sekolah = ?, nss = ?, npsn = ?, alamat = ?, kota = ?,
                        jenjang = ?, kompetensi_keahlian = ?, kepala_sekolah = ?,
                        jabatan_kepsek = ?, nip_kepsek = ?, nuptk_kepsek = ?, id_kepsek_mode = ?,
                        tahun_ajaran = ?, telepon = ?, email = ?,
                        domain = ?, nomor_surat_mode = ?, nomor_surat_suffix = ?, nomor_surat_statis = ?,
                        tanggal_pengumuman = ?, tanggal_skl2 = ?
                     WHERE lembaga_id = ?"
                )->execute([
                    $meta['sekolah'] ?? '', $meta['nss'] ?? '', $meta['npsn'] ?? '',
                    $meta['alamat'] ?? '', $meta['kota'] ?? '', $meta['jenjang'] ?? 'SMA',
                    $meta['kompetensi_keahlian'] ?? '', $meta['kepala_sekolah'] ?? '',
                    $meta['jabatan_kepsek'] ?? '', $meta['nip_kepsek'] ?? '',
                    $meta['nuptk_kepsek'] ?? '', $meta['id_kepsek_mode'] ?? 'nip',
                    $meta['tahun_ajaran'] ?? '',
                    $meta['telepon'] ?? '', $meta['email'] ?? '', $meta['domain'] ?? '',
                    $meta['nomor_surat_mode'] ?? 'auto',
                    $meta['nomor_surat_suffix'] ?? '', $meta['nomor_surat_statis'] ?? '',
                    $meta['tanggal_pengumuman'] ?? null, $meta['tanggal_skl2'] ?? null,
                    $lembagaId
                ]);
            }

            $pdo->commit();
            echo json_encode(['success'=>true, 'imported'=>$imported]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        exit;
    }

    // ── Set Aktif: gunakan JSON arsip sebagai data.json aktif ─────────
    if ($act === 'set_active') {
        $fileName = basename($body['file_name'] ?? '');
        if (!$fileName) { echo json_encode(['success'=>false,'error'=>'file_name diperlukan']); exit; }

        $exportsDir = dirname(__DIR__) . '/exports/';
        $srcPath    = $exportsDir . $fileName;
        $dstPath    = dirname(__DIR__) . '/data.json';

        if (!file_exists($srcPath)) {
            echo json_encode(['success'=>false,'error'=>'File tidak ditemukan']); exit;
        }
        if (!copy($srcPath, $dstPath)) {
            echo json_encode(['success'=>false,'error'=>'Gagal menyalin file']); exit;
        }

        // ── Update bundle-config.js sesuai secret lembaga dari arsip ──
        $archiveJson = json_decode(file_get_contents($srcPath), true);
        $archiveLembagaId = $archiveJson['_meta']['lembaga_id'] ?? null;
        if ($archiveLembagaId) {
            $secretRow = $pdo->prepare("SELECT integrity_secret, slug, nama FROM lembaga WHERE id = ?");
            $secretRow->execute([$archiveLembagaId]);
            $lRow = $secretRow->fetch(PDO::FETCH_ASSOC);
            if ($lRow) {
                $secret = !empty($lRow['integrity_secret']) ? $lRow['integrity_secret'] : 'kls-portal-integrity-2026';
                $bundleConfigPath = dirname(__DIR__) . '/bundle-config.js';
                file_put_contents($bundleConfigPath,
                    "/* AUTO-GENERATED — DO NOT EDIT */\n" .
                    "/* Bundle: {$lRow['slug']} | {$lRow['nama']} (set_active) */\n" .
                    "window.BUNDLE_SECRET = '{$secret}';\n"
                );
            }
        }

        echo json_encode(['success'=>true]);
        exit;
    }

    // ── Hapus entry history ────────────────────────────────────────────
    if ($act === 'delete') {
        $id       = $body['id']       ?? '';
        $fileName = $body['file_name'] ?? '';
        if (!$id) { echo json_encode(['success'=>false,'error'=>'ID diperlukan']); exit; }

        // ── Guard: cek apakah ini satu-satunya arsip dengan file valid ──
        $rowCheck = $pdo->prepare("SELECT lembaga_id FROM json_history WHERE id = ?");
        $rowCheck->execute([$id]);
        $targetRow = $rowCheck->fetch(PDO::FETCH_ASSOC);

        if ($targetRow) {
            $lembagaId = $targetRow['lembaga_id'];
            $exportsCheck = dirname(__DIR__) . '/exports/';
            $validCount = $pdo->prepare(
                "SELECT COUNT(*) FROM json_history WHERE lembaga_id = ? AND file_name IS NOT NULL AND id != ?"
            );
            $validCount->execute([$lembagaId, $id]);
            $remaining = (int)$validCount->fetchColumn();

            // Cek apakah file yang akan dihapus ini masih ada secara fisik
            $thisFileExists = $fileName && file_exists($exportsCheck . basename($fileName));

            if ($remaining === 0 && $thisFileExists) {
                echo json_encode([
                    'success' => false,
                    'error'   => 'Tidak dapat menghapus arsip terakhir. Minimal 1 arsip harus dipertahankan sebagai restore point.'
                ]);
                exit;
            }
        }

        $pdo->prepare("DELETE FROM json_history WHERE id = ?")->execute([$id]);
        // Hapus file fisik juga jika ada
        if ($fileName) {
            $p = dirname(__DIR__) . '/exports/' . basename($fileName);
            if (file_exists($p)) unlink($p);
        }
        echo json_encode(['success'=>true]);
        exit;
    }

    // ── Hapus Bulk ────────────────────────────────────────────────────────
    if ($act === 'bulk_delete') {
        $ids = $body['ids'] ?? [];
        if (!is_array($ids) || count($ids) === 0) {
            echo json_encode(['success'=>false,'error'=>'Tidak ada ID yang dipilih.']); exit;
        }

        // Sanitasi: hanya izinkan string UUID yang valid
        $ids = array_filter($ids, fn($id) => preg_match('/^[0-9a-f\-]{36}$/i', $id));
        if (count($ids) === 0) {
            echo json_encode(['success'=>false,'error'=>'Format ID tidak valid.']); exit;
        }

        $exportsDir = dirname(__DIR__) . '/exports/';
        $deleted    = 0;
        $skipped    = 0;

        foreach ($ids as $delId) {
            // Ambil info entri
            $rowStmt = $pdo->prepare("SELECT lembaga_id, file_name FROM json_history WHERE id = ?");
            $rowStmt->execute([$delId]);
            $row = $rowStmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) continue;

            // Guard: cek apakah ini arsip terakhir yang masih ada file-nya
            $validCount = $pdo->prepare(
                "SELECT COUNT(*) FROM json_history
                 WHERE lembaga_id = ? AND file_name IS NOT NULL AND id != ?"
            );
            $validCount->execute([$row['lembaga_id'], $delId]);
            $remaining = (int)$validCount->fetchColumn();

            $thisFileExists = $row['file_name'] && file_exists($exportsDir . basename($row['file_name']));

            if ($remaining === 0 && $thisFileExists) {
                $skipped++;
                continue; // Lewati — arsip terakhir tidak boleh dihapus
            }

            // Hapus file fisik
            if ($row['file_name']) {
                $p = $exportsDir . basename($row['file_name']);
                if (file_exists($p)) unlink($p);
            }
            // Hapus record DB
            $pdo->prepare("DELETE FROM json_history WHERE id = ?")->execute([$delId]);
            $deleted++;
        }

        echo json_encode([
            'success' => true,
            'deleted' => $deleted,
            'skipped' => $skipped,
        ]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

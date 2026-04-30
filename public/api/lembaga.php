<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$body   = $method === 'POST' ? getJsonBody() : [];

// ── GET: list all lembaga ──────────────────────────────────────────────
if ($method === 'GET' && !$action) {
        $rows = $pdo->query(
            "SELECT l.id, l.nama, l.slug, l.aktif, l.created_at,
                    COUNT(DISTINCT s.id) as jumlah_siswa
             FROM lembaga l
             LEFT JOIN siswa s ON s.lembaga_id COLLATE utf8mb4_unicode_ci = l.id COLLATE utf8mb4_unicode_ci
             GROUP BY l.id ORDER BY l.aktif DESC, l.nama ASC"
        )->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
}

// ── POST ──────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $act = $body['action'] ?? '';

    // ── Tambah Lembaga ─────────────────────────────────────────────────
    if ($act === 'create') {
        $nama = trim($body['nama'] ?? '');
        if (!$nama) { echo json_encode(['success'=>false,'error'=>'Nama wajib diisi']); exit; }

        // Auto-generate slug
        $slug = strtolower($nama);
        $slug = preg_replace('/[^a-z0-9\s-]/u', '', $slug);
        $slug = preg_replace('/\s+/', '-', trim($slug));
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = substr($slug, 0, 80);

        // Pastikan slug unik
        $existing = $pdo->prepare("SELECT COUNT(*) FROM lembaga WHERE slug = ?");
        $existing->execute([$slug]);
        if ($existing->fetchColumn() > 0) $slug .= '-' . time();

        $id = bin2hex(random_bytes(16));
        $id = substr($id, 0, 8).'-'.substr($id, 8, 4).'-'.substr($id, 12, 4).'-'.substr($id, 16, 4).'-'.substr($id, 20);

        $pdo->prepare("INSERT INTO lembaga (id, nama, slug, aktif) VALUES (?, ?, ?, 0)")
            ->execute([$id, $nama, $slug]);

        // Buat row pengaturan kosong untuk lembaga baru
        $pengId = bin2hex(random_bytes(16));
        $pengId = substr($pengId,0,8).'-'.substr($pengId,8,4).'-'.substr($pengId,12,4).'-'.substr($pengId,16,4).'-'.substr($pengId,20);
        $pdo->prepare("INSERT INTO pengaturan (id, lembaga_id, sekolah, nss, npsn, kepala_sekolah, nip_kepsek, tahun_ajaran, alamat, kota, jenjang)
                       VALUES (?, ?, ?, '', '', '', '', '', '', '', 'SMA')")
            ->execute([$pengId, $id, $nama]);

        echo json_encode(['success' => true, 'id' => $id, 'slug' => $slug]);
        exit;
    }

    // ── Edit Lembaga ────────────────────────────────────────────────────
    if ($act === 'update') {
        $id   = $body['id']   ?? '';
        $nama = trim($body['nama'] ?? '');
        if (!$id || !$nama) { echo json_encode(['success'=>false,'error'=>'ID dan Nama wajib']); exit; }
        $pdo->prepare("UPDATE lembaga SET nama = ? WHERE id = ?")->execute([$nama, $id]);
        $pdo->prepare("UPDATE pengaturan SET sekolah = ? WHERE lembaga_id = ?")->execute([$nama, $id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── Aktifkan Lembaga ────────────────────────────────────────────────
    if ($act === 'activate') {
        $id = $body['id'] ?? '';
        if (!$id) { echo json_encode(['success'=>false,'error'=>'ID diperlukan']); exit; }
        $pdo->exec("UPDATE lembaga SET aktif = 0");
        $pdo->prepare("UPDATE lembaga SET aktif = 1 WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── Hapus Lembaga ───────────────────────────────────────────────────
    if ($act === 'delete') {
        $id = $body['id'] ?? '';
        if (!$id) { echo json_encode(['success'=>false,'error'=>'ID diperlukan']); exit; }
        // Cek apakah aktif
        $aktif = $pdo->prepare("SELECT aktif FROM lembaga WHERE id = ?");
        $aktif->execute([$id]);
        if ((int)($aktif->fetchColumn()) === 1) {
            echo json_encode(['success'=>false,'error'=>'Tidak bisa hapus lembaga yang sedang aktif']); exit;
        }
        // Hapus siswa & nilainya
        $siswaIds = $pdo->prepare("SELECT id FROM siswa WHERE lembaga_id = ?");
        $siswaIds->execute([$id]);
        foreach ($siswaIds->fetchAll(PDO::FETCH_COLUMN) as $sid) {
            $pdo->prepare("DELETE FROM nilai WHERE siswa_id = ?")->execute([$sid]);
        }
        $pdo->prepare("DELETE FROM siswa      WHERE lembaga_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM pengaturan WHERE lembaga_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM json_history WHERE lembaga_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM lembaga WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── Reset Data Siswa Lembaga ─────────────────────────────────────────
    if ($act === 'reset_siswa') {
        $id = $body['id'] ?? '';
        if (!$id) { echo json_encode(['success'=>false,'error'=>'ID diperlukan']); exit; }
        $siswaIds = $pdo->prepare("SELECT id FROM siswa WHERE lembaga_id = ?");
        $siswaIds->execute([$id]);
        foreach ($siswaIds->fetchAll(PDO::FETCH_COLUMN) as $sid) {
            $pdo->prepare("DELETE FROM nilai WHERE siswa_id = ?")->execute([$sid]);
        }
        $pdo->prepare("DELETE FROM siswa WHERE lembaga_id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

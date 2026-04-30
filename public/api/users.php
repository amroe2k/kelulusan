<?php
session_start();
require 'db.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    exit(json_encode(['error' => 'Unauthorized — hanya Admin']));
}

$method = $_SERVER['REQUEST_METHOD'];

// ─── GET: List users ────────────────────────────────────────────────────────
if ($method === 'GET') {
    $rows = $pdo->query("
        SELECT u.id, u.username, u.nama, u.role, u.kelas, u.aktif,
               s.nisn as siswa_nisn
        FROM users u
        LEFT JOIN siswa s ON u.siswa_id = s.id
        ORDER BY u.role, u.nama
    ")->fetchAll(PDO::FETCH_ASSOC);
    // Hanya tampilkan admin dan guru
    $rows = array_filter($rows, fn($r) => in_array($r['role'], ['admin','guru']));
    echo json_encode(['success' => true, 'users' => array_values($rows)]);
    exit;
}

if ($method === 'POST') {
    $data = getJsonBody();
    $action = $data['action'] ?? '';

    // ── create ────────────────────────────────────────────────────────────
    if ($action === 'create') {
        $username = trim($data['username'] ?? '');
        $nama     = trim($data['nama'] ?? '');
        $password = $data['password'] ?? '';
        $role     = $data['role'] ?? 'guru';
        $kelas    = $data['kelas'] ?? null;

        if (!$username || !$nama || !$password) {
            echo json_encode(['error' => 'Username, nama, dan password wajib diisi.']);
            exit;
        }
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute([$username]);
        if ($check->fetch()) {
            echo json_encode(['error' => 'Username sudah terdaftar.']);
            exit;
        }

        $pw_hash  = hash('sha256', $password);
        $siswa_id = null;

        // Jika role siswa, cari siswa_id berdasarkan NISN sama dengan username
        if ($role === 'siswa') {
            $s = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
            $s->execute([$username]);
            $row = $s->fetch(PDO::FETCH_ASSOC);
            if ($row) $siswa_id = $row['id'];
        }

        $stmt = $pdo->prepare("INSERT INTO users (id, username, password_hash, nama, role, kelas, aktif, siswa_id) VALUES (UUID(), ?, ?, ?, ?, ?, 1, ?)");
        $stmt->execute([$username, $pw_hash, $nama, $role, $kelas, $siswa_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── update ────────────────────────────────────────────────────────────
    if ($action === 'update') {
        $id    = $data['id'];
        $nama  = trim($data['nama'] ?? '');
        $kelas = $data['kelas'] ?? null;
        $aktif = isset($data['aktif']) ? (int)$data['aktif'] : 1;

        if (!$id || !$nama) {
            echo json_encode(['error' => 'Data tidak lengkap.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET nama=?, kelas=?, aktif=? WHERE id=?");
        $stmt->execute([$nama, $kelas, $aktif, $id]);

        // Ganti password jika disertakan
        if (!empty($data['password'])) {
            $pw_hash = hash('sha256', $data['password']);
            $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$pw_hash, $id]);
        }

        echo json_encode(['success' => true]);
        exit;
    }

    // ── delete ────────────────────────────────────────────────────────────
    if ($action === 'delete') {
        $id = $data['id'];
        if (!$id) { echo json_encode(['error' => 'ID tidak valid.']); exit; }
        // Jangan hapus diri sendiri
        $self = $pdo->prepare("SELECT username FROM users WHERE id=?");
        $self->execute([$id]);
        $row = $self->fetch(PDO::FETCH_ASSOC);
        if ($row && $row['username'] === $_SESSION['username']) {
            echo json_encode(['error' => 'Tidak dapat menghapus akun sendiri.']);
            exit;
        }
        $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // ── toggle_aktif ────────────────────────────────────────────────────
    if ($action === 'toggle_aktif') {
        $id = $data['id'] ?? '';
        if (!$id) { echo json_encode(['error' => 'ID tidak valid.']); exit; }
        // Jangan disable diri sendiri
        $self = $pdo->prepare("SELECT username, aktif FROM users WHERE id=?");
        $self->execute([$id]);
        $row = $self->fetch(PDO::FETCH_ASSOC);
        if (!$row) { echo json_encode(['error' => 'User tidak ditemukan.']); exit; }
        if ($row['username'] === ($_SESSION['username'] ?? '')) {
            echo json_encode(['error' => 'Tidak dapat menonaktifkan akun sendiri.']); exit;
        }
        $newAktif = $row['aktif'] ? 0 : 1;
        $pdo->prepare("UPDATE users SET aktif=? WHERE id=?")->execute([$newAktif, $id]);
        echo json_encode(['success' => true, 'aktif' => $newAktif]);
        exit;
    }

    if ($action === 'reset_password') {
        $id          = $data['id'];
        $new_password = $data['new_password'] ?? '';
        if (!$id || !$new_password) {
            echo json_encode(['error' => 'Data tidak lengkap.']);
            exit;
        }
        $pw_hash = hash('sha256', $new_password);
        $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$pw_hash, $id]);
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}

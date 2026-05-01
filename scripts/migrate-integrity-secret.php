<?php
/**
 * scripts/migrate-integrity-secret.php
 * Tambah kolom integrity_secret ke tabel lembaga dan generate UUID per lembaga.
 */
$pdo = new PDO('mysql:host=localhost;dbname=db_kelulusan', 'root', '@demo1234');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Tambah kolom jika belum ada
try {
    $pdo->exec("ALTER TABLE lembaga ADD COLUMN integrity_secret VARCHAR(36) NULL AFTER slug");
    echo "✓ Kolom integrity_secret ditambahkan.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "ℹ Kolom integrity_secret sudah ada.\n";
    } else {
        throw $e;
    }
}

// 2. Generate UUID untuk lembaga yang belum punya
function generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

$rows = $pdo->query("SELECT id, nama FROM lembaga WHERE integrity_secret IS NULL OR integrity_secret = ''")->fetchAll(PDO::FETCH_ASSOC);
$upd  = $pdo->prepare("UPDATE lembaga SET integrity_secret = ? WHERE id = ?");
foreach ($rows as $r) {
    $secret = generateUUID();
    $upd->execute([$secret, $r['id']]);
    echo "✓ Secret untuk '{$r['nama']}': {$secret}\n";
}

if (empty($rows)) {
    echo "ℹ Semua lembaga sudah memiliki integrity_secret.\n";
}

// 3. Tampilkan semua
echo "\n=== Daftar Lembaga & Secret ===\n";
$all = $pdo->query("SELECT id, nama, slug, integrity_secret FROM lembaga")->fetchAll(PDO::FETCH_ASSOC);
foreach ($all as $a) {
    echo "  {$a['nama']} ({$a['slug']})\n  → {$a['integrity_secret']}\n\n";
}
echo "Migration selesai!\n";

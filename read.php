<?php
require __DIR__ . '/public/api/db.php';
$stmt = $pdo->prepare("UPDATE siswa SET kompetensi_keahlian = NULL WHERE kompetensi_keahlian REGEXP '^[0-9\\\\.]+$'");
$stmt->execute();
echo "Affected rows: " . $stmt->rowCount() . "\n";

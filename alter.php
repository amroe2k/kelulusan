<?php
require_once __DIR__ . '/public/api/db.php';
$pdo->exec('ALTER TABLE siswa ADD COLUMN konsentrasi_keahlian VARCHAR(255) NULL AFTER kompetensi_keahlian');
echo 'OK';

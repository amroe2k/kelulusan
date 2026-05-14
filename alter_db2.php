<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require 'public/api/db.php';
try {
    $pdo->query("ALTER TABLE lembaga ADD COLUMN form_token VARCHAR(64) NULL DEFAULT NULL");
    $pdo->query("ALTER TABLE lembaga ADD COLUMN form_token_expires DATETIME NULL DEFAULT NULL");
    echo "Success\n";
} catch(Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

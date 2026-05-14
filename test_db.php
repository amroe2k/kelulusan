<?php
require 'public/api/db.php';
$stmt = $pdo->query("DESCRIBE pengaturan");
foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo $row['Field'] . "\n";
}

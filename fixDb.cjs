const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function fixDb() {
  try {
    await ssh.connect({
      host: 'cloud.disdiktanjungbalai.id',
      username: 'root',
      password: '@arm123',
      port: 2233
    });
    console.log('Connected to VPS.');
    
    const phpCode = `<?php
require 'db.php';
try {
    $pdo->query("ALTER TABLE lembaga ADD COLUMN form_token VARCHAR(64) NULL DEFAULT NULL");
    echo "Added form_token. ";
} catch(Exception $e) { echo $e->getMessage() . " "; }
try {
    $pdo->query("ALTER TABLE lembaga ADD COLUMN form_token_expires DATETIME NULL DEFAULT NULL");
    echo "Added form_token_expires. ";
} catch(Exception $e) { echo $e->getMessage() . " "; }
?>`;

    await ssh.execCommand(`cat << 'EOF' > /home/disdiktanjungbalai-kelulusan/htdocs/kelulusan.disdiktanjungbalai.id/api/alter_temp.php\n${phpCode}\nEOF`);
    
    console.log('Script created. Executing...');
    const result = await ssh.execCommand('php /home/disdiktanjungbalai-kelulusan/htdocs/kelulusan.disdiktanjungbalai.id/api/alter_temp.php');
    console.log('Result:', result.stdout);
    
    await ssh.execCommand('rm /home/disdiktanjungbalai-kelulusan/htdocs/kelulusan.disdiktanjungbalai.id/api/alter_temp.php');
    console.log('Cleanup done.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fixDb();

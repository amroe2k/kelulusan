/**
 * scripts/migrate-multi-lembaga.cjs
 * Migrasi database ke arsitektur Multi-Lembaga.
 * Jalankan: node scripts/migrate-multi-lembaga.cjs
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

const DB = { host:'localhost', user:'root', password:'@demo1234', database:'db_kelulusan' };
const uuid = () => crypto.randomUUID();

async function run() {
  const conn = await mysql.createConnection(DB);
  console.log('━━━ MIGRASI MULTI-LEMBAGA ━━━━━━━━━━━━━━━━━━');

  // 1. Buat tabel lembaga
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS lembaga (
      id                   CHAR(36)      NOT NULL PRIMARY KEY,
      nama                 VARCHAR(200)  NOT NULL,
      slug                 VARCHAR(80)   NOT NULL UNIQUE,
      aktif                TINYINT(1)    NOT NULL DEFAULT 0,
      created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✓ Tabel lembaga siap');

  // 2. Buat tabel json_history
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS json_history (
      id             CHAR(36)     NOT NULL PRIMARY KEY,
      lembaga_id     CHAR(36)     NOT NULL,
      lembaga_nama   VARCHAR(200),
      lembaga_slug   VARCHAR(80),
      file_name      VARCHAR(300),
      jumlah_siswa   INT          DEFAULT 0,
      lulus          INT          DEFAULT 0,
      tidak_lulus    INT          DEFAULT 0,
      generated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_lembaga_id (lembaga_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✓ Tabel json_history siap');

  // 3. Tambah kolom lembaga_id ke pengaturan (jika belum ada)
  const [pengatCols] = await conn.execute("SHOW COLUMNS FROM pengaturan LIKE 'lembaga_id'");
  if (pengatCols.length === 0) {
    await conn.execute("ALTER TABLE pengaturan ADD COLUMN lembaga_id CHAR(36) NULL AFTER id");
    console.log('✓ Kolom lembaga_id ditambahkan ke pengaturan');
  } else {
    console.log('⚠ Kolom lembaga_id sudah ada di pengaturan');
  }

  // 4. Tambah kolom lembaga_id ke siswa (jika belum ada)
  const [siswaCols] = await conn.execute("SHOW COLUMNS FROM siswa LIKE 'lembaga_id'");
  if (siswaCols.length === 0) {
    await conn.execute("ALTER TABLE siswa ADD COLUMN lembaga_id CHAR(36) NULL AFTER id, ADD INDEX idx_siswa_lembaga (lembaga_id)");
    console.log('✓ Kolom lembaga_id ditambahkan ke siswa');
  } else {
    console.log('⚠ Kolom lembaga_id sudah ada di siswa');
  }

  // 5. Migrasi data existing sebagai lembaga dummy
  const [existing] = await conn.execute("SELECT * FROM pengaturan WHERE lembaga_id IS NULL LIMIT 1");
  if (existing.length > 0) {
    const p = existing[0];
    const lembagaId = uuid();
    const namaSekolah = p.sekolah || 'Sample Dummy';
    const slug = namaSekolah.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    await conn.execute(
      "INSERT INTO lembaga (id, nama, slug, aktif) VALUES (?, ?, ?, 1)",
      [lembagaId, namaSekolah, slug]
    );
    await conn.execute("UPDATE pengaturan SET lembaga_id = ? WHERE id = ?", [lembagaId, p.id]);
    await conn.execute("UPDATE siswa SET lembaga_id = ? WHERE lembaga_id IS NULL", [lembagaId]);

    console.log(`✓ Data existing "${namaSekolah}" dimigrasikan sebagai lembaga aktif (slug: ${slug})`);
  } else {
    console.log('⚠ Tidak ada data existing untuk dimigrasikan (atau sudah dimigrasikan)');
  }

  // 6. Buat direktori public/exports jika belum ada
  const exportsDir = path.join(process.cwd(), 'public', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
    console.log('✓ Direktori public/exports dibuat');
  }

  // 7. Tampilkan hasil
  const [lembagaList] = await conn.execute("SELECT id, nama, slug, aktif FROM lembaga ORDER BY aktif DESC, nama ASC");
  console.log('\n━━━ Daftar Lembaga ━━━━━━━━━━━━━━━━━━━━━━━━━');
  lembagaList.forEach(l => {
    console.log(`  ${l.aktif ? '● AKTIF' : '○'} [${l.slug}] ${l.nama}`);
  });

  await conn.end();
  console.log('\n✓ Migrasi selesai! Jalankan: npm run export-data');
}

run().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });

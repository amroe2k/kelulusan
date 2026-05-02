/**
 * scripts/migrate.js
 * Schema database db_kelulusan dengan UUID sebagai PK & FK.
 * Jalankan: npm run migrate
 *
 * CATATAN: Script ini DROP & RECREATE semua tabel.
 * Jalankan "npm run seed" setelah migrate.
 */
import mysql from 'mysql2/promise';

const DB = {
  host: 'localhost', user: 'root',
  password: '@demo1234', database: 'db_kelulusan',
};

// Urutan DROP harus memperhatikan FK (child dulu, baru parent)
const DROP_ORDER = ['users', 'nilai', 'siswa', 'pengaturan'];

const CREATE_TABLES = [

  // ── 1. Pengaturan ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pengaturan (
    id                   CHAR(36)                  NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    sekolah              VARCHAR(200)               NOT NULL DEFAULT 'Nama Sekolah',
    nss                  VARCHAR(20)                DEFAULT '',
    npsn                 VARCHAR(20)                DEFAULT '',
    alamat               VARCHAR(500)               DEFAULT '',
    kota                 VARCHAR(255)               DEFAULT '',
    jenjang              VARCHAR(20)                DEFAULT 'SMA',
    kompetensi_keahlian  VARCHAR(200)               DEFAULT '',
    kepala_sekolah       VARCHAR(150)               DEFAULT '',
    jabatan_kepsek       VARCHAR(150)               DEFAULT '',
    nip_kepsek           VARCHAR(30)                DEFAULT '',
    nuptk_kepsek         VARCHAR(30)                DEFAULT '',
    id_kepsek_mode       ENUM('nip','nuptk')        NOT NULL DEFAULT 'nip',
    tahun_ajaran         VARCHAR(20)                NOT NULL DEFAULT '2024/2025',
    tanggal_pengumuman   VARCHAR(50)                DEFAULT '',
    tanggal_skl2         DATE                       DEFAULT NULL,
    nomor_surat_mode     ENUM('auto','static')      NOT NULL DEFAULT 'auto',
    nomor_surat_suffix   VARCHAR(150)               DEFAULT '',
    nomor_surat_statis   VARCHAR(255)               DEFAULT '',
    telepon              VARCHAR(50)                DEFAULT '',
    email                VARCHAR(100)               DEFAULT '',
    domain               VARCHAR(255)               DEFAULT '',
    logo                 LONGTEXT                   DEFAULT NULL,
    stempel              LONGTEXT                   DEFAULT NULL,
    ttd                  LONGTEXT                   DEFAULT NULL,
    kop_surat            LONGTEXT                   DEFAULT NULL,
    created_at           TIMESTAMP                  DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP                  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 2. Siswa ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS siswa (
    id             CHAR(36)     NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    nisn           VARCHAR(20)  NOT NULL UNIQUE COMMENT 'NISN asli – tidak diexport ke JSON',
    nama           VARCHAR(150) NOT NULL,
    jenis_kelamin  ENUM('L','P') NOT NULL DEFAULT 'L',
    tempat_lahir   VARCHAR(100) DEFAULT '',
    tanggal_lahir  DATE         DEFAULT NULL,
    kelas          VARCHAR(30)  DEFAULT '',
    status         ENUM('LULUS','TIDAK LULUS') NOT NULL DEFAULT 'LULUS',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nisn   (nisn),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 3. Nilai ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS nilai (
    id        CHAR(36)     NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    siswa_id  CHAR(36)     NOT NULL COMMENT 'FK → siswa.id (UUID)',
    mapel     VARCHAR(100) NOT NULL,
    nilai     DECIMAL(5,2) NOT NULL DEFAULT 0,
    urutan    TINYINT      DEFAULT 0,
    FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
    INDEX idx_siswa (siswa_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 4. Users ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)     NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(64)  NOT NULL COMMENT 'SHA-256 hex',
    nama          VARCHAR(150) NOT NULL,
    role          ENUM('admin','guru','siswa') NOT NULL DEFAULT 'siswa',
    siswa_id      CHAR(36)     DEFAULT NULL COMMENT 'FK → siswa.id (hanya role siswa)',
    kelas         VARCHAR(30)  DEFAULT NULL COMMENT 'Filter kelas (hanya role guru)',
    aktif         TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_role     (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrate() {
  console.log('━━━ DB MIGRATION (UUID PK/FK) ━━━━━━━━━');
  const conn = await mysql.createConnection(DB);
  console.log('✓ Terhubung ke:', DB.database);

  // Disable FK checks agar bisa DROP
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const tbl of DROP_ORDER) {
    await conn.execute(`DROP TABLE IF EXISTS \`${tbl}\``);
    console.log(`  ✗ DROP  "${tbl}"`);
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

  // Buat ulang
  for (const sql of CREATE_TABLES) {
    const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    await conn.execute(sql);
    console.log(`  ✓ CREATE "${name}" (UUID PK)`);
  }

  await conn.end();
  console.log('━━━ Migrasi selesai! ━━━━━━━━━━━━━━━━━━');
  console.log('Jalankan "npm run seed" untuk mengisi data.\n');
}

migrate().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });

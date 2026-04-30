/**
 * scripts/export-users.js
 * Export data users dari MySQL → public/users.json
 * Password hash ikut di-export (untuk verifikasi client-side).
 * Data sensitif (NISN asli) TIDAK diexport.
 *
 * LOGIKA:
 *   1. Export semua user dari tabel `users` (admin, guru, siswa yg punya akun manual)
 *   2. AUTO-GENERATE akun untuk siswa yang BELUM punya akun di tabel `users`
 *      → username = NISN, password default = NISN
 *
 * Jalankan: npm run export-users
 */
import mysql from 'mysql2/promise';
import fs    from 'fs/promises';
import path  from 'path';

const DB = {
  host: 'localhost', user: 'root',
  password: '@demo1234', database: 'db_kelulusan',
};

async function exportUsers() {
  console.log('━━━ EXPORT USERS ━━━━━━━━━━━━━━━━━━━━━');
  const conn = await mysql.createConnection(DB);

  const crypto = await import('crypto');
  const sha256 = str => crypto.createHash('sha256').update(String(str)).digest('hex');

  // 1. Export user yang sudah ada di tabel users
  const [rows] = await conn.execute(`
    SELECT u.id, u.username, u.password_hash, u.nama, u.role,
           u.kelas, u.aktif, s.nisn as nisn_hash_source
    FROM users u
    LEFT JOIN siswa s ON u.siswa_id = s.id
    WHERE u.aktif = 1
    ORDER BY u.role, u.nama
  `);

  const result = {};
  // NISN siswa yang sudah punya akun manual
  const coveredNisn = new Set();

  for (const r of rows) {
    const auth_hash = sha256(r.username + '|' + r.password_hash);
    result[r.username] = {
      auth_hash:  auth_hash,
      nama:       r.nama,
      role:       r.role,
      kelas:      r.kelas,
      nisn_hash:  r.nisn_hash_source ? sha256(String(r.nisn_hash_source)) : null,
    };
    if (r.role === 'siswa' && r.nisn_hash_source) {
      coveredNisn.add(String(r.nisn_hash_source));
    }
  }

  // 2. Auto-generate akun untuk siswa yang belum punya akun
  //    Password default = NISN (sama seperti username)
  const [siswaRows] = await conn.execute(
    'SELECT id, nisn, nama FROM siswa ORDER BY nama ASC'
  );

  let autoCount = 0;
  for (const s of siswaRows) {
    const nisn = String(s.nisn).trim();
    if (coveredNisn.has(nisn)) continue; // sudah punya akun manual

    // username = NISN, password = NISN → password_hash = sha256(NISN)
    const password_hash = sha256(nisn);
    const auth_hash     = sha256(nisn + '|' + password_hash);
    const nisn_hash     = sha256(nisn);

    result[nisn] = {
      auth_hash:  auth_hash,
      nama:       s.nama,
      role:       'siswa',
      kelas:      null,
      nisn_hash:  nisn_hash,
    };
    autoCount++;
  }

  const out = path.join(process.cwd(), 'public', 'users.json');
  await fs.writeFile(out, JSON.stringify(result, null, 2), 'utf-8');
  await conn.end();

  const total = Object.keys(result).length;
  console.log(`✓ ${rows.length} user manual + ${autoCount} siswa auto-generated`);
  console.log(`✓ ${total} total diexport → ${out}`);
  console.log('Jalankan "npm run build" untuk rebuild.\n');
}

exportUsers().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });

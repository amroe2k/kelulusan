/**
 * scripts/seed.js
 * Insert data dummy ke database dengan UUID sebagai PK & FK.
 * Jalankan: npm run seed
 */
import mysql  from 'mysql2/promise';
import crypto from 'crypto';

const DB = {
  host: 'localhost', user: 'root',
  password: '@demo1234', database: 'db_kelulusan',
};

const uuid   = () => crypto.randomUUID();
const sha256 = str => crypto.createHash('sha256').update(str).digest('hex');
const maskNISN = n => (!n || n.length < 6) ? n : n.slice(0,3) + '****' + n.slice(-3);

// ── Meta Sekolah ─────────────────────────────────────────────
const META = {
  sekolah:            'SMA Negeri 1 Contoh',
  nss:                '301010101001',
  npsn:               '10101010',
  alamat:             'Jl. Pendidikan No. 1, Kota Contoh, Jawa Tengah',
  kepala_sekolah:     'Drs. Budi Santoso, M.Pd.',
  nip_kepsek:         '196701011990031001',
  tahun_ajaran:       '2024/2025',
  tanggal_pengumuman: '30 April 2025',
};

// ── Data Siswa ────────────────────────────────────────────────
const SISWA_DATA = [
  {
    nisn: '0012345678', nama: 'Ahmad Fauzi Pratama',
    jenis_kelamin: 'L', tempat_lahir: 'Jakarta',
    tanggal_lahir: '2007-03-15', kelas: 'XII IPA 1', status: 'LULUS',
    nilai: [
      { mapel: 'Pendidikan Agama Islam', nilai: 88, urutan: 1 },
      { mapel: 'Pendidikan Pancasila',   nilai: 85, urutan: 2 },
      { mapel: 'Bahasa Indonesia',       nilai: 82, urutan: 3 },
      { mapel: 'Matematika',             nilai: 90, urutan: 4 },
      { mapel: 'Bahasa Inggris',         nilai: 87, urutan: 5 },
      { mapel: 'Fisika',                 nilai: 91, urutan: 6 },
      { mapel: 'Kimia',                  nilai: 86, urutan: 7 },
      { mapel: 'Biologi',               nilai: 84, urutan: 8 },
      { mapel: 'Sejarah Indonesia',      nilai: 80, urutan: 9 },
      { mapel: 'Seni Budaya',            nilai: 88, urutan: 10 },
    ],
  },
  {
    nisn: '0098765432', nama: 'Siti Rahma Dewi',
    jenis_kelamin: 'P', tempat_lahir: 'Bandung',
    tanggal_lahir: '2007-06-22', kelas: 'XII IPS 2', status: 'LULUS',
    nilai: [
      { mapel: 'Pendidikan Agama Islam', nilai: 92, urutan: 1 },
      { mapel: 'Pendidikan Pancasila',   nilai: 88, urutan: 2 },
      { mapel: 'Bahasa Indonesia',       nilai: 90, urutan: 3 },
      { mapel: 'Matematika',             nilai: 78, urutan: 4 },
      { mapel: 'Bahasa Inggris',         nilai: 95, urutan: 5 },
      { mapel: 'Ekonomi',                nilai: 89, urutan: 6 },
      { mapel: 'Geografi',               nilai: 86, urutan: 7 },
      { mapel: 'Sosiologi',             nilai: 91, urutan: 8 },
      { mapel: 'Sejarah Indonesia',      nilai: 85, urutan: 9 },
      { mapel: 'Seni Budaya',            nilai: 90, urutan: 10 },
    ],
  },
  {
    nisn: '1121234455', nama: 'Budi Ramadhan Saputra',
    jenis_kelamin: 'L', tempat_lahir: 'Surabaya',
    tanggal_lahir: '2007-01-07', kelas: 'XII IPA 2', status: 'TIDAK LULUS',
    nilai: [
      { mapel: 'Pendidikan Agama Islam', nilai: 65, urutan: 1 },
      { mapel: 'Pendidikan Pancasila',   nilai: 60, urutan: 2 },
      { mapel: 'Bahasa Indonesia',       nilai: 55, urutan: 3 },
      { mapel: 'Matematika',             nilai: 48, urutan: 4 },
      { mapel: 'Bahasa Inggris',         nilai: 62, urutan: 5 },
      { mapel: 'Fisika',                 nilai: 50, urutan: 6 },
      { mapel: 'Kimia',                  nilai: 45, urutan: 7 },
      { mapel: 'Biologi',               nilai: 58, urutan: 8 },
      { mapel: 'Sejarah Indonesia',      nilai: 63, urutan: 9 },
      { mapel: 'Seni Budaya',            nilai: 70, urutan: 10 },
    ],
  },
  {
    nisn: '5543219876', nama: 'Dewi Anggraini Putri',
    jenis_kelamin: 'P', tempat_lahir: 'Yogyakarta',
    tanggal_lahir: '2007-09-03', kelas: 'XII IPS 1', status: 'LULUS',
    nilai: [
      { mapel: 'Pendidikan Agama Islam', nilai: 94, urutan: 1 },
      { mapel: 'Pendidikan Pancasila',   nilai: 91, urutan: 2 },
      { mapel: 'Bahasa Indonesia',       nilai: 93, urutan: 3 },
      { mapel: 'Matematika',             nilai: 85, urutan: 4 },
      { mapel: 'Bahasa Inggris',         nilai: 96, urutan: 5 },
      { mapel: 'Ekonomi',                nilai: 92, urutan: 6 },
      { mapel: 'Geografi',               nilai: 89, urutan: 7 },
      { mapel: 'Sosiologi',             nilai: 90, urutan: 8 },
      { mapel: 'Sejarah Indonesia',      nilai: 88, urutan: 9 },
      { mapel: 'Seni Budaya',            nilai: 95, urutan: 10 },
    ],
  },
  {
    nisn: '3312345601', nama: 'Rizki Maulana Hidayat',
    jenis_kelamin: 'L', tempat_lahir: 'Semarang',
    tanggal_lahir: '2007-11-19', kelas: 'XII IPA 3', status: 'LULUS',
    nilai: [
      { mapel: 'Pendidikan Agama Islam', nilai: 87, urutan: 1 },
      { mapel: 'Pendidikan Pancasila',   nilai: 84, urutan: 2 },
      { mapel: 'Bahasa Indonesia',       nilai: 89, urutan: 3 },
      { mapel: 'Matematika',             nilai: 93, urutan: 4 },
      { mapel: 'Bahasa Inggris',         nilai: 85, urutan: 5 },
      { mapel: 'Fisika',                 nilai: 95, urutan: 6 },
      { mapel: 'Kimia',                  nilai: 90, urutan: 7 },
      { mapel: 'Biologi',               nilai: 88, urutan: 8 },
      { mapel: 'Sejarah Indonesia',      nilai: 82, urutan: 9 },
      { mapel: 'Seni Budaya',            nilai: 86, urutan: 10 },
    ],
  },
];

async function seed() {
  console.log('━━━ DB SEEDER (UUID) ━━━━━━━━━━━━━━━━━━');
  const conn = await mysql.createConnection(DB);
  console.log('✓ Terhubung ke:', DB.database);

  // ── Pengaturan ────────────────────────────────────────────
  const [existMeta] = await conn.execute('SELECT id FROM pengaturan LIMIT 1');
  if (existMeta.length > 0) {
    await conn.execute(
      `UPDATE pengaturan SET sekolah=?,nss=?,npsn=?,alamat=?,kepala_sekolah=?,
       nip_kepsek=?,tahun_ajaran=?,tanggal_pengumuman=? WHERE id=?`,
      [META.sekolah,META.nss,META.npsn,META.alamat,META.kepala_sekolah,
       META.nip_kepsek,META.tahun_ajaran,META.tanggal_pengumuman,existMeta[0].id]
    );
    console.log('✓ Meta sekolah diperbarui.');
  } else {
    await conn.execute(
      `INSERT INTO pengaturan (id,sekolah,nss,npsn,alamat,kepala_sekolah,nip_kepsek,tahun_ajaran,tanggal_pengumuman)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uuid(),META.sekolah,META.nss,META.npsn,META.alamat,META.kepala_sekolah,
       META.nip_kepsek,META.tahun_ajaran,META.tanggal_pengumuman]
    );
    console.log('✓ Meta sekolah ditambahkan.');
  }

  // ── Siswa & Nilai ─────────────────────────────────────────
  let inserted = 0, skipped = 0;
  const siswaMap = {}; // nisn → uuid id

  for (const s of SISWA_DATA) {
    const [dup] = await conn.execute('SELECT id FROM siswa WHERE nisn = ?', [s.nisn]);
    if (dup.length > 0) {
      siswaMap[s.nisn] = dup[0].id;
      console.log(`  ↷ Skip siswa: ${s.nama}`);
      skipped++; continue;
    }

    const sid = uuid();
    siswaMap[s.nisn] = sid;

    await conn.execute(
      `INSERT INTO siswa (id,nisn,nama,jenis_kelamin,tempat_lahir,tanggal_lahir,kelas,status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [sid,s.nisn,s.nama,s.jenis_kelamin,s.tempat_lahir,s.tanggal_lahir,s.kelas,s.status]
    );

    for (const n of s.nilai) {
      await conn.execute(
        'INSERT INTO nilai (id,siswa_id,mapel,nilai,urutan) VALUES (?,?,?,?,?)',
        [uuid(), sid, n.mapel, n.nilai, n.urutan]
      );
    }
    console.log(`  ✓ ${s.nama} (${s.status})`);
    inserted++;
  }

  // ── Users ─────────────────────────────────────────────────
  console.log('\nMenyiapkan user login...');

  const USERS = [
    { username: 'admin',      password: 'Admin@123',  nama: 'Administrator',         role: 'admin',  nisn: null,         kelas: null },
    { username: 'guru.ipa',   password: 'Guru@123',   nama: 'Drs. Hendra Wijaya',    role: 'guru',   nisn: null,         kelas: 'XII IPA' },
    { username: 'guru.ips',   password: 'Guru@123',   nama: 'Dra. Sri Mulyani',      role: 'guru',   nisn: null,         kelas: 'XII IPS' },
    { username: '0012345678', password: '0012345678', nama: 'Ahmad Fauzi Pratama',   role: 'siswa',  nisn: '0012345678', kelas: null },
    { username: '0098765432', password: '0098765432', nama: 'Siti Rahma Dewi',       role: 'siswa',  nisn: '0098765432', kelas: null },
    { username: '1121234455', password: '1121234455', nama: 'Budi Ramadhan Saputra', role: 'siswa',  nisn: '1121234455', kelas: null },
    { username: '5543219876', password: '5543219876', nama: 'Dewi Anggraini Putri',  role: 'siswa',  nisn: '5543219876', kelas: null },
    { username: '3312345601', password: '3312345601', nama: 'Rizki Maulana Hidayat', role: 'siswa',  nisn: '3312345601', kelas: null },
  ];

  let userIns = 0, userSkip = 0;
  for (const u of USERS) {
    const [dup] = await conn.execute('SELECT id FROM users WHERE username = ?', [u.username]);
    if (dup.length > 0) { userSkip++; continue; }

    const sid = (u.nisn && siswaMap[u.nisn]) ? siswaMap[u.nisn] : null;
    await conn.execute(
      'INSERT INTO users (id,username,password_hash,nama,role,siswa_id,kelas) VALUES (?,?,?,?,?,?,?)',
      [uuid(), u.username, sha256(u.password), u.nama, u.role, sid, u.kelas]
    );
    console.log(`  ✓ [${u.role.padEnd(5)}] ${u.username}`);
    userIns++;
  }

  await conn.end();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ Siswa : ${inserted} ditambah, ${skipped} dilewati.`);
  console.log(`✓ Users : ${userIns} ditambah, ${userSkip} dilewati.`);
  console.log('Jalankan "npm run export-data" dan "npm run export-users"\n');
}

seed().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });

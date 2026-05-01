/**
 * scripts/export-data.js  v2 — Multi-Lembaga
 * Export data dari MySQL → public/data.json
 * Jalankan: npm run export-data
 *
 * ALUR:
 *   1. Ambil lembaga AKTIF dari tabel lembaga
 *   2. Ambil pengaturan & siswa yang terkait dengan lembaga tersebut
 *   3. Hash NISN sebagai kunci JSON
 *   4. Simpan ke public/data.json  (aktif)
 *   5. Simpan arsip ke public/exports/data-{slug}-{timestamp}.json
 *   6. Catat ke tabel json_history
 */
import mysql  from 'mysql2/promise';
import fs     from 'fs/promises';
import crypto from 'crypto';
import path   from 'path';

// ─── Konfigurasi ─────────────────────────────────
const DB = {
  host:     'localhost',
  user:     'root',
  password: '@demo1234',
  database: 'db_kelulusan',
};

// ─── Helpers ─────────────────────────────────────
const sha256   = str => crypto.createHash('sha256').update(str).digest('hex');
const uuid     = ()  => crypto.randomUUID();
const maskNISN = n   => (!n || n.length < 6) ? n : n.slice(0,3) + '****' + n.slice(-3);

// ─── Integrity Protection ─────────────────────────────────────────────
function computeIntegrity(m, secret) {
  const payload = [
    m.lembaga_id, m.lembaga_nama, m.lembaga_slug,
    m.sekolah, m.nss, m.npsn, m.kepala_sekolah
  ].map(v => v ?? '').join('|');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Konversi Date object / ISO string → 'YYYY-MM-DD'
const toDateString = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const m = String(d).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(d);
};

function formatTanggal(dateVal) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTanggalPengumuman(str) {
  if (!str) return null;
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  if (str instanceof Date) {
    return `${str.getDate()} ${bulan[str.getMonth()]} ${str.getFullYear()}`;
  }
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,mo,d] = s.split('-').map(Number);
    return `${d} ${bulan[mo-1]} ${y}`;
  }
  return s;
}

// Buat nama file arsip: data-smkn1-binjai-2026-04-30-19-30.json
function makeArchiveFileName(slug) {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
           + `-${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `data-${slug}-${ts}.json`;
}

// ─── Main ─────────────────────────────────────────
async function exportData() {
  console.log('━━━ EXPORT DATA ━━━━━━━━━━━━━━━━━━━━━━');
  const conn = await mysql.createConnection(DB);
  console.log('✓ Terhubung ke database:', DB.database);

  // 1. Ambil lembaga aktif (beserta integrity_secret)
  const [lembagaRows] = await conn.execute(
    'SELECT *, integrity_secret FROM lembaga WHERE aktif = 1 LIMIT 1'
  );
  if (lembagaRows.length === 0) {
    console.error('✗ Tidak ada lembaga aktif. Aktifkan dulu via dashboard.');
    await conn.end(); process.exit(1);
  }
  const lembaga = lembagaRows[0];
  const INTEGRITY_SECRET = lembaga.integrity_secret || 'kls-portal-integrity-2026';
  console.log(`✓ Lembaga aktif: ${lembaga.nama} [${lembaga.slug}]`);

  // 2. Meta Sekolah (pengaturan milik lembaga aktif)
  const [metaRows] = await conn.execute(
    'SELECT * FROM pengaturan WHERE lembaga_id = ? LIMIT 1',
    [lembaga.id]
  );
  if (metaRows.length === 0) {
    console.error('✗ Data pengaturan untuk lembaga ini belum ada.');
    await conn.end(); process.exit(1);
  }
  const m = metaRows[0];

  const generatedAt = new Date().toISOString();
  const meta = {
    // ─── Identitas Lembaga ───
    lembaga_id:         lembaga.id,
    lembaga_nama:       lembaga.nama,
    lembaga_slug:       lembaga.slug,
    generated_at:       generatedAt,
    // ─── Data Sekolah ───────
    sekolah:            m.sekolah,
    nss:                m.nss,
    npsn:               m.npsn,
    alamat:             m.alamat,
    kota:               m.kota || '',
    jenjang:            m.jenjang || 'SMA',
    kompetensi_keahlian:m.kompetensi_keahlian || '',
    kepala_sekolah:     m.kepala_sekolah,
    nip_kepsek:         m.nip_kepsek,
    tahun_ajaran:       m.tahun_ajaran,
    tanggal_pengumuman: m.tanggal_pengumuman || null,
    tanggal_pengumuman_display: m.tanggal_pengumuman ? formatTanggalPengumuman(m.tanggal_pengumuman) : null,
    tanggal_skl2:       m.tanggal_skl2 ? toDateString(m.tanggal_skl2) : null,
    tanggal_skl2_display: m.tanggal_skl2 ? formatTanggalPengumuman(m.tanggal_skl2) : null,
    nomor_surat_suffix: m.nomor_surat_suffix || '',
    telepon:            m.telepon || '',
    email:              m.email   || '',
    domain:             m.domain  || '',
    logo:               m.logo    || null,
    stempel:            m.stempel || null,
    ttd:                m.ttd     || null,
    kop_surat:          m.kop_surat || null,
  };

  // Tambahkan integrity hash (dengan secret per-lembaga)
  meta._integrity = computeIntegrity(meta, INTEGRITY_SECRET);
  console.log(`✓ Meta: ${meta.sekolah} (${meta.tahun_ajaran})`);
  console.log(`✓ Secret   : ${INTEGRITY_SECRET}`);
  console.log(`✓ Integrity: ${meta._integrity.slice(0, 16)}...`);


  // 3. Data Siswa milik lembaga aktif
  const [siswaRows] = await conn.execute(
    `SELECT id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, status
     FROM siswa WHERE lembaga_id = ? ORDER BY nama ASC`,
    [lembaga.id]
  );
  console.log(`✓ Ditemukan ${siswaRows.length} siswa.`);

  const siswaObj = {};
  let lulus = 0, tidakLulus = 0;

  for (const s of siswaRows) {
    const [nilaiRows] = await conn.execute(
      'SELECT mapel, nilai FROM nilai WHERE siswa_id = ? ORDER BY urutan ASC, mapel ASC',
      [s.id]
    );
    const nilaiArr = nilaiRows.map(n => ({ mapel: n.mapel, nilai: parseFloat(n.nilai) }));
    const rataRata = nilaiArr.length
      ? parseFloat((nilaiArr.reduce((sum, n) => sum + n.nilai, 0) / nilaiArr.length).toFixed(2))
      : 0;

    const key = sha256(s.nisn.toString().trim());
    siswaObj[key] = {
      nisn:         s.nisn.toString(),
      nisn_display: maskNISN(s.nisn.toString()),
      nama:         s.nama,
      kelas:        s.kelas,
      kompetensi_keahlian: s.kompetensi_keahlian || '',
      jenis_kelamin:s.jenis_kelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir:formatTanggal(s.tanggal_lahir),
      status:       s.status,
      nilai:        nilaiArr,
      rata_rata:    rataRata,
    };
    if (s.status === 'LULUS') lulus++; else tidakLulus++;
  }

  // 4. Simpan ke public/data.json (file aktif)
  const output   = { _meta: meta, siswa: siswaObj };
  const jsonStr  = JSON.stringify(output, null, 2);
  const outPath  = path.join(process.cwd(), 'public', 'data.json');
  await fs.writeFile(outPath, jsonStr, 'utf-8');

  // 4b. Tulis bundle-config.js dengan secret per-lembaga
  const bundleConfigPath = path.join(process.cwd(), 'public', 'bundle-config.js');
  const bundleConfigContent =
    `/* AUTO-GENERATED — DO NOT EDIT */\n` +
    `/* Bundle: ${lembaga.slug} */\n` +
    `window.BUNDLE_SECRET = '${INTEGRITY_SECRET}';\n`;
  await fs.writeFile(bundleConfigPath, bundleConfigContent, 'utf-8');
  console.log(`✓ bundle-config.js ditulis untuk ${lembaga.slug}`);

  // 5. Simpan arsip ke public/exports/
  const exportsDir = path.join(process.cwd(), 'public', 'exports');
  await fs.mkdir(exportsDir, { recursive: true });
  const archiveName = makeArchiveFileName(lembaga.slug);
  const archivePath = path.join(exportsDir, archiveName);
  await fs.writeFile(archivePath, jsonStr, 'utf-8');

  // 6. Catat ke json_history
  await conn.execute(
    `INSERT INTO json_history (id, lembaga_id, lembaga_nama, lembaga_slug, file_name, jumlah_siswa, lulus, tidak_lulus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), lembaga.id, lembaga.nama, lembaga.slug, archiveName, siswaRows.length, lulus, tidakLulus]
  );

  // 7. ── Retention Policy: simpan max 5 arsip per lembaga ─────────────────
  //    Hapus entri lama (file_name IS NOT NULL) jika > 5
  const [histRows] = await conn.execute(
    `SELECT id, file_name FROM json_history
     WHERE lembaga_id = ? AND file_name IS NOT NULL
     ORDER BY generated_at DESC`,
    [lembaga.id]
  );
  if (histRows.length > 5) {
    const toDelete = histRows.slice(5); // entri ke-6 dst
    for (const row of toDelete) {
      // Hapus file fisik
      const filePath = path.join(process.cwd(), 'public', 'exports', row.file_name);
      try { await fs.unlink(filePath); console.log(`  ✓ Hapus arsip lama: ${row.file_name}`); }
      catch (e) { /* file mungkin sudah tidak ada */ }
      // Hapus record DB
      await conn.execute('DELETE FROM json_history WHERE id = ?', [row.id]);
    }
    console.log(`  ✓ Cleanup: ${toDelete.length} arsip lama dihapus (retensi max 5).`);
  }

  await conn.end();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Export selesai!');
  console.log(`  Lembaga  : ${lembaga.nama}`);
  console.log(`  Total    : ${siswaRows.length} siswa`);
  console.log(`  Lulus    : ${lulus}`);
  console.log(`  Tdk Lulus: ${tidakLulus}`);
  console.log(`  Aktif    : ${outPath}`);
  console.log(`  Arsip    : public/exports/${archiveName}`);
  console.log('\nJalankan "npm run build" untuk generate file statis.\n');
}

exportData().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });

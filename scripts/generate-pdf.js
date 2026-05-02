/**
 * scripts/generate-pdf.js
 * Generate semua PDF SKL dari database menggunakan Puppeteer (headless Chrome).
 * Jalankan: npm run generate-pdf
 *
 * Output: public/pdf/skl-{nisn_hash}.pdf
 * Juga mengupdate public/data.json dengan field pdf_path per siswa.
 */
import puppeteer from 'puppeteer';
import mysql     from 'mysql2/promise';
import fs        from 'fs/promises';
import crypto    from 'crypto';
import path      from 'path';

// ─── Konfigurasi ─────────────────────────────────────────────────────────────
const DB = {
  host:     'localhost',
  user:     'root',
  password: '@demo1234',
  database: 'db_kelulusan',
};
const OUT_DIR   = path.join(process.cwd(), 'public', 'pdf');
const DATA_JSON = path.join(process.cwd(), 'public', 'data.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sha256   = str => crypto.createHash('sha256').update(str).digest('hex');
const maskNISN = n   => (!n || n.length < 6) ? n : n.slice(0,3) + '****' + n.slice(-3);

function formatTanggal(dateVal) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── SKL HTML Template ───────────────────────────────────────────────────────
function buildSklHtml(siswa, meta, nilai) {
  const rataRata = nilai.length
    ? (nilai.reduce((s,n) => s + parseFloat(n.nilai), 0) / nilai.length).toFixed(1)
    : '-';

  const logoHtml = meta.logo
    ? `<img src="${meta.logo}" style="height:80px;width:80px;object-fit:contain;" />`
    : `<div style="width:80px;height:80px;border:2px solid #333;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;">LOGO</div>`;

  const nilaiRows = nilai.map((n,i) => `
    <tr>
      <td style="border:1px solid #bbb;padding:4px 8px;text-align:center;">${i+1}</td>
      <td style="border:1px solid #bbb;padding:4px 8px;">${n.mapel}</td>
      <td style="border:1px solid #bbb;padding:4px 8px;text-align:center;font-weight:bold;">${parseFloat(n.nilai).toFixed(0)}</td>
    </tr>`).join('');

  const stempelHtml = meta.stempel
    ? `<img src="${meta.stempel}" style="position:absolute;top:-30px;left:-20px;width:120px;height:120px;object-fit:contain;opacity:0.7;" />`
    : '';

  const ttdHtml = meta.ttd
    ? `<img src="${meta.ttd}" style="height:60px;margin-bottom:4px;display:block;" />`
    : `<div style="height:60px;"></div>`;

  const isLulus = siswa.status === 'LULUS';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; background:#fff; color:#1a1a1a; width:794px; min-height:1123px; padding:25px 55px 35px; }
  .header { display:flex; align-items:center; gap:20px; border-bottom:4px double #333; padding-bottom:14px; margin-bottom:18px; }
  .header-text { flex:1; text-align:center; }
  .header-text h1 { font-size:16px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; }
  .header-text h2 { font-size:22px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; margin:4px 0; }
  .header-text p  { font-size:13px; }
  .title-skl { text-align:center; margin:18px 0 30px; }
  .title-skl h3 { font-size:18px; font-weight:bold; text-transform:uppercase; text-decoration:underline; letter-spacing:2px; }
  .title-skl p  { font-size:14px; }
  .body-text { font-size:15px; line-height:1.8; margin:14px 0; }
  .data-siswa { border-collapse:collapse; width:100%; margin:10px 0; font-size:15px; line-height:1.8; }
  .data-siswa td { padding:5px 0; vertical-align:top; }
  .data-siswa td:nth-child(2) { width:15px; text-align:center; }
  .nilai-table { border-collapse:collapse; width:100%; margin:14px 0; font-size:14px; }
  .nilai-table th { border:1px solid #bbb; padding:5px 8px; background:#f0f0f0; text-align:center; }
  .status-box { text-align:center; margin:20px 0; }
  .status-badge { display:inline-block; font-size:20px; font-weight:bold; border:2.5px solid #333; padding:8px 50px; letter-spacing:3px; ${isLulus ? 'color:#166534;border-color:#166534;' : 'color:#991b1b;border-color:#991b1b;'} }
  .ttd-area { display:flex; justify-content:flex-end; margin-top:40px; }
  .ttd-box { text-align:center; position:relative; min-width:200px; }
  .footer-note { font-size:12px; color:#555; text-align:center; margin-top:30px; border-top:1px solid #ddd; padding-top:8px; }
</style>
</head>
<body>
  <!-- KOP SURAT -->
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h2>${meta.sekolah}</h2>
      <p style="margin-top:4px; font-weight:600;">NSS: ${meta.nss || '-'} | NPSN: ${meta.npsn || '-'}</p>
      <p>${meta.alamat}</p>
      <p style="margin-top:2px;">Telp: ${meta.telepon || '-'} | Email: ${meta.email || '-'}</p>
    </div>
    <div style="width:80px;height:80px;flex-shrink:0;"></div>
  </div>

  <!-- JUDUL -->
  <div class="title-skl">
    <h3>Surat Keterangan Lulus</h3>
    <p>Nomor: ____/____/${new Date().getFullYear()}</p>
  </div>

  <!-- KALIMAT PEMBUKA -->
  <p class="body-text">
    Yang bertanda tangan di bawah ini, Kepala <strong>${meta.sekolah}</strong>,
    menerangkan bahwa peserta didik yang tersebut di bawah ini:
  </p>

  <!-- DATA SISWA -->
  <table class="data-siswa">
    <tr><td>Nama Lengkap</td><td>:</td><td><strong>${siswa.nama}</strong></td></tr>
    <tr><td>NISN</td><td>:</td><td>${siswa.nisn || '-'}</td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir}, ${formatTanggal(siswa.tanggal_lahir)}</td></tr>
    <tr><td>Kelas</td><td>:</td><td>${siswa.kelas}</td></tr>
    ${(meta.jenjang || '').toUpperCase() === 'SMK' && siswa.kompetensi_keahlian ? `<tr><td>Kompetensi Keahlian</td><td>:</td><td>${siswa.kompetensi_keahlian}</td></tr>` : ''}
    <tr><td>Tahun Pelajaran</td><td>:</td><td>${meta.tahun_ajaran}</td></tr>
  </table>

  <!-- PERNYATAAN -->
  <p class="body-text">
    Telah <strong>${isLulus ? 'LULUS' : 'TIDAK LULUS'}</strong> mengikuti Ujian
    ${meta.tahun_ajaran ? 'Tahun Pelajaran ' + meta.tahun_ajaran : ''} dengan hasil sebagai berikut:
  </p>

  <!-- TABEL NILAI -->
  ${nilai.length > 0 ? `
  <table class="nilai-table">
    <thead>
      <tr>
        <th style="width:40px;">No</th>
        <th>Mata Pelajaran</th>
        <th style="width:80px;">Nilai</th>
      </tr>
    </thead>
    <tbody>
      ${nilaiRows}
      <tr>
        <td colspan="2" style="border:1px solid #bbb;padding:5px 8px;text-align:right;font-weight:bold;">Rata-Rata</td>
        <td style="border:1px solid #bbb;padding:5px 8px;text-align:center;font-weight:bold;">${rataRata}</td>
      </tr>
    </tbody>
  </table>` : ''}

  <!-- STATUS BADGE -->
  <div class="status-box">
    <span class="status-badge">${siswa.status}</span>
  </div>

  <p class="body-text" style="margin-top:40px;">Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya dan hanya berlaku sampai diterbitkan Ijazah Asli tahun ajaran ${meta.tahun_ajaran || '-'}</p>

  <!-- TTD -->
  <div class="ttd-area">
    <div class="ttd-box">
      ${stempelHtml}
      <p style="font-size:14px;">${meta.kota || (meta.alamat ? meta.alamat.split(',')[0] : '........')}, ${meta.tanggal_pengumuman || formatTanggal(new Date())}</p>
      <p style="font-size:14px;">Kepala Sekolah,</p>
      ${ttdHtml}
      <p style="font-size:15px;font-weight:bold;border-top:1px solid #333;padding-top:4px;">${meta.kepala_sekolah}</p>
      ${meta.jabatan_kepsek ? `<p style="font-size:13px;font-weight:600;">${meta.jabatan_kepsek}</p>` : ''}
      ${meta.id_kepsek_mode === 'nuptk'
        ? (meta.nuptk_kepsek ? `<p style="font-size:13px;">NUPTK. ${meta.nuptk_kepsek}</p>` : '')
        : (meta.nip_kepsek   ? `<p style="font-size:13px;">NIP. ${meta.nip_kepsek}</p>`      : '')}
    </div>
  </div>

  <!-- FOOTER -->
  <p class="footer-note">
    Surat Keterangan Lulus ini diterbitkan secara resmi dan dapat diverifikasi melalui portal sekolah.
  </p>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function generateAllPdf() {
  console.log('━━━ GENERATE PDF SKL ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Pastikan folder output ada
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Koneksi DB
  const conn = await mysql.createConnection(DB);
  console.log('✓ Terhubung ke database:', DB.database);

  // Ambil pengaturan (meta sekolah + gambar)
  const [metaRows] = await conn.execute('SELECT * FROM pengaturan LIMIT 1');
  if (!metaRows.length) { console.error('✗ Tabel pengaturan kosong.'); process.exit(1); }
  const meta = metaRows[0];
  console.log(`✓ Sekolah: ${meta.sekolah}`);
  console.log(`  Logo    : ${meta.logo    ? '✓ Ada' : '✗ Kosong (akan pakai placeholder)'}`);
  console.log(`  Stempel : ${meta.stempel ? '✓ Ada' : '✗ Kosong'}`);
  console.log(`  TTD     : ${meta.ttd     ? '✓ Ada' : '✗ Kosong'}`);

  // Ambil semua siswa
  const [siswaRows] = await conn.execute(
    'SELECT id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, status FROM siswa ORDER BY nama ASC'
  );
  console.log(`✓ Total siswa: ${siswaRows.length}`);

  // Launch Puppeteer
  console.log('\n⏳ Memulai Puppeteer (headless Chrome)...');
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123 });

  // Baca data.json lama untuk update
  let dataJson = { _meta: {}, siswa: {} };
  try { dataJson = JSON.parse(await fs.readFile(DATA_JSON, 'utf-8')); } catch(e) {}

  let ok = 0, fail = 0;
  const total = siswaRows.length;

  for (const s of siswaRows) {
    const nisnStr = s.nisn.toString().trim();
    const hash    = sha256(nisnStr);
    const outFile = path.join(OUT_DIR, `skl-${hash}.pdf`);
    const pdfPath = `/pdf/skl-${hash}.pdf`;

    try {
      // Ambil nilai siswa
      const [nilaiRows] = await conn.execute(
        'SELECT mapel, nilai FROM nilai WHERE siswa_id = ? ORDER BY urutan ASC, mapel ASC',
        [s.id]
      );

      // Build HTML
      const html = buildSklHtml(s, meta, nilaiRows);

      // Render & export PDF
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.pdf({
        path:   outFile,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      // Update data.json entry
      if (dataJson.siswa[hash]) {
        dataJson.siswa[hash].pdf_path = pdfPath;
      }

      ok++;
      process.stdout.write(`\r  [${ok+fail}/${total}] ✓ ${s.nama.padEnd(30)}`);
    } catch(e) {
      fail++;
      console.error(`\n  ✗ Gagal ${s.nama}: ${e.message}`);
    }
  }

  await browser.close();
  await conn.end();

  // Simpan data.json yang sudah diupdate
  await fs.writeFile(DATA_JSON, JSON.stringify(dataJson, null, 2), 'utf-8');

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ Selesai! ${ok} PDF berhasil, ${fail} gagal.`);
  console.log(`  Output : ${OUT_DIR}`);
  console.log(`  JSON   : ${DATA_JSON} (diperbarui dengan pdf_path)`);
  if (ok > 0) {
    console.log(`\n📋 Langkah selanjutnya:`);
    console.log(`   1. npm run build   → build Astro static`);
    console.log(`   2. Deploy seluruh /dist ke hosting\n`);
  }
}

generateAllPdf().catch(e => { console.error('\n✗ Fatal:', e.message); process.exit(1); });

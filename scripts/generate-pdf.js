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

// ─── Nilai Table Builder (Format Kemdikbud) ──────────────────────────────────
function buildNilaiTable(nilaiArr, isSmk, rataRata) {
  if (!nilaiArr || !nilaiArr.length) return '<p style="font-style:italic;font-size:12px;">Belum ada data nilai.</p>';
  let counter = 0;
  const row = (mapel, val) => {
    counter++;
    const v = (val !== undefined && val !== null && val !== '') ? Math.round(val) : '';
    return `<tr><td class="n-no">${counter}.</td><td>${mapel}</td><td class="n-val">${v}</td></tr>`;
  };
  const cat = (label) => `<tr class="n-cat"><td class="n-no"></td><td colspan="2"><strong>${label}</strong></td></tr>`;
  const find = (kw) => { const f = nilaiArr.find(n => n.mapel.toLowerCase().includes(kw)); return f ? f.nilai : ''; };
  const findAny = (kws) => { for (const kw of kws) { const f = nilaiArr.find(n => n.mapel.toLowerCase().includes(kw)); if (f) return f.nilai; } return ''; };

  let rows = '';
  if (isSmk) {
    rows += cat('Mata Pelajaran Umum');
    rows += row('Pendidikan Agama dan Budi Pekerti', findAny(['agama','budi pekerti']));
    rows += row('Pendidikan Pancasila', findAny(['pancasila','pkn','kewarganegaraan']));
    rows += row('Bahasa Indonesia', find('bahasa indonesia'));
    rows += row('Pendidikan Jasmani, Olahraga dan Kesehatan', findAny(['jasmani','olahraga','penjas','pjok']));
    rows += row('Sejarah', find('sejarah'));
    rows += row('Seni dan Budaya', findAny(['seni','budaya']));
    rows += cat('Mata Pelajaran Kejuruan');
    rows += row('Matematika', find('matematika'));
    rows += row('Bahasa Inggris', find('bahasa inggris'));
    rows += row('Informatika', find('informatika'));
    rows += row('Projek Ilmu Pengetahuan Alam dan Sosial', findAny(['projek ilmu','ipas','p5']));
    rows += row('Dasar-dasar Program Keahlian', findAny(['dasar-dasar','dasar program']));
    rows += row('Konsentrasi Keahlian', findAny(['konsentrasi keahlian']));
    rows += row('Projek Kreativitas, Inovasi dan Kewirausahaan', findAny(['kreativitas','kewirausahaan','projek kreativitas','pkwu']));
    rows += row('Praktik Kerja Lapangan', findAny(['praktik kerja','pkl']));
    const smkUsed = ['agama','budi pekerti','pancasila','pkn','kewarganegaraan','bahasa indonesia','jasmani','olahraga','penjas','pjok','sejarah','seni','budaya','matematika','bahasa inggris','informatika','projek ilmu','ipas','p5','dasar-dasar','dasar program','konsentrasi keahlian','kreativitas','kewirausahaan','projek kreativitas','pkwu','praktik kerja','pkl'];
    const extra = nilaiArr.filter(n => !smkUsed.some(kw => n.mapel.toLowerCase().includes(kw)));
    rows += cat('Mata Pelajaran Pilihan');
    if (extra.length) extra.forEach(p => { rows += row(p.mapel, p.nilai); });
    else rows += row('-', '');
    rows += cat('Muatan Lokal');
    rows += row('-', '');
  } else {
    rows += cat('Mata Pelajaran Wajib');
    rows += row('Pendidikan Agama ... Dan Budi Pekerti', findAny(['agama','budi pekerti']));
    rows += row('Pendidikan Pancasila', findAny(['pancasila','pkn','kewarganegaraan']));
    rows += row('Bahasa Indonesia', find('bahasa indonesia'));
    rows += row('Matematika', find('matematika'));
    rows += row('Ilmu Pengetahuan Alam: Fisika, Kimia, Biologi', findAny(['ipa','fisika','kimia','biologi','ilmu pengetahuan alam']));
    rows += row('Ilmu Pengetahuan Sosial: Sosiologi, Ekonomi, Sejarah, Geografi', findAny(['ips','sosiologi','ekonomi','geografi','ilmu pengetahuan sosial']));
    rows += row('Bahasa Inggris', find('bahasa inggris'));
    rows += row('Pendidikan Jasmani Olahraga dan Kesehatan', findAny(['jasmani','olahraga','penjas','pjok']));
    rows += row('Informatika', find('informatika'));
    rows += row('Sejarah', find('sejarah'));
    rows += row('Seni, Budaya dan Prakarya', findAny(['seni','budaya','prakarya']));
    const smaUsed = ['agama','budi pekerti','pancasila','pkn','kewarganegaraan','bahasa indonesia','matematika','ipa','fisika','kimia','biologi','ilmu pengetahuan alam','ips','sosiologi','ekonomi','geografi','ilmu pengetahuan sosial','bahasa inggris','jasmani','olahraga','penjas','pjok','informatika','sejarah','seni','budaya','prakarya'];
    const smaPilihan = nilaiArr.filter(n => !smaUsed.some(kw => n.mapel.toLowerCase().includes(kw)));
    rows += cat('Mata Pelajaran Pilihan');
    if (smaPilihan.length) {
      smaPilihan.forEach(p => { rows += row(p.mapel, p.nilai); });
      for (let i = 0; i < 5 - smaPilihan.length; i++) rows += row('Ditulis 4 atau 5 mapel pilihan', '');
    } else {
      for (let i = 0; i < 5; i++) rows += row('Ditulis 4 atau 5 mapel pilihan', '');
    }
    rows += cat('Muatan Lokal');
    rows += row('-', '');
  }
  rows += `<tr><td class="n-no"></td><td style="text-align:center;"><strong><em>Rata-rata</em></strong></td><td class="n-val"><strong>${rataRata}</strong></td></tr>`;
  return `<table class="nilai-kemdikbud"><thead><tr><th style="width:30px;">No.</th><th>Mata Pelajaran</th><th style="width:60px;">Nilai</th></tr></thead><tbody>${rows}</tbody></table>`;
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
  const jenjang = (meta.jenjang||'').toUpperCase();
  const isSmk = jenjang === 'SMK';
  const isSmaOrMa = ['SMA','MA'].includes(jenjang);
  const _kotaRaw = (meta.kota || '').trim();
  const kotaLabel = _kotaRaw
    ? (_kotaRaw.startsWith('Kab. ') ? 'Kabupaten ' + _kotaRaw.slice(5) : 'Kota ' + _kotaRaw)
    : 'Kota/Kabupaten*) ........';
  const kompetensiKeahlian = (siswa.kompetensi_keahlian||'').trim();
  const konsentrasiKeahlian = (siswa.konsentrasi_keahlian||'').trim();
  let kompetensiRow = '';
  if (isSmk) {
    kompetensiRow = `<tr><td>Kompetensi Keahlian</td><td>:</td><td>${kompetensiKeahlian||'-'}</td></tr>`;
    if (konsentrasiKeahlian) kompetensiRow += `\n    <tr><td>Konsentrasi Keahlian</td><td>:</td><td>${konsentrasiKeahlian}</td></tr>`;
  } else if (isSmaOrMa && kompetensiKeahlian) {
    kompetensiRow = `<tr><td>Peminatan</td><td>:</td><td>${kompetensiKeahlian}</td></tr>`;
    if (konsentrasiKeahlian) kompetensiRow += `\n    <tr><td>Konsentrasi Keahlian</td><td>:</td><td>${konsentrasiKeahlian}</td></tr>`;
  } else if (konsentrasiKeahlian) {
    kompetensiRow = `<tr><td>Konsentrasi Keahlian</td><td>:</td><td>${konsentrasiKeahlian}</td></tr>`;
  }
  const jenisKelaminDisplay = (siswa.jenis_kelamin||'L')==='P' ? 'Perempuan' : 'Laki-laki';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; background:#fff; color:#1a1a1a;
    width:210mm; padding:0; }
  @page { size:210mm 297mm; margin:8mm 10mm 8mm 18mm; }
  /* ── Kop ── */
  .header { display:flex; align-items:center; gap:16px; border-bottom:4px double #333; padding-bottom:10px; margin-bottom:12px; }
  .header-text { flex:1; text-align:center; }
  .header-text h2 { font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; margin:3px 0; }
  .header-text p { font-size:12px; line-height:1.4; }
  /* ── Judul ── */
  .title-skl { text-align:center; margin:10px 0 14px; }
  .title-skl h3 { font-size:16px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; }
  .title-skl p { font-size:12px; margin-top:2px; }
  /* ── Body ── */
  .body-text { font-size:13px; line-height:1.5; margin:6px 0; }
  .data-siswa { border-collapse:collapse; width:100%; margin:5px 0 5px 30px; font-size:13px; line-height:1.5; }
  .data-siswa td { padding:1px 0; vertical-align:top; }
  .data-siswa td:first-child { width:200px; }
  .data-siswa td:nth-child(2) { width:14px; text-align:center; }
  /* ── Status badge ── */
  .status-box { text-align:center; margin:10px 0; }
  .status-badge { display:inline-block; font-size:16px; font-weight:bold; border:2.5px solid #333; padding:5px 40px; letter-spacing:3px; ${isLulus ? 'color:#166534;border-color:#166534;' : 'color:#991b1b;border-color:#991b1b;'} }
  /* ── Tabel Nilai format Kemdikbud ── */
  .nilai-kemdikbud { border-collapse:collapse; width:100%; font-size:12px; margin:15px 0; font-family:Arial,sans-serif; }
  .nilai-kemdikbud th { border:1px solid #555; padding:4px 6px; background:#e8e8e8; font-weight:bold; text-align:center; }
  .nilai-kemdikbud td { border:1px solid #555; padding:2px 5px; vertical-align:top; }
  .nilai-kemdikbud .n-no { width:30px; text-align:center; }
  .nilai-kemdikbud .n-val { width:60px; text-align:center; font-weight:bold; }
  .nilai-kemdikbud .n-cat td { font-weight:bold; background:#f5f5f5; }
  /* ── Halaman 2 ── */
  .skl2-p2 { page-break-before:always; }
  .p2-kop { display:flex; align-items:center; gap:16px; border-bottom:4px double #333; padding-bottom:10px; margin-bottom:20px; }
  .ttd-wrap { display:flex; justify-content:flex-end; align-items:flex-end; margin-top:20px; gap: 50px; }
  .foto-box { width:90px; height:120px; border:2px dashed #cbd5e1; background-color:#f8fafc; display:flex; align-items:center; justify-content:center; font-size:12px; font-family:'Times New Roman',serif; color:#94a3b8; }
  .ttd-box { text-align:center; position:relative; min-width:200px; }
</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h2>${meta.sekolah}</h2>
      <p style="font-weight:600;">NPSN: ${meta.npsn||'-'} | NSS: ${meta.nss||'-'}</p>
      <p>${meta.alamat||''}</p>
      ${(meta.kota||meta.provinsi)?`<p>Kab./Kota ${meta.kota||'-'}, Prov. ${meta.provinsi||'-'}</p>`:''}
      <p>Telp: ${meta.telepon||'-'} | Email: ${meta.email||'-'}</p>
    </div>
    <div style="width:80px;height:80px;flex-shrink:0;"></div>
  </div>

  <div class="title-skl">
    <h3>Surat Keterangan Lulus</h3>
    <p>Nomor: ${meta.nomor_surat_statis || `400.3.11.1/...`}</p>
  </div>

  <p class="body-text">Yang bertanda tangan di bawah ini, Kepala <strong>${meta.sekolah}</strong> ${kotaLabel}, Provinsi ${meta.provinsi||'........'} menerangkan bahwa:</p>

  <table class="data-siswa">
    <tr><td>Satuan Pendidikan</td><td>:</td><td>${meta.sekolah}</td></tr>
    <tr><td>Nomor Pokok Satuan Pendidikan</td><td>:</td><td>${meta.npsn||'-'}</td></tr>
    <tr><td>Nama Lengkap</td><td>:</td><td><strong>${siswa.nama}</strong></td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir||'-'}, ${formatTanggal(siswa.tanggal_lahir)}</td></tr>
    <tr><td>Nomor Induk Siswa Nasional</td><td>:</td><td>${siswa.nisn||'-'}</td></tr>
    <tr><td>Nomor Ijazah</td><td>:</td><td>-</td></tr>
    <tr><td>Tanggal Kelulusan</td><td>:</td><td>${formatTanggal(meta.tanggal_skl2||meta.tanggal_pengumuman||new Date())}</td></tr>
    <tr><td>Kurikulum</td><td>:</td><td>${meta.kurikulum||'Kurikulum Merdeka'}</td></tr>
    ${kompetensiRow}
  </table>

  <div class="status-box"><span class="status-badge">${siswa.status||'LULUS'}</span></div>

  <p class="body-text">Dinyatakan <strong>${siswa.status||'LULUS'}</strong> dari Satuan Pendidikan berdasarkan kriteria kelulusan ${meta.sekolah} Kota/Kabupaten*) ${meta.kota||'...'} Tahun Ajaran ${meta.tahun_ajaran||'-'}, dengan nilai sebagai berikut :</p>

  ${buildNilaiTable(nilai, isSmk, rataRata)}

  <!-- ── Halaman 2: TTD ── -->
  <div class="skl2-p2">
    <div class="p2-kop">
      ${logoHtml}
      <div class="header-text">
        <h2>${meta.sekolah}</h2>
        <p style="font-weight:600;">NPSN: ${meta.npsn||'-'} | NSS: ${meta.nss||'-'}</p>
        <p>${meta.alamat||''}</p>
        ${(meta.kota||meta.provinsi)?`<p>Kab./Kota ${meta.kota||'-'}, Prov. ${meta.provinsi||'-'}</p>`:''}
      </div>
      <div style="width:80px;height:80px;flex-shrink:0;"></div>
    </div>

    <p class="body-text">Surat Keterangan Lulus ini berlaku sementara sampai dengan diterbitkannya Ijazah Tahun Ajaran ${meta.tahun_ajaran||'-'}, untuk menjadikan maklum bagi yang berkepentingan.</p>

    <div class="ttd-wrap">
      <div class="foto-box">Foto 3x4</div>
      <div class="ttd-box">
        ${stempelHtml}
        <p style="font-size:13px;">${(meta.kota||'').trim()||'........'}, ${formatTanggal(meta.tanggal_skl2||meta.tanggal_pengumuman||new Date())}</p>
        <p style="font-size:13px;">Kepala ${jenjang||'Sekolah'} ${meta.sekolah||''}</p>
        ${ttdHtml}
        <p style="font-size:14px;font-weight:bold;border-top:1px solid #333;padding-top:3px;">${meta.kepala_sekolah||'Kepala Sekolah'}</p>
        ${meta.jabatan_kepsek?`<p style="font-size:12px;font-weight:600;">${meta.jabatan_kepsek}</p>`:''}
        ${meta.id_kepsek_mode==='nuptk'
          ?(meta.nuptk_kepsek?`<p style="font-size:12px;">NUPTK. ${meta.nuptk_kepsek}</p>`:'')
          :(meta.nip_kepsek  ?`<p style="font-size:12px;">NIP. ${meta.nip_kepsek}</p>`:'' )}
      </div>
    </div>
    <p style="font-size:10px;color:#555;margin-top:12px;">Keterangan:<br>*) Pilih Salah Satu</p>
  </div>
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
    'SELECT id, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, kelas, kompetensi_keahlian, konsentrasi_keahlian, status FROM siswa ORDER BY nama ASC'
  );
  console.log(`✓ Total siswa: ${siswaRows.length}`);

  // Launch Puppeteer
  console.log('\n⏳ Memulai Puppeteer (headless Chrome)...');
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewport({ width: 794, height: 1247 });

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
        width: '210mm',
        height: '330mm',
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

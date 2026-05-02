const $ = id => document.getElementById(id);
let auth=null,allSiswa=[],allData=null,currentView='overview',importedRows=[];

// ─── HTML Escape Helper ───────────────────────────────────────────────────
function escHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── Date Helpers ─────────────────────────────────────────────
// Bulan Indonesia untuk parsing & display
const BULAN_ID=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// Parsing berbagai format: 'YYYY-MM-DD', '30 April 2026', '30-04-2026'
function parseTgl(str){
  if(!str)return null;
  // ISO format YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(str.trim())){
    const [y,m,d]=str.trim().split('-').map(Number);
    return new Date(y,m-1,d);
  }
  // '30 April 2026'
  const m=str.trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if(m){
    const day=parseInt(m[1]),mon=BULAN_ID.findIndex(b=>b.toLowerCase()===m[2].toLowerCase()),yr=parseInt(m[3]);
    if(mon>=0)return new Date(yr,mon,day);
  }
  // Fallback
  const d=new Date(str);
  return isNaN(d)?null:d;
}

// Format Date → '30 April 2026'
function formatTglDisplay(str){
  const d=parseTgl(str);
  if(!d)return str;
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}
// ─────────────────────────────────────────────────────────────

function showToast(msg,type='info'){
  const t=document.createElement('div');
  const c={success:'bg-emerald-500',error:'bg-rose-500',info:'bg-indigo-500',warning:'bg-amber-500'};
  t.className=`fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl text-white text-sm font-bold shadow-2xl ${c[type]}`;
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3500);
}
function showConfirm(title,msg,onConfirm){
  const o=document.createElement('div');
  o.className='fixed inset-0 z-[998] flex items-center justify-center bg-black/70 backdrop-blur-sm';
  o.innerHTML=`<div class="bg-[#111827] border border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"><h3 class="text-white font-bold text-lg mb-2">${title}</h3><p class="text-slate-400 text-sm mb-6">${msg}</p><div class="flex gap-3 justify-end"><button id="cc" class="px-5 py-2 bg-slate-700 text-white rounded-xl text-sm font-bold">Batal</button><button id="co" class="px-5 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Lanjutkan</button></div></div>`;
  document.body.appendChild(o);
  o.querySelector('#cc').onclick=()=>o.remove();
  o.querySelector('#co').onclick=()=>{o.remove();onConfirm();};
}
function modalOpen(id){const m=$(id);m.classList.remove('hidden');m.classList.add('flex');}
function modalClose(id){const m=$(id);m.classList.add('hidden');m.classList.remove('flex');}

// Eye icons
const EYE_OPEN=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
const EYE_SHUT=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`;

function togglePw(inputId, eyeId){
  const inp=$(inputId), eye=$(eyeId);
  if(!inp||!eye) return;
  const show = inp.type==='password';
  inp.type = show ? 'text' : 'password';
  eye.innerHTML = show ? EYE_SHUT : EYE_OPEN;
}
window.togglePw = togglePw; // Pastikan tersedia di global scope untuk onclick inline

function previewImg(input, previewId, hintId){
  const file = input.files[0]; if(!file) return;
  if(file.size > 600*1024){ alert('File terlalu besar (maks 600KB)'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = $(previewId), hint = $(hintId);
    if(img){ img.src=e.target.result; img.classList.remove('hidden'); }
    if(hint) hint.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// ─── Drag & Drop Image Upload ────────────────────────────────────────────────
function _applyImgToZone(zone, dataUrl){
  const preview = $(zone.dataset.preview);
  const hint    = $(zone.dataset.hint);
  const clearBtn= $(zone.dataset.clear);
  if(preview){ preview.src=dataUrl; preview.classList.remove('hidden'); }
  if(hint)    hint.classList.add('hidden');
  if(clearBtn)clearBtn.classList.remove('hidden');
  zone.dataset.changed='true';
}

function _clearZone(zone){
  const preview = $(zone.dataset.preview);
  const hint    = $(zone.dataset.hint);
  const clearBtn= $(zone.dataset.clear);
  const input   = document.getElementById(zone.dataset.input);
  if(preview){ preview.src=''; preview.classList.add('hidden'); }
  if(hint)    hint.classList.remove('hidden');
  if(clearBtn)clearBtn.classList.add('hidden');
  if(input)   input.value='';
  zone.dataset.changed='clear';
}


// ─── WebP Converter (Canvas API) ─────────────────────────────────────────────
async function _convertToWebP(file, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      // Fill transparent background with white only for non-transparent zones
      ctx.drawImage(img, 0, 0);
      const webpUrl = canvas.toDataURL('image/webp', quality);
      resolve(webpUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Gagal memuat gambar')); };
    img.src = objectUrl;
  });
}

async function _handleImgFile(zone, file) {
  const MAX_RAW_MB = 3;
  if (file.size > MAX_RAW_MB * 1024 * 1024) {
    showToast(`File terlalu besar (maks ${MAX_RAW_MB}MB)`, 'error'); return;
  }
  if (!file.type.startsWith('image/')) {
    showToast('Hanya file gambar yang diizinkan', 'error'); return;
  }

  // Quality per zone: ttd/stempel (transparansi) = 0.92, kop_surat = 0.88, lainnya = 0.90
  const inputId = zone.dataset.input;
  const quality = (inputId === 'input-ttd' || inputId === 'input-stempel') ? 0.92
                : (inputId === 'input-kop_surat') ? 0.88
                : 0.90;

  try {
    const webpDataUrl = await _convertToWebP(file, quality);
    _applyImgToZone(zone, webpDataUrl);

    // Hitung perkiraan ukuran setelah konversi
    const approxKB = Math.round((webpDataUrl.length * 3) / 4 / 1024);
    const wasWebP = file.type === 'image/webp';
    if (!wasWebP) {
      showToast(`✓ Dikonversi ke WebP (≈${approxKB}KB)`, 'success');
    }
  } catch(err) {
    showToast('Gagal mengkonversi gambar: ' + err.message, 'error');
  }
}


let _ddzReady = false;
function initDragDrop(){
  if(_ddzReady) return; // sudah di-init, skip
  _ddzReady = true;
  document.querySelectorAll('.img-zone').forEach(zone=>{
    let dragDepth = 0; // track depth agar dragleave dari child tidak memicu reset

    // Click → open file picker (kecuali klik tombol clear)
    zone.addEventListener('click', e=>{
      if(e.target.closest('[data-clear-btn]')) return;
      document.getElementById(zone.dataset.input)?.click();
    });

    // File input change
    document.getElementById(zone.dataset.input)?.addEventListener('change', e=>{
      const file=e.target.files[0]; if(file) _handleImgFile(zone,file);
    });

    // Clear button
    document.getElementById(zone.dataset.clear)?.addEventListener('click', e=>{
      e.stopPropagation(); _clearZone(zone);
    });

    // Drag enter — naik counter, aktifkan highlight
    zone.addEventListener('dragenter', e=>{
      e.preventDefault(); dragDepth++;
      zone.classList.add('!border-indigo-400','bg-indigo-500/10','scale-[1.01]');
    });

    // Drag over — wajib preventDefault agar drop bisa terjadi
    zone.addEventListener('dragover', e=>{ e.preventDefault(); });

    // Drag leave — turunkan counter, hilangkan highlight hanya jika benar-benar keluar zone
    zone.addEventListener('dragleave', ()=>{
      if(--dragDepth <= 0){
        dragDepth = 0;
        zone.classList.remove('!border-indigo-400','bg-indigo-500/10','scale-[1.01]');
      }
    });

    // Drop
    zone.addEventListener('drop', e=>{
      e.preventDefault();
      dragDepth = 0;
      zone.classList.remove('!border-indigo-400','bg-indigo-500/10','scale-[1.01]');
      const file=e.dataTransfer.files[0]; if(file) _handleImgFile(zone,file);
    });
  });
}

// Pre-fill zona dengan gambar yang sudah ada di DB (tidak set data-changed)
function prefillZone(inputId, src){
  if(!src) return;
  const zone=document.querySelector(`.img-zone[data-input="${inputId}"]`);
  if(!zone) return;
  const preview=$(zone.dataset.preview), hint=$(zone.dataset.hint), clr=$(zone.dataset.clear);
  if(preview){ preview.src=src; preview.classList.remove('hidden'); }
  if(hint)    hint.classList.add('hidden');
  if(clr)     clr.classList.remove('hidden');
  // data-changed tetap 'false' — gambar lama, tidak perlu re-upload
}

// --- SKL Preview HTML Builder (browser-side, port of generate-pdf.js) ------
// type: 'skl1' = Tanpa Nilai (pengumuman), 'skl2' = Dengan Nilai (penerimaan)
function buildSklPreviewHtml(meta, siswaData, nilaiData, type='skl2') {
  const isSklNilai = (type !== 'skl1');
  const now = new Date();
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const fmt = d => { if(!d) return '-'; const dt=new Date(d); return `${dt.getDate()} ${bulan[dt.getMonth()]} ${dt.getFullYear()}`; };
  const maskNISN = n => n.slice(0,3)+'****'+n.slice(-3);

  const siswa = siswaData || { nama:'AHMAD FAUZAN MAULANA', nisn:'1234567890',
    tempat_lahir:'Bandung', tanggal_lahir:'2007-05-15', kelas:'XII IPA 1', status:'LULUS',
    kompetensi_keahlian: '' };
  const nilai = nilaiData && nilaiData.length ? nilaiData : [
    {mapel:'Pendidikan Agama dan Budi Pekerti',nilai:88},{mapel:'Pendidikan Pancasila dan Kewarganegaraan',nilai:84},
    {mapel:'Bahasa Indonesia',nilai:86},{mapel:'Matematika',nilai:78},
    {mapel:'Sejarah Indonesia',nilai:85},{mapel:'Bahasa Inggris',nilai:80},
    {mapel:'Seni Budaya',nilai:87},{mapel:'Pendidikan Jasmani, Olahraga, dan Kesehatan',nilai:82},
  ];
  const rataRata = (nilai.reduce((s,n)=>s+n.nilai,0)/nilai.length).toFixed(1);

  // Nomor surat: statis atau auto counter per siswa
  const sklNum = String(Math.floor(Math.random()*900+100)).padStart(3,'0');
  const nomorSurat = (meta.nomor_surat_mode === 'static' && meta.nomor_surat_statis)
    ? meta.nomor_surat_statis
    : (meta.nomor_surat_suffix
        ? `${sklNum}${meta.nomor_surat_suffix}`
        : `${sklNum}/${meta.npsn||'SKL'}/${now.getFullYear()}`);

  // SMK extra header line
  const isSmk = (meta.jenjang||'').toUpperCase() === 'SMK';
  const smkKompetensi = siswa.kompetensi_keahlian || '';
  const smkHeaderLine = isSmk && smkKompetensi
    ? `<p style="margin-top:3px; font-weight:700; color:#4f46e5;">Kompetensi Keahlian: ${smkKompetensi}</p>`
    : '';

  // SKL label: SKL1 tanpa nilai, SKL2 dengan nilai
  const sklTitle = isSklNilai ? 'SURAT KETERANGAN LULUS' : 'SURAT KETERANGAN LULUS';
  const tglPengumuman = isSklNilai
    ? (meta.tanggal_skl2 ? fmt(meta.tanggal_skl2) : fmt(now))
    : (meta.tanggal_pengumuman ? fmt(meta.tanggal_pengumuman) : fmt(now));

  // Kop Surat: gunakan sebagai full-width header jika tersedia
  const kopSuratEnabled = (meta.kop_surat && localStorage.getItem('asset_kop_surat_enabled') !== '0');
  const kopSuratHtml = kopSuratEnabled
    ? `<img src="${meta.kop_surat}" style="width:100%;max-height:130px;object-fit:contain;display:block;" />`
    : null;

  const logoHtml = (meta.logo && localStorage.getItem('asset_logo_enabled') !== '0')
    ? `<img src="${meta.logo}" style="height:90px;width:90px;object-fit:contain;" />`
    : `<div style="width:90px;height:90px;border:2px solid #ddd;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;background:#fafafa;">LOGO</div>`;

  const stempelHtml = (meta.stempel && localStorage.getItem('asset_stempel_enabled') !== '0')
    ? `<img src="${meta.stempel}" style="position:absolute;top:15px;left:-10px;width:140px;height:140px;object-fit:contain;opacity:0.6;pointer-events:none;" />`
    : '';

  const ttdHtml = (meta.ttd && localStorage.getItem('asset_ttd_enabled') !== '0')
    ? `<img src="${meta.ttd}" style="height:70px;margin:0 auto 4px auto;display:block;" />`
    : `<div style="height:70px;"></div>`;

  const nilaiRows = nilai.map((n,i)=>`
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px 10px;text-align:center;color:#666;font-size:11px;">${i+1}</td>
      <td style="padding:8px 10px;color:#333;">${n.mapel}</td>
      <td style="padding:8px 10px;text-align:center;font-weight:700;color:#111;">${Math.round(n.nilai)}</td>
    </tr>`).join('');

  // SKL1 (tanpa nilai) — simplified body
  const sklBody = isSklNilai ? `
    <p class="intro-text">Kepala <strong>${meta.sekolah||'Sekolah'}</strong> menerangkan bahwa berdasarkan hasil Rapat Pleno Dewan Guru tentang Penetapan Kelulusan Peserta Didik, dinyatakan bahwa:</p>
    <table class="student-data">
      <tr><td>Nama Lengkap</td><td>:</td><td>${siswa.nama}</td></tr>
      <tr><td>NISN</td><td>:</td><td>${siswa.nisn||'-'}</td></tr>
      <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir||'-'}, ${siswa.tanggal_lahir_display||fmt(siswa.tanggal_lahir)}</td></tr>
      <tr><td>Kelas</td><td>:</td><td>${siswa.kelas}</td></tr>
      ${isSmk && smkKompetensi ? `<tr><td>Kompetensi Keahlian</td><td>:</td><td>${smkKompetensi}</td></tr>` : ''}
      <tr><td>Tahun Pelajaran</td><td>:</td><td>${meta.tahun_ajaran||'-'}</td></tr>
    </table>
    <p class="intro-text">Dinyatakan <strong>${siswa.status||'LULUS'}</strong> dari satuan pendidikan dengan rincian nilai sebagai berikut:</p>
    <div class="scores-container">
      <table class="scores-table">
        <thead><tr>
          <th style="width:50px; text-align:center;">No</th>
          <th>Mata Pelajaran</th>
          <th style="width:100px; text-align:center;">Nilai</th>
        </tr></thead>
        <tbody>
          ${nilaiRows}
          <tr class="avg-row">
            <td colspan="2" style="text-align:right; padding-right:20px;">RATA-RATA NILAI</td>
            <td style="text-align:center; color:#0f172a;">${rataRata}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="result-status">
      <span class="badge ${siswa.status==='TIDAK LULUS'?'badge-tidak':'badge-lulus'}">${siswa.status||'LULUS'}</span>
    </div>
  ` : `
    <p class="intro-text">Kepala <strong>${meta.sekolah||'Sekolah'}</strong> menerangkan bahwa berdasarkan hasil Rapat Pleno Dewan Guru tentang Penetapan Kelulusan Peserta Didik, dinyatakan bahwa:</p>
    <table class="student-data">
      <tr><td>Nama Lengkap</td><td>:</td><td>${siswa.nama}</td></tr>
      <tr><td>NISN</td><td>:</td><td>${siswa.nisn||'-'}</td></tr>
      <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir||'-'}, ${siswa.tanggal_lahir_display||fmt(siswa.tanggal_lahir)}</td></tr>
      <tr><td>Kelas</td><td>:</td><td>${siswa.kelas}</td></tr>
      ${isSmk && smkKompetensi ? `<tr><td>Kompetensi Keahlian</td><td>:</td><td>${smkKompetensi}</td></tr>` : ''}
      <tr><td>Tahun Pelajaran</td><td>:</td><td>${meta.tahun_ajaran||'-'}</td></tr>
    </table>
    <div class="result-status" style="margin:30px 0 20px;">
      <span class="badge ${siswa.status==='TIDAK LULUS'?'badge-tidak':'badge-lulus'}">${siswa.status||'LULUS'}</span>
    </div>
    <p class="intro-text" style="text-align:center;">Yang bersangkutan dinyatakan <strong>${siswa.status||'LULUS'}</strong> dari satuan pendidikan ${meta.sekolah||''}.<br><em style="font-size:10px;color:#64748b;">Rincian nilai akan tercantum dalam SKL resmi yang diterbitkan pada tanggal ${meta.tanggal_skl2 ? fmt(meta.tanggal_skl2) : '...'}</em></p>
    <p class="intro-text" style="margin-top:20px;">Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya dan hanya berlaku sampai diterbitkan Ijazah Asli tahun ajaran ${meta.tahun_ajaran||'-'}</p>
  `;

  const kota = meta.kota || (meta.alamat ? (meta.alamat.split(',')[1] || meta.alamat.split(',')[0]).trim() : '........');

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>SKL-${siswa.nama.replace(/\s+/g,'_')}-${siswa.nisn || '0000000000'}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    overflow: hidden; /* Mencegah scrollbar redundan di dalam iframe */
  }
  body { 
    font-family:'Inter', sans-serif; 
    background:#f1f5f9; 
    color:#1e293b; 
    width: 794px; 
    min-height: 1123px; 
    padding:20px;
    display:flex;
    justify-content:center;
  }
  .page {
    background:#fff;
    width:100%;
    min-height: 1083px;
    padding:${isSklNilai ? '16px 36px 20px 56px' : '20px 40px 100px 60px'};
    position:relative;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    border: 1px solid #e2e8f0;
  }
  @media print {
    @page { size: A4; margin: 0 0 0 15mm; }
    body { padding: 0; background: #fff; width: 210mm; min-height: 297mm; display:block; overflow:visible; }
    .page { box-shadow: none; border: none; padding: ${isSklNilai ? '16px 36px 20px 56px' : '20px 40px 60px 60px'}; min-height: 297mm; display: block; position: static; overflow: visible; }
    .dummy-badge { display: none !important; }
    ${!isSklNilai ? '.page-break-section { page-break-before: always; padding-top: 20px; }' : ''}
    ${!isSklNilai ? '.page2-header { display: flex !important; }' : ''}
    ${!isSklNilai ? '.page2-footer { display: block !important; position: static; margin-top: 20px; }' : ''}
    .footer-note { position: fixed; bottom: 8px; left: 56px; right: 36px; margin: 0; padding: 6px 0 0; border-top: 1px solid #e2e8f0; background: transparent; font-size:10px; }
  }
  /* Watermark background logo */
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 100px;
    font-weight: 900;
    color: rgba(0,0,0,0.02);
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
  }
  .header { 
    display:flex; 
    align-items:center; 
    gap:20px; 
    border-bottom:3px solid #1e293b; 
    padding-bottom:10px; 
    margin-bottom:10px; 
    position: relative;
    z-index: 1;
  }
  .header-text { flex:1; text-align:center; }
  .header-text h1 { font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#64748b; margin-bottom:4px; }
  .header-text h2 { font-family:'Outfit', sans-serif; font-size:22px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#0f172a; margin-bottom:4px; }
  .header-text p  { font-size:12px; color:#475569; line-height:1.4; }
  
  .title-area { text-align:center; margin:${isSklNilai ? '6px 0 14px' : '10px 0 35px 0'}; position: relative; z-index: 1; }
  .title-area h3 { font-family:'Outfit', sans-serif; font-size:${isSklNilai ? '16px' : '18px'}; font-weight:800; text-transform:uppercase; color:#0f172a; letter-spacing:3px; }
  .title-area .line { width:150px; height:3px; background:#0f172a; margin:${isSklNilai ? '4px' : '6px'} auto; }
  .title-area p  { font-size:13px; font-weight:600; color:#64748b; margin-top:${isSklNilai ? '3px' : '5px'}; }
  
  .intro-text { font-size:${isSklNilai ? '13px' : '14px'}; line-height:${isSklNilai ? '1.4' : '1.5'}; margin:${isSklNilai ? '5px 0' : '8px 0'}; color:#334155; position: relative; z-index: 1; }
  
  .student-data { border-collapse:collapse; width:${isSklNilai ? 'calc(100% - 40px)' : 'calc(100% - 40px)'}; margin:${isSklNilai ? '4px 0 4px 40px' : '8px 0 8px 40px'}; font-size:${isSklNilai ? '13px' : '14px'}; line-height:${isSklNilai ? '1.3' : '1.4'}; position: relative; z-index: 1; }
  .student-data td { padding:${isSklNilai ? '1px 0' : '3px 0'}; vertical-align:top; }
  .student-data td:first-child { width:${isSklNilai ? '155px' : '165px'}; color:#64748b; font-weight:500; }
  .student-data td:nth-child(2) { width:20px; text-align:center; color:#94a3b8; }
  .student-data td:last-child { font-weight:700; color:#0f172a; }
  
  .scores-container { margin:${isSklNilai ? '6px 0 6px 40px' : '10px 0'}; width:${isSklNilai ? 'calc(100% - 40px)' : '100%'}; position: relative; z-index: 1; }
  .scores-table { border-collapse:collapse; width:100%; font-size:${isSklNilai ? '12px' : '13px'}; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .scores-table th { background:#f8fafc; color:#64748b; font-weight:700; text-transform:uppercase; font-size:${isSklNilai ? '10px' : '11px'}; letter-spacing:1px; padding:${isSklNilai ? '5px 8px' : '8px 10px'}; border-bottom:2px solid #e2e8f0; text-align:left; }
  .scores-table td { padding:${isSklNilai ? '3px 8px' : '5px 10px'}; border-bottom:1px solid #f1f5f9; }
  .scores-table .avg-row { background:#f8fafc; font-weight:800; font-size:${isSklNilai ? '13px' : '14px'}; }
  
  .result-status { text-align:center; margin:${isSklNilai ? '8px 0' : '10px 0'}; position: relative; z-index: 1; }
  .badge { 
    display:inline-block; 
    padding:6px 30px; 
    border-radius:12px; 
    font-size:20px; 
    font-weight:900; 
    text-transform:uppercase; 
    letter-spacing:4px;
    transform: rotate(-2deg);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  }
  .badge-lulus { background:#ecfdf5; color:#059669; border:3px solid #10b981; }
  .badge-tidak { background:#fef2f2; color:#dc2626; border:3px solid #ef4444; }
  
  .signature-area { display:flex; justify-content:flex-end; margin-top:30px; position: relative; z-index: 1; }
  .signature-area.page-break-section { display:block; }
  .signature-box { text-align:center; position:relative; min-width:240px; }
  .signature-box .date { font-size:14px; color:#475569; margin-bottom:4px; }
  .signature-box .role { font-size:15px; font-weight:600; color:#1e293b; margin-bottom:10px; }
  .signature-box .name { font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase; margin-top:5px; border-bottom:2px solid #0f172a; display:inline-block; padding-bottom:2px; }
  .signature-box .nip { font-size:13px; color:#64748b; margin-top:4px; }
  
  .footer-note { 
    position: absolute;
    bottom: 30px;
    left: 50px;
    right: 50px;
    font-size:11px; 
    color:#94a3b8; 
    text-align:center; 
    padding-top:10px; 
    border-top:1px solid #f1f5f9; 
    font-style: italic;
    z-index: 1;
  }
  .page2-footer { display: none; }
  /* Page 2: Kop Surat header & page-break */
  .page-break-section {
    margin-top: 30px;
  }
  .page2-header {
    display: none; /* hidden on screen — shown only on print via @media print */
    align-items:center;
    gap:20px;
    border-bottom:3px solid #1e293b;
    padding-bottom:10px;
    margin-bottom:20px;
  }
  .dummy-badge { position:fixed; top:20px; right:20px; background:#f59e0b; color:#fff; font-size:10px; font-weight:800; padding:5px 15px; border-radius:999px; font-family:sans-serif; z-index:10000; box-shadow:0 4px 10px rgba(0,0,0,0.2); text-transform:uppercase; letter-spacing:1px; }
</style></head><body>
  <div class="dummy-badge">CONTOH PRATINJAU</div>
  <div class="page">
    <div class="watermark">${meta.sekolah||'SKL'}</div>
    <div class="header">
      ${ kopSuratHtml
        ? kopSuratHtml
        : `${logoHtml}
      <div class="header-text">
        <h2>${meta.sekolah||'NAMA SEKOLAH'}</h2>
        <p style="margin-top:4px; font-weight:600;">NSS: ${meta.nss||'-'} | NPSN: ${meta.npsn||'-'}</p>
        <p>${meta.alamat||'-'}</p>
        <p style="margin-top:2px;">Telp: ${meta.telepon||'-'} | Email: ${meta.email||'-'}</p>
        ${smkHeaderLine}
      </div>
      <div style="width:90px;height:90px;flex-shrink:0;"></div>`
      }
    </div>
    
    <div class="title-area">
      <h3>${sklTitle}</h3>
      <div class="line"></div>
      <p>Nomor: ${nomorSurat}</p>
    </div>
    
    ${sklBody}
    
    <div class="signature-area" style="${isSklNilai ? 'display:block;' : ''}" id="signature-section">
      ${isSklNilai ? `
      <div class="page2-header" style="display:none;">
        ${ kopSuratHtml
          ? kopSuratHtml
          : `${logoHtml}
        <div class="header-text">
          <h2>${meta.sekolah||'NAMA SEKOLAH'}</h2>
          <p style="margin-top:4px; font-weight:600;">NSS: ${meta.nss||'-'} | NPSN: ${meta.npsn||'-'}</p>
          <p>${meta.alamat||'-'}</p>
          ${(meta.telepon||meta.email)?`<p style="margin-top:2px;">Telp: ${meta.telepon||'-'} | Email: ${meta.email||'-'}</p>`:''}
          ${smkHeaderLine}
        </div>
        <div style="width:90px;height:90px;flex-shrink:0;"></div>`
        }
      </div>
      <p class="intro-text" style="margin:20px 0;">Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya dan hanya berlaku sampai diterbitkan Ijazah Asli tahun ajaran ${meta.tahun_ajaran||'-'}</p>
      ` : ''}
      <div style="display:flex;justify-content:flex-end;width:100%;">
        <div class="signature-box">
          ${stempelHtml}
          <p class="date">${kota}, ${tglPengumuman}</p>
          <p class="role">Kepala Sekolah,</p>
          <div style="margin:10px 0;">${ttdHtml}</div>
          <p class="name">${meta.kepala_sekolah||'Kepala Sekolah'}</p>
          ${meta.jabatan_kepsek ? `<p class="nip" style="margin-top:2px;font-weight:600;color:#475569;">${meta.jabatan_kepsek}</p>` : ''}
          ${meta.id_kepsek_mode === 'nuptk'
            ? (meta.nuptk_kepsek ? `<p class="nip">NUPTK. ${meta.nuptk_kepsek}</p>` : '')
            : (meta.nip_kepsek   ? `<p class="nip">NIP. ${meta.nip_kepsek}</p>`      : '')}
        </div>
      </div>
    </div>
    
    <p class="footer-note">Dokumen ini diterbitkan secara elektronik dan sah sebagai bukti kelulusan sementara sebelum ijazah asli diterbitkan. Keaslian dokumen dapat dikonfirmasi melalui portal resmi sekolah.</p>
  </div>
</body></html>`;
}


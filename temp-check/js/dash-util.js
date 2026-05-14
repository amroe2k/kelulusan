const $ = id => document.getElementById(id);
let auth=null,allSiswa=[],allData=null,currentView='overview',importedRows=[];

// ─── Searchable Select ────────────────────────────────────────────────────────
// ssSetOptions(wrapId, itemsArray, selectedValue)  — use from JS to populate/select

// Helper: hapus prefix "Kab. " untuk tampilan bersih
function stripKab(str) {
  return (str || '').replace(/^Kab\.\s*/i, '').trim();
}

function ssSetOptions(wrapId, items, selected) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const hiddenInput = wrap.querySelector('input[type="hidden"]');
  const trigger = wrap.querySelector('.ss-trigger');
  const label = wrap.querySelector('.ss-label');
  const list = wrap.querySelector('.ss-list');
  if (!list) return;

  // Tentukan apakah ini dropdown kota (bukan provinsi)
  const isKota = wrapId.toLowerCase().includes('kota') || wrapId.toLowerCase().includes('kabupaten');

  // Normalisasi selected value (strip Kab. jika perlu)
  const selectedClean = isKota ? stripKab(selected) : (selected || '');

  // Build list items
  list.innerHTML = '';
  items.forEach(item => {
    const displayText = isKota ? stripKab(item) : item;
    const li = document.createElement('li');
    li.textContent = displayText;
    li.dataset.value = displayText;  // simpan nilai bersih
    if (displayText === selectedClean) li.classList.add('ss-selected');
    li.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent blur before click
      ssSelectItem(wrap, displayText);
    });
    list.appendChild(li);
  });

  // Apply selected
  if (selectedClean && items.some(i => (isKota ? stripKab(i) : i) === selectedClean)) {
    if (hiddenInput) hiddenInput.value = selectedClean;
    if (label) label.textContent = selectedClean;
    if (trigger) trigger.dataset.selected = 'true';
  } else {
    const placeholder = wrapId.includes('provinsi') ? '— Pilih Provinsi —' : '— Pilih Kabupaten/Kota —';
    if (hiddenInput) hiddenInput.value = '';
    if (label) label.textContent = placeholder;
    if (trigger) trigger.dataset.selected = 'false';
  }
}

function ssSelectItem(wrap, value) {
  const hiddenInput = wrap.querySelector('input[type="hidden"]');
  const trigger = wrap.querySelector('.ss-trigger');
  const label = wrap.querySelector('.ss-label');
  const dropdown = wrap.querySelector('.ss-dropdown');
  const chevron = wrap.querySelector('.ss-chevron');
  if (hiddenInput) hiddenInput.value = value;
  if (label) label.textContent = value;
  if (trigger) trigger.dataset.selected = 'true';
  // Highlight selected
  wrap.querySelectorAll('.ss-list li').forEach(li => {
    li.classList.toggle('ss-selected', li.dataset.value === value);
  });
  // Close
  if (dropdown) dropdown.classList.add('hidden');
  if (chevron) chevron.classList.remove('open');
  // Trigger onChange callback
  if (typeof wrap._ssOnChange === 'function') wrap._ssOnChange(value);
}

function ssFilterList(wrap, query) {
  const items = wrap.querySelectorAll('.ss-list li');
  const q = query.toLowerCase().trim();
  let visible = 0;
  items.forEach(li => {
    const match = !q || li.textContent.toLowerCase().includes(q);
    li.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  // Show empty message
  let emptyLi = wrap.querySelector('.ss-list .ss-empty');
  if (visible === 0) {
    if (!emptyLi) {
      emptyLi = document.createElement('li');
      emptyLi.className = 'ss-empty';
      emptyLi.textContent = 'Tidak ditemukan';
      wrap.querySelector('.ss-list').appendChild(emptyLi);
    }
    emptyLi.style.display = '';
  } else if (emptyLi) {
    emptyLi.style.display = 'none';
  }
}

function ssInitAll() {
  document.querySelectorAll('.searchable-select').forEach(wrap => {
    const trigger = wrap.querySelector('.ss-trigger');
    const dropdown = wrap.querySelector('.ss-dropdown');
    const searchInput = wrap.querySelector('.ss-search');
    const chevron = wrap.querySelector('.ss-chevron');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', () => {
      const isOpen = !dropdown.classList.contains('hidden');
      // Close all other dropdowns first
      document.querySelectorAll('.searchable-select .ss-dropdown').forEach(d => {
        d.classList.add('hidden');
        d.closest('.searchable-select')?.querySelector('.ss-chevron')?.classList.remove('open');
      });
      if (!isOpen) {
        dropdown.classList.remove('hidden');
        if (chevron) chevron.classList.add('open');
        if (searchInput) { searchInput.value = ''; ssFilterList(wrap, ''); searchInput.focus(); }
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => ssFilterList(wrap, searchInput.value));
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.searchable-select')) {
      document.querySelectorAll('.searchable-select .ss-dropdown').forEach(d => {
        d.classList.add('hidden');
        d.closest('.searchable-select')?.querySelector('.ss-chevron')?.classList.remove('open');
      });
    }
  }, true);
}


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
function modalOpen(id){const m=$(id);if(!m)return;m.classList.remove('hidden');m.style.display='flex';}
function modalClose(id){const m=$(id);if(!m)return;m.classList.add('hidden');m.classList.remove('flex');m.style.display='none';}

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
  // Bug #2 fix: parse YYYY-MM-DD parts directly to avoid UTC midnight timezone off-by-one
  const fmt = d => { if(!d) return '-'; if(typeof d==='string'&&!/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d; const parts=typeof d==='string'?d.split('-'):null; if(parts&&parts.length===3) return `${parseInt(parts[2])} ${bulan[parseInt(parts[1])-1]} ${parts[0]}`; const dt=new Date(d); return `${dt.getDate()} ${bulan[dt.getMonth()]} ${dt.getFullYear()}`; };
  const maskNISN = n => n.slice(0,3)+'****'+n.slice(-3);

  const siswa = siswaData || { nama:'AHMAD FAUZAN MAULANA', nisn:'1234567890',
    tempat_lahir:'Bandung', tanggal_lahir:'2007-05-15', kelas:'XII RPL 1', status:'LULUS',
    jenis_kelamin: 'L',
    konsentrasi_keahlian: (meta.jenjang||'').toUpperCase()==='SMK' ? 'Pengembangan Perangkat Lunak' : '',
    kompetensi_keahlian: (meta.jenjang||'').toUpperCase()==='SMK' ? 'Rekayasa Perangkat Lunak' : '' };
  const nilai = nilaiData && nilaiData.length ? nilaiData : [];
  const rataRata = nilai.length ? (nilai.reduce((s,n)=>s+n.nilai,0)/nilai.length).toFixed(1) : '-';

  // Nomor surat
  const sklNum = String(Math.floor(Math.random()*900+100)).padStart(3,'0');
  const nomorSurat = (meta.nomor_surat_mode === 'static' && meta.nomor_surat_statis)
    ? meta.nomor_surat_statis
    : (meta.nomor_surat_suffix
        ? `${sklNum}${meta.nomor_surat_suffix}`
        : `400.3.11.1/${sklNum}`);

  const kompetensi = (siswa.kompetensi_keahlian || '').trim();
  const konsentrasi = (siswa.konsentrasi_keahlian || '').trim();
  const jenjang = (meta.jenjang||'').toUpperCase();
  const isSmk = jenjang === 'SMK';
  const isSmaOrMa = ['SMA','MA'].includes(jenjang);
  // Kompetensi row for SKL1
  let kompetensiRow = '';
  if (isSmk) {
    kompetensiRow = `<tr><td>Kompetensi Keahlian</td><td>:</td><td>${escHtml(kompetensi) || '-'}</td></tr>`;
    if (konsentrasi) {
      kompetensiRow += `\n                <tr><td>Konsentrasi Keahlian</td><td>:</td><td>${escHtml(konsentrasi)}</td></tr>`;
    }
  } else if (isSmaOrMa && kompetensi) {
    kompetensiRow = `<tr><td>Peminatan</td><td>:</td><td>${escHtml(kompetensi)}</td></tr>`;
    if (konsentrasi) {
      kompetensiRow += `\n                <tr><td>Konsentrasi Keahlian</td><td>:</td><td>${escHtml(konsentrasi)}</td></tr>`;
    }
  } else if (konsentrasi) {
    kompetensiRow += `<tr><td>Konsentrasi Keahlian</td><td>:</td><td>${escHtml(konsentrasi)}</td></tr>`;
  }
  const jenisKelaminDisplay = (siswa.jenis_kelamin||'L') === 'P' ? 'Perempuan' : 'Laki-laki';
  const isLulus = (siswa.status || 'LULUS').toUpperCase() === 'LULUS';

  const sklTitle = 'SURAT KETERANGAN LULUS';
  const tglPengumuman = isSklNilai
    ? (meta.tanggal_skl2 ? fmt(meta.tanggal_skl2) : fmt(now))
    : (meta.tanggal_pengumuman ? fmt(meta.tanggal_pengumuman) : fmt(now));

  const kopSuratEnabled = (meta.kop_surat && localStorage.getItem('asset_kop_surat_enabled') !== '0');
  const kopSuratHtml = kopSuratEnabled
    ? `<img src="${meta.kop_surat}" crossorigin="anonymous" style="width:100%;max-height:130px;object-fit:contain;display:block;" />`
    : null;

  const logoHtml = (meta.logo && localStorage.getItem('asset_logo_enabled') !== '0')
    ? `<img src="${meta.logo}" crossorigin="anonymous" style="height:90px;width:90px;object-fit:contain;" />`
    : `<div style="width:90px;height:90px;border:2px solid #ddd;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;background:#fafafa;">LOGO</div>`;

  const stempelHtml = (meta.stempel && localStorage.getItem('asset_stempel_enabled') !== '0')
    ? `<img src="${meta.stempel}" crossorigin="anonymous" style="position:absolute;top:15px;left:-10px;width:140px;height:140px;object-fit:contain;opacity:0.6;pointer-events:none;" />`
    : '';

  const ttdHtml = (meta.ttd && localStorage.getItem('asset_ttd_enabled') !== '0')
    ? `<img src="${meta.ttd}" crossorigin="anonymous" style="height:70px;margin:0 auto 4px auto;display:block;" />`
    : `<div style="height:70px;"></div>`;

  // ── Kop Surat untuk Halaman 2 (print SKL2) ──
  const _p2img = (meta.kop_surat && localStorage.getItem('asset_kop_surat_enabled') !== '0')
    ? `<img src="${meta.kop_surat}" crossorigin="anonymous" style="width:100%;max-height:120px;object-fit:contain;display:block;" />`
    : `${logoHtml}<div class="header-text"><h2>${meta.sekolah||'NAMA SEKOLAH'}</h2><p style="margin-top:4px;font-weight:600;">NPSN: ${meta.npsn||'-'} | NSS: ${meta.nss||'-'}</p><p>${meta.alamat||'-'}</p>${(meta.kota||meta.provinsi)?`<p style="margin-top:2px;font-weight:500;">Kab./Kota ${meta.kota||'-'}, Prov. ${meta.provinsi||'-'}</p>`:''}</div><div style="width:90px;height:90px;flex-shrink:0;"></div>`;
  const page2KopHtml = `<div class="skl2-p2-kop">${_p2img}</div>`;

  // ── Build nilai rows (flat list for SKL1, categorized for SKL2) ──
  const nilaiRows = nilai.map((n,i)=>`
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px 10px;text-align:center;color:#666;font-size:11px;">${i+1}</td>
      <td style="padding:8px 10px;color:#333;">${n.mapel}</td>
      <td style="padding:8px 10px;text-align:center;font-weight:700;color:#111;">${Math.round(n.nilai)}</td>
    </tr>`).join('');

  // ── Build categorized nilai table for SKL2 (Format Kemdikbud) ──
  function buildNilaiTableKemdikbud(nilaiArr) {
    if (!nilaiArr || !nilaiArr.length) {
      return `<p style="font-size:13px;color:#666;font-style:italic;margin:10px 0 10px 20px;">Belum ada data nilai. Silakan import nilai melalui menu Data Kelulusan.</p>`;
    }
    let counter = 0;
    const row = (mapel, val) => {
      counter++;
      const v = (val !== undefined && val !== null && val !== '') ? Math.round(val) : '';
      return `<tr><td class="n-no">${counter}.</td><td class="n-mapel">${mapel}</td><td class="n-val">${v}</td></tr>`;
    };
    const catHeader = (label) => `<tr><td class="n-no"></td><td class="n-cat" colspan="2"><strong>${label}</strong></td></tr>`;
    // Lookup: cari mapel di data nilai (case-insensitive partial match)
    const find = (keyword) => {
      const kw = keyword.toLowerCase();
      const found = nilaiArr.find(n => n.mapel.toLowerCase().includes(kw));
      return found ? found.nilai : '';
    };
    const findExact = (keywords) => {
      for (const kw of keywords) {
        const k = kw.toLowerCase();
        const found = nilaiArr.find(n => n.mapel.toLowerCase().includes(k));
        if (found) return found.nilai;
      }
      return '';
    };

    let rows = '';
    if (isSmk) {
      // ── FORMAT SMK ──
      rows += catHeader('Mata Pelajaran Umum');
      rows += row('Pendidikan Agama dan Budi Pekerti', findExact(['agama','budi pekerti']));
      rows += row('Pendidikan Pancasila', findExact(['pancasila','pkn','kewarganegaraan']));
      rows += row('Bahasa Indonesia', find('bahasa indonesia'));
      rows += row('Pendidikan Jasmani, Olahraga dan Kesehatan', findExact(['jasmani','olahraga','penjas','pjok']));
      rows += row('Sejarah', find('sejarah'));
      rows += row('Seni dan Budaya', findExact(['seni','budaya']));
      rows += catHeader('Mata Pelajaran Kejuruan');
      rows += row('Matematika', find('matematika'));
      rows += row('Bahasa Inggris', find('bahasa inggris'));
      rows += row('Informatika', find('informatika'));
      rows += row('Projek Ilmu Pengetahuan Alam dan Sosial', findExact(['projek ilmu','ipas','p5']));
      rows += row('Dasar-dasar Program Keahlian', findExact(['dasar-dasar','dasar program']));
      rows += row('Konsentrasi Keahlian', findExact(['konsentrasi keahlian']));
      rows += row('Projek Kreativitas, Inovasi dan Kewirausahaan', findExact(['kreativitas','kewirausahaan','projek kreativitas','pkwu']));
      rows += row('Praktik Kerja Lapangan', findExact(['praktik kerja','pkl']));
    } else {
      rows += catHeader('Mata Pelajaran Wajib');
      rows += row('Pendidikan Agama ... Dan Budi Pekerti', findExact(['agama','budi pekerti']));
      rows += row('Pendidikan Pancasila', findExact(['pancasila','pkn','kewarganegaraan']));
      rows += row('Bahasa Indonesia', find('bahasa indonesia'));
      rows += row('Matematika', find('matematika'));
      rows += row('Ilmu Pengetahuan Alam: Fisika, Kimia, Biologi', findExact(['ipa','fisika','kimia','biologi','ilmu pengetahuan alam']));
      rows += row('Ilmu Pengetahuan Sosial: Sosiologi, Ekonomi, Sejarah, Geografi', findExact(['ips','sosiologi','ekonomi','geografi','ilmu pengetahuan sosial']));
      rows += row('Bahasa Inggris', find('bahasa inggris'));
      rows += row('Pendidikan Jasmani Olahraga dan Kesehatan', findExact(['jasmani','olahraga','penjas','pjok']));
      rows += row('Informatika', find('informatika'));
      rows += row('Sejarah', find('sejarah'));
      rows += row('Seni, Budaya dan Prakarya', findExact(['seni','budaya','prakarya']));
      // Mata Pelajaran Pilihan — ambil dari data yang belum terpakai
      const smaUsed = ['agama','budi pekerti','pancasila','pkn','kewarganegaraan','bahasa indonesia','matematika','ipa','fisika','kimia','biologi','ilmu pengetahuan alam','ips','sosiologi','ekonomi','geografi','ilmu pengetahuan sosial','bahasa inggris','jasmani','olahraga','penjas','pjok','informatika','sejarah','seni','budaya','prakarya'];
      const smaPilihan = nilaiArr.filter(n => !smaUsed.some(kw => n.mapel.toLowerCase().includes(kw)));
      rows += catHeader('Mata Pelajaran Pilihan');
      if (smaPilihan.length) {
        smaPilihan.forEach(p => { rows += row(p.mapel, p.nilai); });
        // pad remaining slots up to 5
        const remaining = 5 - smaPilihan.length;
        for (let i = 0; i < remaining; i++) rows += row('Ditulis 4 atau 5 mapel pilihan', '');
      } else {
        for (let i = 0; i < 5; i++) rows += row('Ditulis 4 atau 5 mapel pilihan', '');
      }
      rows += catHeader('Muatan Lokal');
      rows += row('-', '');
    }
    // Hanya untuk SMK: ambil sisa mapel (SMA sudah handle Pilihan di blok atas)
    if (isSmk) {
      const usedKeywords = ['agama','budi pekerti','pancasila','pkn','kewarganegaraan','bahasa indonesia','jasmani','olahraga','penjas','pjok','sejarah','seni','budaya','matematika','bahasa inggris','informatika','projek ilmu','ipas','p5','dasar-dasar','dasar program','konsentrasi keahlian','kreativitas','kewirausahaan','projek kreativitas','pkwu','praktik kerja','pkl'];
      const pilihan = nilaiArr.filter(n => {
        const ml = n.mapel.toLowerCase();
        return !usedKeywords.some(kw => ml.includes(kw));
      });
      rows += catHeader('Mata Pelajaran Pilihan');
      if (pilihan.length) {
        pilihan.forEach(p => { rows += row(p.mapel, p.nilai); });
      } else {
        rows += row('-', '');
      }
      rows += catHeader('Muatan Lokal');
      rows += row('-', '');
    }
    // Rata-rata
    rows += `<tr class="n-avg"><td class="n-no"></td><td class="n-mapel" style="text-align:center;"><strong><em>Rata-rata</em></strong></td><td class="n-val"><strong>${rataRata}</strong></td></tr>`;
    return `<table class="nilai-kemdikbud"><thead><tr><th style="width:40px;">No.</th><th>Mata Pelajaran</th><th style="width:80px;">Nilai</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Override catHeader untuk SMA agar beri class khusus
  // (fungsi di atas sudah benar, tidak perlu override)

  // ── SKL Body ──
  const _kotaRaw = (meta.kota || '').trim();
  const kotaLabel = _kotaRaw
    ? (_kotaRaw.startsWith('Kab. ') ? 'Kabupaten ' + _kotaRaw.slice(5) : 'Kota ' + _kotaRaw)
    : 'Kota/Kabupaten*) ........';



  const sklBody = isSklNilai ? `
    <p class="intro-text">Yang bertanda tangan di bawah ini, Kepala <strong>${meta.sekolah||'...'}</strong> ${kotaLabel}, Provinsi ${meta.provinsi||'........'} menerangkan bahwa:</p>
    <table class="student-data">
      <tr><td>Satuan Pendidikan</td><td>:</td><td>${meta.sekolah||'-'}</td></tr>
      <tr><td>Nomor Pokok Satuan Pendidikan</td><td>:</td><td>${meta.npsn||'-'}</td></tr>
      <tr><td>Nama Lengkap</td><td>:</td><td><strong>${siswa.nama}</strong></td></tr>
      <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir||'-'}, ${siswa.tanggal_lahir_display||fmt(siswa.tanggal_lahir)}</td></tr>
      <tr><td>Nomor Induk Siswa Nasional</td><td>:</td><td>${siswa.nisn||'-'}</td></tr>
      <tr><td>Nomor Ijazah</td><td>:</td><td>-</td></tr>
      <tr><td>Tanggal Kelulusan</td><td>:</td><td>${tglPengumuman}</td></tr>
      <tr><td>Kurikulum</td><td>:</td><td>${meta.kurikulum||'Kurikulum Merdeka'}</td></tr>
      ${kompetensiRow}
    </table>
    <div class="result-status" style="margin:18px 0;"><span class="badge ${isLulus?'badge-lulus':'badge-tidak'}">${siswa.status||'LULUS'}</span></div>
    <p class="intro-text" style="margin-top:10px;">Dinyatakan <strong>${siswa.status||'LULUS'}</strong> dari Satuan Pendidikan berdasarkan kriteria kelulusan ${meta.sekolah||'...'} ${kotaLabel} Tahun Ajaran ${meta.tahun_ajaran||'-'}, dengan nilai sebagai berikut :</p>
    <div class="scores-container">
      ${buildNilaiTableKemdikbud(nilai)}
    </div>
  ` : `
    <p class="intro-text">Yang bertanda tangan di bawah ini, Kepala <strong>${meta.sekolah||'...'}</strong> ${kotaLabel}, Provinsi ${meta.provinsi||'........'} menerangkan bahwa:</p>
    <table class="student-data">
      <tr><td>Satuan Pendidikan</td><td>:</td><td>${meta.sekolah||'-'}</td></tr>
      <tr><td>Nomor Pokok Satuan Pendidikan</td><td>:</td><td>${meta.npsn||'-'}</td></tr>
      <tr><td>Nama Lengkap</td><td>:</td><td><strong>${siswa.nama}</strong></td></tr>
      <tr><td>Jenis Kelamin</td><td>:</td><td>${(siswa.jenis_kelamin||'L')==='P'?'Perempuan':'Laki-laki'}</td></tr>
      <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${siswa.tempat_lahir||'-'}, ${siswa.tanggal_lahir_display||fmt(siswa.tanggal_lahir)}</td></tr>
      <tr><td>Nomor Induk Siswa Nasional</td><td>:</td><td>${siswa.nisn||'-'}</td></tr>
      <tr><td>Nomor Ijazah</td><td>:</td><td>-</td></tr>
      <tr><td>Tanggal Kelulusan</td><td>:</td><td>${tglPengumuman}</td></tr>
      <tr><td>Kurikulum</td><td>:</td><td>${meta.kurikulum||'Kurikulum Merdeka'}</td></tr>
      ${kompetensiRow}
    </table>
    <div class="result-status" style="margin:18px 0;"><span class="badge ${isLulus?'badge-lulus':'badge-tidak'}">${siswa.status||'LULUS'}</span></div>
    <p class="intro-text" style="margin-top:10px;">Dinyatakan <strong>${siswa.status||'LULUS'}</strong> dari Satuan Pendidikan berdasarkan kriteria kelulusan ${meta.sekolah||'...'} ${kotaLabel} Tahun Ajaran ${meta.tahun_ajaran||'-'}.</p>
  `;

  const kota = _kotaRaw || '........';

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>SKL-${siswa.nama.replace(/\s+/g,'_')}-${siswa.nisn || '0000000000'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html { overflow-y: auto; }
  body { 
    font-family:'Inter', Arial, sans-serif; 
    background:#f1f5f9; 
    color:#1e293b; 
    min-height: 1247px; 
    padding:20px;
    display:flex;
    justify-content:center;
    overflow-x: hidden;
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
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: 210mm 330mm; margin: 8mm 10mm 8mm 18mm; }
    body { padding: 0; background: #fff; width: 210mm; min-height: auto; display:block; overflow:visible; }
    .page { box-shadow: none; border: none; padding: 0; min-height: 0; display: block; position: static; overflow: visible; }
    .dummy-badge { display: none !important; }
    ${isSklNilai ? `
    .skl2-sig-page { border: none !important; margin: 10px 0 0 0 !important; padding: 0 !important; page-break-inside: avoid; }
    .footer-note { display: none; }
    ` : `
    .page-break-section { page-break-before: always; padding-top: 20px; }
    .page2-header { display: flex !important; }
    .page2-footer { display: block !important; position: static; margin-top: 20px; }
    .footer-note { position: fixed; bottom: 8px; left: 10mm; right: 10mm; margin: 0; padding: 6px 0 0; border-top: 1px solid #e2e8f0; background: transparent; font-size:10px; }
    `}
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
    border-bottom:5px double #0f172a; 
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
  .title-area .line { width:150px; height:0; border-bottom:3px solid #0f172a; margin:${isSklNilai ? '4px' : '6px'} auto; }
  .title-area p  { font-size:13px; font-weight:600; color:#64748b; margin-top:${isSklNilai ? '3px' : '5px'}; }
  
  .intro-text { font-size:14px; line-height:${isSklNilai ? '1.4' : '1.5'}; margin:${isSklNilai ? '5px 0' : '8px 0'}; color:#334155; position: relative; z-index: 1; }
  
  .student-data { border-collapse:collapse; width:calc(100% - 40px); margin:${isSklNilai ? '4px 0 4px 40px' : '8px 0 8px 40px'}; font-size:14px; line-height:${isSklNilai ? '1.3' : '1.4'}; position: relative; z-index: 1; }
  .student-data td { padding:${isSklNilai ? '1px 0' : '3px 0'}; vertical-align:top; }
  .student-data td:first-child { width:${isSklNilai ? '205px' : '165px'}; color:#64748b; font-weight:500; white-space:nowrap; }
  .student-data td:nth-child(2) { width:20px; text-align:center; color:#94a3b8; }
  .student-data td:last-child { font-weight:700; color:#0f172a; }
  
  .scores-container { margin:${isSklNilai ? '16px 0' : '10px 0'}; width:100%; position: relative; z-index: 1; }
  .scores-table { border-collapse:collapse; width:100%; font-size:${isSklNilai ? '12px' : '13px'}; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .scores-table th { background:#f8fafc; color:#64748b; font-weight:700; text-transform:uppercase; font-size:${isSklNilai ? '10px' : '11px'}; letter-spacing:1px; padding:${isSklNilai ? '5px 8px' : '8px 10px'}; border-bottom:2px solid #e2e8f0; text-align:left; }
  .scores-table td { padding:${isSklNilai ? '3px 8px' : '5px 10px'}; border-bottom:1px solid #f1f5f9; }
  .scores-table .avg-row { background:#f8fafc; font-weight:800; font-size:${isSklNilai ? '13px' : '14px'}; }
  
  /* Tabel Nilai format Kemdikbud (SKL2) */
  .nilai-kemdikbud { border-collapse:collapse; width:100%; font-size:13px; margin:15px 0; font-family:Arial,sans-serif; }
  .nilai-kemdikbud th { border:1px solid #333; padding:5px 8px; background:#f0f0f0; font-weight:700; text-align:center; font-size:13px; }
  .nilai-kemdikbud td { border:1px solid #333; padding:3px 6px; vertical-align:top; }
  .nilai-kemdikbud .n-no { width:35px; text-align:center; font-size:12px; }
  .nilai-kemdikbud .n-mapel { font-size:13px; }
  .nilai-kemdikbud .n-val { width:70px; text-align:center; font-weight:700; font-size:13px; }
  .nilai-kemdikbud .n-cat { border-left:none; font-size:13px; font-weight:700; padding:4px 6px; background:#fafafa; }
  .nilai-kemdikbud .n-avg td { border-top:2px solid #333; font-size:14px; }
  
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
  /* SKL2: halaman kedua (TTD) */
  .skl2-sig-page { margin-top:20px; border-top:2px dashed #cbd5e1; padding-top:16px; position:relative; z-index:1; }
  .skl2-p2-kop { display:none; margin-bottom:20px; }
  .page2-footer { display: none; }
  /* Page 2: Kop Surat header & page-break */
  .page-break-section {
    margin-top: 30px;
  }
  .page2-header {
    display: none; /* hidden on screen — shown only on print via @media print */
    align-items:center;
    gap:20px;
    border-bottom:5px double #0f172a;
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
        <p style="margin-top:4px; font-weight:600;">NPSN: ${meta.npsn||'-'} | NSS: ${meta.nss||'-'}</p>
        <p>${meta.alamat||'-'}</p>
        ${(meta.kota||meta.provinsi) ? `<p style="margin-top:2px;font-weight:500;">Kab./Kota ${meta.kota||'-'}, Prov. ${meta.provinsi||'-'}</p>` : ''}
        <p style="margin-top:2px;">Telp: ${meta.telepon||'-'} | Email: ${meta.email||'-'}</p>
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
    
    ${isSklNilai ? `
    <div class="skl2-sig-page" id="signature-section">
      <p class="intro-text" style="margin:10px 0 5px;font-size:13px;">Surat Keterangan Lulus ini berlaku sementara sampai dengan diterbitkannya Ijazah Tahun Ajaran ${meta.tahun_ajaran||'-'}, untuk menjadikan maklum bagi yang berkepentingan.</p>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;margin-top:5px;gap:50px;">
        <div style="width:90px;height:120px;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:12px;color:#94a3b8;font-family:'Times New Roman',serif;background:#f8fafc;z-index:2;position:relative;">Foto 3x4</div>
        <div class="signature-box" style="margin-bottom:0;">
          ${stempelHtml}
          <p class="date" style="font-size:14px;">${kota}, ${tglPengumuman}</p>
          <p class="role" style="font-size:14px;">Kepala ${jenjang||'Sekolah'} ${meta.sekolah ? meta.sekolah.replace(/^(SMK|SMA|MA|SMP|MTS)\s*/i,'').trim().substring(0,25) : '...'}</p>
          <div style="margin:10px 0;">${ttdHtml}</div>
          <p class="name">${meta.kepala_sekolah||'Kepala Sekolah'}</p>
          ${meta.jabatan_kepsek ? `<p class="nip" style="margin-top:2px;font-weight:600;color:#475569;">${meta.jabatan_kepsek}</p>` : ''}
          ${meta.id_kepsek_mode === 'nuptk'
            ? (meta.nuptk_kepsek ? `<p class="nip">NUPTK. ${meta.nuptk_kepsek}</p>` : '')
            : (meta.nip_kepsek   ? `<p class="nip">NIP. ${meta.nip_kepsek}</p>`      : '')}
        </div>
      </div>
      <p style="font-size:10px;color:#666;margin-top:5px;font-family:'Times New Roman',serif;">Keterangan:<br>*) Pilih Salah Satu</p>
    </div>
    ` : `
    <div class="signature-area" id="signature-section">
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
    `}
    
    ${!isSklNilai ? `<p class="footer-note">Dokumen ini diterbitkan secara elektronik dan sah sebagai bukti kelulusan sementara sebelum ijazah asli diterbitkan. Keaslian dokumen dapat dikonfirmasi melalui portal resmi sekolah.</p>` : ''}
  </div>
</body></html>`;
}


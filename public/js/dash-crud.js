// Siswa Modal + Nilai + Import/Export XLSX
function addNilaiRow(mapel='',nilai=''){
  const d=document.createElement('div');
  d.className='flex gap-2 items-center nilai-row';
  d.innerHTML=`
    <input type="text" placeholder="Mata Pelajaran" value="${mapel}" class="nilai-mapel flex-1 bg-[#0F1523] border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none">
    <input type="number" placeholder="0-100" value="${nilai}" min="0" max="100" step="0.01" class="nilai-val w-24 bg-[#0F1523] border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none">
    <button type="button" class="btn-rm-nilai p-1.5 text-rose-400 hover:text-rose-300 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
  d.querySelector('.btn-rm-nilai').onclick=()=>d.remove();
  $('nilai-list').appendChild(d);
}

async function openSiswaModal(s=null){
  $('modal-siswa-title').textContent=s?'Edit Data Siswa':'Tambah Siswa';
  $('siswa-id').value=s?.id||'';
  $('siswa-nisn').value=s?.nisn||'';
  $('siswa-nama').value=s?.nama||'';
  $('siswa-kelas').value=s?.kelas||'';
  $('siswa-jk').value=s?.jenis_kelamin||'L';
  $('siswa-tempat-lahir').value=s?.tempat_lahir||'';
  $('siswa-tanggal-lahir').value=s?.tanggal_lahir||'';
  $('siswa-status').value=s?.status||'LULUS';
  // Kompetensi Keahlian (opsional, khusus SMK/SMA)
  const kkEl=$('siswa-kompetensi');
  if(kkEl) kkEl.value=s?.kompetensi_keahlian||'';
  $('nilai-list').innerHTML='';

  if(s?.id){
    try{
      const r=await fetch(`/api/nilai.php?siswa_id=${s.id}`);
      const d=await r.json();
      (d.data||[]).forEach(n=>addNilaiRow(n.mapel,n.nilai));
    }catch(e){}
  }
  modalOpen('modal-siswa');
}

async function saveSiswa(e){
  e.preventDefault();
  const id=$('siswa-id').value;
  const body={
    action:id?'update':'create',id,
    nisn:$('siswa-nisn').value.trim(),
    nama:$('siswa-nama').value.trim(),
    kelas:$('siswa-kelas').value.trim(),
    jenis_kelamin:$('siswa-jk').value,
    tempat_lahir:$('siswa-tempat-lahir').value.trim(),
    tanggal_lahir:$('siswa-tanggal-lahir').value||null,
    status:$('siswa-status').value,
    kompetensi_keahlian:($('siswa-kompetensi')?.value||'').trim()||null,
  };
  const btn=$('btn-siswa-submit'); btn.textContent='Menyimpan...'; btn.disabled=true;
  const r=await fetch('/api/siswa.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const res=await r.json();
  btn.textContent='Simpan Data'; btn.disabled=false;
  if(!res.success){showToast(res.error||'Gagal','error');return;}

  // Save nilai
  const nilaiRows=Array.from($('nilai-list').querySelectorAll('.nilai-row'));
  const nilaiData=nilaiRows.map((row,i)=>({mapel:row.querySelector('.nilai-mapel').value.trim(),nilai:parseFloat(row.querySelector('.nilai-val').value)||0,urutan:i+1})).filter(n=>n.mapel);
  const siswaId=res.id||id;
  if(nilaiData.length||id){
    await fetch('/api/nilai.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',siswa_id:siswaId,nilai:nilaiData})});
  }
  modalClose('modal-siswa'); await loadAndRenderSiswa(); showToast(id?'Data diperbarui!':'Siswa ditambahkan!','success');
}

// ── EXPORT XLSX ──
async function exportXlsx(){
  const r=await fetch('/api/siswa.php'); const d=await r.json(); const list=d.data||[];
  if(!list.length){showToast('Tidak ada data','warning');return;}

  // Collect all mapel
  const mapelSet=new Set();
  const nilaiMap={};
  await Promise.all(list.map(async s=>{
    const nr=await fetch(`/api/nilai.php?siswa_id=${s.id}`);
    const nd=await nr.json();
    nilaiMap[s.id]={};
    (nd.data||[]).forEach(n=>{nilaiMap[s.id][n.mapel]=n.nilai;mapelSet.add(n.mapel);});
  }));
  const mapelCols=[...mapelSet].sort();

  const XLSXS=window.XLSX;
  const jenjang=((allData?._meta?.jenjang)||'').toUpperCase();
  const isSmkExport=jenjang==='SMK';
  const isSmaExport=['SMA','MA'].includes(jenjang);
  const kompetensiHeader=isSmkExport?'Kompetensi Keahlian':isSmaExport?'Peminatan':'Kompetensi Keahlian';
  // kompetensi_keahlian ditambahkan setelah kelas (opsional, bisa kosong)
  const headers=['No','NISN','Nama','Jenis Kelamin','Tempat Lahir','Tanggal Lahir','Kelas',kompetensiHeader,'Status',...mapelCols,'Rata-Rata'];
  const rows=list.map((s,i)=>{
    const vals=mapelCols.map(m=>nilaiMap[s.id]?.[m]??'');
    return [i+1,s.nisn,s.nama,s.jenis_kelamin==='L'?'Laki-laki':'Perempuan',s.tempat_lahir,s.tanggal_lahir,s.kelas,s.kompetensi_keahlian||'',s.status,...vals,parseFloat(s.rata_rata||0).toFixed(2)];
  });

  const ws=XLSXS.utils.aoa_to_sheet([headers,...rows]);

  // Header style
  const hStyle={font:{bold:true,color:{rgb:'FFFFFF'},sz:11},fill:{fgColor:{rgb:'4F46E5'}},alignment:{horizontal:'center',vertical:'center'},border:{bottom:{style:'medium',color:{rgb:'818CF8'}}}};
  headers.forEach((_,i)=>{
    const cell=XLSXS.utils.encode_cell({r:0,c:i});
    if(!ws[cell])ws[cell]={v:headers[i],t:'s'};
    ws[cell].s=hStyle;
  });

  // Data row styles
  const STATUS_COL=8; // index of Status column
  rows.forEach((_,ri)=>{
    headers.forEach((_,ci)=>{
      const cell=XLSXS.utils.encode_cell({r:ri+1,c:ci});
      if(!ws[cell])return;
      ws[cell].s={
        fill:{fgColor:{rgb:ri%2===0?'FFFFFF':'F1F5F9'}},
        font:{color:{rgb:'1E293B'},sz:10},
        alignment:{horizontal:ci===0||ci>=STATUS_COL?'center':'left',vertical:'center'},
        border:{top:{style:'thin',color:{rgb:'E2E8F0'}},bottom:{style:'thin',color:{rgb:'E2E8F0'}},left:{style:'thin',color:{rgb:'E2E8F0'}},right:{style:'thin',color:{rgb:'E2E8F0'}}}
      };
    });
    // Status cell: color coded
    const statusCell=XLSXS.utils.encode_cell({r:ri+1,c:STATUS_COL});
    if(ws[statusCell]){
      const isLulus=rows[ri][STATUS_COL]==='LULUS';
      ws[statusCell].s={...ws[statusCell].s,font:{bold:true,color:{rgb:isLulus?'059669':'DC2626'},sz:10},alignment:{horizontal:'center'}};
    }
    // Nilai cells: number format
    for(let ci=STATUS_COL+1;ci<headers.length-1;ci++){
      const cell=XLSXS.utils.encode_cell({r:ri+1,c:ci});
      if(ws[cell])ws[cell].s={...ws[cell].s,alignment:{horizontal:'center'},font:{color:{rgb:'1E40AF'},sz:10}};
    }
    // Rata-rata cell
    const rataCell=XLSXS.utils.encode_cell({r:ri+1,c:headers.length-1});
    if(ws[rataCell])ws[rataCell].s={...ws[rataCell].s,font:{bold:true,color:{rgb:'7C3AED'},sz:10},alignment:{horizontal:'center'}};
  });

  // Col widths: No,NISN,Nama,JK,Tempat,Tgl,Kelas,Kompetensi,Status,...mapel,RataRata
  ws['!cols']=[{wch:5},{wch:14},{wch:28},{wch:14},{wch:16},{wch:14},{wch:12},{wch:22},{wch:14},...mapelCols.map(()=>({wch:14})),{wch:10}];
  ws['!rows']=[{hpt:22},...rows.map(()=>({hpt:18}))];

  const wb=XLSXS.utils.book_new();
  XLSXS.utils.book_append_sheet(wb,ws,'Data Siswa');
  const dateNow = new Date();
  const dateStr = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')}`;
  XLSXS.writeFile(wb,`data-siswa-${dateStr}.xlsx`);
  showToast('Export XLSX berhasil!','success');
}

// ── IMPORT XLSX ──
function initImport(){
  // BASE_COLS: kolom yang bukan nilai mata pelajaran
  // kompetensi_keahlian ditambahkan agar tidak dianggap mapel
  const BASE_COLS_SET=new Set(['nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir','kelas','kompetensi_keahlian','kompetensi keahlian','kompetensi_keahlian_(wajib-smk)','peminatan','peminatan_(opsional-sma)','jurusan_peminatan','jurusan_peminatan_(opsional)','status','no','rata-rata','rata_rata']);
  importedRows=[];

  // ─── Drag & Drop Zone ───
  const dropZone   = $('xlsx-drop-zone');
  const fileInput  = $('xlsx-file-input');
  const fileNameEl = $('xlsx-file-name');
  const overlay    = $('xlsx-drag-overlay');

  function processXlsxFile(f){
    if(!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if(!['xlsx','xls'].includes(ext)){
      showToast('File harus berformat .xlsx atau .xls', 'error'); return;
    }
    // Tampilkan nama file
    if(fileNameEl){
      fileNameEl.textContent = '📄 ' + f.name;
      fileNameEl.classList.remove('hidden');
    }
    // Update tampilan drop zone → sukses
    if(dropZone){
      dropZone.classList.remove('border-slate-700','hover:border-indigo-500');
      dropZone.classList.add('border-emerald-500','bg-emerald-500/5');
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = window.XLSX.read(ev.target.result, {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = window.XLSX.utils.sheet_to_json(ws, {defval:''});
      importedRows = raw.map(row => {
        const obj = {};
        const keyMap = {}; // normalized_key -> original_key (for mapel names)
        Object.keys(row).forEach(k => {
          let nk = k.toLowerCase().trim().replace(/\s+/g,'_');
          // Jika key sudah ada (misal ada kolom "kompetensi_keahlian" dan "Kompetensi Keahlian"), jangan ditimpa!
          if (obj[nk] !== undefined) {
             let suffix = 2;
             while(obj[`${nk}_${suffix}`] !== undefined) suffix++;
             nk = `${nk}_${suffix}`;
          }
          obj[nk] = row[k];
          keyMap[nk] = k; // preserve original for mapel display
        });
        obj.__keyMap = keyMap; // attach for later use
        return obj;
      }).filter(r => r.nisn && r.nama);
      $('import-preview').classList.remove('hidden');
      $('import-preview-count').textContent = importedRows.length;
      $('btn-import-submit').disabled = importedRows.length === 0;
      showToast(`${importedRows.length} baris siap diimport`, 'info');
    };
    reader.readAsArrayBuffer(f);
  }

  // Klik zona → buka file picker
  if(dropZone){
    dropZone.addEventListener('click', e => {
      if(e.target.closest('input[type="file"]')) return;
      fileInput?.click();
    });
  }

  // File dipilih via input
  fileInput?.addEventListener('change', e => {
    processXlsxFile(e.target.files[0]);
  });

  // ── Drag events ──
  let dragDepth = 0;
  if(dropZone){
    dropZone.addEventListener('dragenter', e => {
      e.preventDefault();
      dragDepth++;
      if(overlay) overlay.style.opacity = '1';
      dropZone.classList.add('border-indigo-500');
      dropZone.classList.remove('border-slate-700');
    });
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    dropZone.addEventListener('dragleave', () => {
      if(--dragDepth <= 0){
        dragDepth = 0;
        if(overlay) overlay.style.opacity = '0';
        // Kembalikan border hanya jika belum ada file sukses
        if(!importedRows.length){
          dropZone.classList.remove('border-indigo-500','border-emerald-500','bg-emerald-500/5');
          dropZone.classList.add('border-slate-700');
        }
      }
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      if(overlay) overlay.style.opacity = '0';
      const f = e.dataTransfer.files[0];
      processXlsxFile(f);
    });
  }

  $('btn-import-submit')?.addEventListener('click', async () => {
    const btn = $('btn-import-submit');
    if (btn && btn.textContent.trim() === 'Tutup') {
      modalClose('modal-import');
      return;
    }
    if(!importedRows.length) return;
    const rows = importedRows.map(row => {
      // Baca kompetensi/peminatan dari berbagai nama kolom yang mungkin
      let jurusanVal = String(
        row.jurusan ||
        row.kompetensi_keahlian ||
        row['kompetensi keahlian'] ||
        row['kompetensi_keahlian_(wajib-smk)'] ||
        row.peminatan ||
        row['peminatan_(opsional-sma)'] ||
        row.jurusan_peminatan ||
        row['jurusan_peminatan_(opsional)'] ||
        ''
      ).trim();

      const siswa = {
        nisn:String(row.nisn||'').trim(),
        nama:String(row.nama||'').trim(),
        jenis_kelamin:row.jenis_kelamin||'L', // PHP will normalize L/P/Laki-laki/Perempuan
        tempat_lahir:row.tempat_lahir||'',
        kelas:row.kelas||'',
        status:(row.status||'LULUS').toString().toUpperCase(),
        kompetensi_keahlian: jurusanVal || null,
      };
      const tgl = row.tanggal_lahir;
      if(tgl instanceof Date) {
        const y = tgl.getFullYear();
        const m = String(tgl.getMonth() + 1).padStart(2, '0');
        const d = String(tgl.getDate()).padStart(2, '0');
        siswa.tanggal_lahir = `${y}-${m}-${d}`;
      }
      else if(tgl) siswa.tanggal_lahir = String(tgl).slice(0,10);
      else siswa.tanggal_lahir = null;
      
      // Extract nilai: use __keyMap to recover original (proper-cased) column names
      const keyMap = row.__keyMap || {};
      const BASE_SKIP = new Set(['no','nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir','kelas','jurusan','kompetensi_keahlian','kompetensi keahlian','kompetensi_keahlian_(wajib-smk)','peminatan','peminatan_(opsional-sma)','jurusan_peminatan','jurusan_peminatan_(opsional)','status','rata-rata','rata_rata','__keymap']);
      const nilai = [];
      Object.keys(row).forEach((nk, i) => {
        const lowerKey = nk.toLowerCase();
        if(BASE_SKIP.has(lowerKey)) return;
        if(nk === '__keyMap') return;
        
        const originalName = keyMap[nk] || nk; // original casing from Excel
        const v = parseFloat(row[nk]);
        if(!isNaN(v) && originalName) nilai.push({mapel: originalName, nilai: v, urutan: i});
      });
      siswa.nilai = nilai;
      return siswa;
    });

    $('btn-import-submit').textContent = 'Memproses...';
    $('btn-import-submit').disabled = true;
    const r = await fetch('/api/siswa.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'import_json', rows})});
    const res = await r.json();
    $('btn-import-submit').textContent = 'Proses Import';
    $('btn-import-submit').disabled = false;
    const log = `✅ Berhasil: ${res.imported||0} baris\n⚠️ Dilewati: ${res.skipped||0} baris${(res.errors||[]).length?'\n\n'+res.errors.join('\n'):''}`;
    $('import-result').textContent = log;
    $('import-result').classList.remove('hidden');
    if(res.success){ 
      showToast(`Import selesai: ${res.imported} berhasil`, 'success'); 
      $('btn-import-submit').textContent = 'Tutup';
      await loadAndRenderSiswa(); 
    }
    else showToast(res.error||'Import gagal', 'error');
  });

  $('btn-download-template')?.addEventListener('click', e => {
    e.preventDefault(); downloadTemplate();
  });

  $('modal-import-close')?.addEventListener('click', () => modalClose('modal-import'));
  $('modal-import-cancel')?.addEventListener('click', () => modalClose('modal-import'));
}

function downloadTemplate(){
  const XLSXS=window.XLSX;
  const jenjang=((allData?._meta?.jenjang)||'').toUpperCase();
  const isSmk=jenjang==='SMK';

  // ── Daftar mapel sesuai template SKL Kemdikbud ──────────────────────────────
  const mapelSma=[
    // Wajib
    'Pendidikan Agama dan Budi Pekerti',
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam',
    'Ilmu Pengetahuan Sosial',
    'Bahasa Inggris',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Informatika',
    'Sejarah',
    'Seni Budaya dan Prakarya',
    // Pilihan (5 slot)
    'Mapel Pilihan 1',
    'Mapel Pilihan 2',
    'Mapel Pilihan 3',
    'Mapel Pilihan 4',
    'Mapel Pilihan 5',
    // Muatan Lokal
    'Muatan Lokal',
  ];

  const mapelSmk=[
    // Umum
    'Pendidikan Agama dan Budi Pekerti',
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Sejarah',
    'Seni dan Budaya',
    // Kejuruan
    'Matematika',
    'Bahasa Inggris',
    'Informatika',
    'Projek Ilmu Pengetahuan Alam dan Sosial',
    'Dasar-dasar Program Keahlian',
    'Konsentrasi Keahlian',
    'Projek Kreativitas Inovasi dan Kewirausahaan',
    'Praktik Kerja Lapangan',
    // Pilihan (3 slot)
    'Mapel Pilihan 1',
    'Mapel Pilihan 2',
    'Mapel Pilihan 3',
    // Muatan Lokal
    'Muatan Lokal',
  ];

  const mapelList = isSmk ? mapelSmk : mapelSma;
  const kompetensiLabel = isSmk ? 'kompetensi_keahlian' : 'peminatan';
  const kompetensiExample = isSmk ? 'Rekayasa Perangkat Lunak' : 'IPA';

  // ── Header & contoh data ────────────────────────────────────────────────────
  const headers = [
    'nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir',
    'kelas', kompetensiLabel, 'status',
    ...mapelList
  ];
  const example = [
    '0012345678','Ahmad Fauzi','L','Jakarta','2006-05-15',
    isSmk ? 'XII RPL 1' : 'XII IPA 1', kompetensiExample, 'LULUS',
    ...mapelList.map((_,i) => i < (isSmk ? 14 : 11) ? 80 : '')
  ];

  // ── Build worksheet ─────────────────────────────────────────────────────────
  const ws = XLSXS.utils.aoa_to_sheet([headers, example]);
  const hStyle = {
    font:{bold:true,color:{rgb:'FFFFFF'},sz:10},
    fill:{fgColor:{rgb:'4F46E5'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true}
  };
  const exStyle = {
    fill:{fgColor:{rgb:'F8FAFC'}},
    font:{color:{rgb:'1E293B'},sz:10},
    border:{top:{style:'thin',color:{rgb:'E2E8F0'}},bottom:{style:'thin',color:{rgb:'E2E8F0'}},left:{style:'thin',color:{rgb:'E2E8F0'}},right:{style:'thin',color:{rgb:'E2E8F0'}}}
  };
  headers.forEach((_,i)=>{
    const ch=XLSXS.utils.encode_cell({r:0,c:i});
    if(ws[ch])ws[ch].s=hStyle;
    const ce=XLSXS.utils.encode_cell({r:1,c:i});
    if(ws[ce])ws[ce].s={...exStyle,alignment:{horizontal:i<8?'left':'center'}};
  });

  // Catatan
  const noteText = isSmk
    ? '⚠️ Kolom kompetensi_keahlian WAJIB diisi untuk SMK. Isi nilai mapel yang relevan, kosongkan slot Mapel Pilihan jika tidak ada.'
    : '⚠️ Kolom peminatan opsional untuk SMA/MA. Isi nilai mapel yang relevan, kosongkan slot Mapel Pilihan yang tidak digunakan.';
  XLSXS.utils.sheet_add_aoa(ws,[[noteText]], {origin:'A3'});
  const nc=XLSXS.utils.encode_cell({r:2,c:0});
  if(ws[nc])ws[nc].s={font:{bold:true,italic:true,color:{rgb:'DC2626'},sz:9}};
  ws['!merges']=[{s:{r:2,c:0},e:{r:2,c:headers.length-1}}];

  // Lebar kolom
  ws['!cols']=[
    {wch:14},{wch:24},{wch:14},{wch:16},{wch:14},{wch:14},{wch:32},{wch:10},
    ...mapelList.map(()=>({wch:30}))
  ];
  ws['!rows']=[{hpt:30},{hpt:18},{hpt:36}];

  // ── Sheet Panduan Mapel ─────────────────────────────────────────────────────
  const panduanData = [
    ['Sub-Kategori','Nama Kolom (Mapel)','Keterangan'],
    ...(isSmk ? [
      ['Mapel Umum','Pendidikan Agama dan Budi Pekerti','Wajib diisi'],
      ['Mapel Umum','Pendidikan Pancasila','Wajib diisi'],
      ['Mapel Umum','Bahasa Indonesia','Wajib diisi'],
      ['Mapel Umum','Pendidikan Jasmani Olahraga dan Kesehatan','Wajib diisi'],
      ['Mapel Umum','Sejarah','Wajib diisi'],
      ['Mapel Umum','Seni dan Budaya','Wajib diisi'],
      ['Mapel Kejuruan','Matematika','Wajib diisi'],
      ['Mapel Kejuruan','Bahasa Inggris','Wajib diisi'],
      ['Mapel Kejuruan','Informatika','Wajib diisi'],
      ['Mapel Kejuruan','Projek Ilmu Pengetahuan Alam dan Sosial','Wajib diisi'],
      ['Mapel Kejuruan','Dasar-dasar Program Keahlian','Wajib diisi'],
      ['Mapel Kejuruan','Konsentrasi Keahlian','Wajib diisi'],
      ['Mapel Kejuruan','Projek Kreativitas Inovasi dan Kewirausahaan','Wajib diisi'],
      ['Mapel Kejuruan','Praktik Kerja Lapangan','Wajib diisi'],
      ['Mapel Pilihan','Mapel Pilihan 1','Opsional — ganti nama sesuai mapel'],
      ['Mapel Pilihan','Mapel Pilihan 2','Opsional — kosongkan nilai jika tidak ada'],
      ['Mapel Pilihan','Mapel Pilihan 3','Opsional — kosongkan nilai jika tidak ada'],
      ['Muatan Lokal','Muatan Lokal','Opsional'],
    ] : [
      ['Mapel Wajib','Pendidikan Agama dan Budi Pekerti','Wajib diisi'],
      ['Mapel Wajib','Pendidikan Pancasila','Wajib diisi'],
      ['Mapel Wajib','Bahasa Indonesia','Wajib diisi'],
      ['Mapel Wajib','Matematika','Wajib diisi'],
      ['Mapel Wajib','Ilmu Pengetahuan Alam','Wajib diisi'],
      ['Mapel Wajib','Ilmu Pengetahuan Sosial','Wajib diisi'],
      ['Mapel Wajib','Bahasa Inggris','Wajib diisi'],
      ['Mapel Wajib','Pendidikan Jasmani Olahraga dan Kesehatan','Wajib diisi'],
      ['Mapel Wajib','Informatika','Wajib diisi'],
      ['Mapel Wajib','Sejarah','Wajib diisi'],
      ['Mapel Wajib','Seni Budaya dan Prakarya','Wajib diisi'],
      ['Mapel Pilihan','Mapel Pilihan 1','Opsional — ganti nama sesuai peminatan'],
      ['Mapel Pilihan','Mapel Pilihan 2','Opsional — kosongkan nilai jika tidak ada'],
      ['Mapel Pilihan','Mapel Pilihan 3','Opsional — kosongkan nilai jika tidak ada'],
      ['Mapel Pilihan','Mapel Pilihan 4','Opsional — kosongkan nilai jika tidak ada'],
      ['Mapel Pilihan','Mapel Pilihan 5','Opsional — kosongkan nilai jika tidak ada'],
      ['Muatan Lokal','Muatan Lokal','Opsional'],
    ])
  ];
  const wsPanduan = XLSXS.utils.aoa_to_sheet(panduanData);
  const pH = {font:{bold:true,color:{rgb:'FFFFFF'},sz:10},fill:{fgColor:{rgb:'0F172A'}},alignment:{horizontal:'center'}};
  ['A1','B1','C1'].forEach(ref=>{if(wsPanduan[ref])wsPanduan[ref].s=pH;});
  wsPanduan['!cols']=[{wch:20},{wch:46},{wch:38}];

  // ── Export ──────────────────────────────────────────────────────────────────
  const wb = XLSXS.utils.book_new();
  XLSXS.utils.book_append_sheet(wb, ws, 'Template Import');
  XLSXS.utils.book_append_sheet(wb, wsPanduan, 'Panduan Mapel');
  XLSXS.writeFile(wb, `template-import-siswa-${jenjang||'umum'}.xlsx`);
  showToast('Template didownload! Lihat sheet "Panduan Mapel" untuk petunjuk kolom nilai.','success');
}

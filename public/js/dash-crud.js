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
  // kompetensi_keahlian ditambahkan setelah kelas (opsional, bisa kosong)
  const headers=['No','NISN','Nama','Jenis Kelamin','Tempat Lahir','Tanggal Lahir','Kelas','Kompetensi Keahlian','Status',...mapelCols,'Rata-Rata'];
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
  XLSXS.writeFile(wb,`data-siswa-${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('Export XLSX berhasil!','success');
}

// ── IMPORT XLSX ──
function initImport(){
  // BASE_COLS: kolom yang bukan nilai mata pelajaran
  // kompetensi_keahlian ditambahkan agar tidak dianggap mapel
  const BASE_COLS_SET=new Set(['nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir','kelas','kompetensi_keahlian','kompetensi keahlian','status','no','rata-rata','rata_rata']);
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
      // Baca jurusan atau kompetensi_keahlian dari file
      let jurusanVal = String(row.jurusan || row.kompetensi_keahlian || row['kompetensi keahlian'] || '').trim();

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
      if(tgl instanceof Date) siswa.tanggal_lahir = tgl.toISOString().slice(0,10);
      else if(tgl) siswa.tanggal_lahir = String(tgl).slice(0,10);
      else siswa.tanggal_lahir = null;
      
      // Extract nilai: use __keyMap to recover original (proper-cased) column names
      const keyMap = row.__keyMap || {};
      const BASE_SKIP = new Set(['no','nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir','kelas','jurusan','kompetensi_keahlian','kompetensi keahlian','status','rata-rata','rata_rata','__keymap']);
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
  // kompetensi_keahlian ditambahkan sebagai kolom opsional (kolom ke-8)
  // Untuk SMK/SMA: isi dengan nama program keahlian masing-masing siswa
  // Untuk SMP/MTs/MA: boleh dikosongkan
  const headers=['nisn','nama','jenis_kelamin','tempat_lahir','tanggal_lahir','kelas','kompetensi_keahlian','status','Matematika','Bahasa Indonesia','Bahasa Inggris'];
  const example=['0012345678','Ahmad Fauzi','L','Jakarta','2006-05-15','XII RPL 1','Rekayasa Perangkat Lunak','LULUS',85,78,82];
  const ws=XLSXS.utils.aoa_to_sheet([headers,example]);
  const hStyle={font:{bold:true,color:{rgb:'FFFFFF'},sz:11},fill:{fgColor:{rgb:'4F46E5'}},alignment:{horizontal:'center'}};
  headers.forEach((_,i)=>{const c=XLSXS.utils.encode_cell({r:0,c:i});if(ws[c])ws[c].s=hStyle;});
  // Style example row
  headers.forEach((_,i)=>{
    const c=XLSXS.utils.encode_cell({r:1,c:i});
    if(ws[c])ws[c].s={fill:{fgColor:{rgb:'FFFFFF'}},font:{color:{rgb:'1E293B'},sz:10},alignment:{horizontal:i<8?'left':'center'},border:{top:{style:'thin',color:{rgb:'E2E8F0'}},bottom:{style:'thin',color:{rgb:'E2E8F0'}},left:{style:'thin',color:{rgb:'E2E8F0'}},right:{style:'thin',color:{rgb:'E2E8F0'}}}};
  });
  // Note row: kompetensi_keahlian adalah opsional
  const note=[['⚠️ Catatan:','','','','','','Kompetensi Keahlian opsional (SMK/SMA). Kosongkan jika tidak digunakan.','','','','']];
  XLSXS.utils.sheet_add_aoa(ws,note,{origin:'A3'});
  const noteCell=XLSXS.utils.encode_cell({r:2,c:0});
  if(ws[noteCell])ws[noteCell].s={font:{bold:true,color:{rgb:'DC2626'},sz:9}};
  const noteCell2=XLSXS.utils.encode_cell({r:2,c:6});
  if(ws[noteCell2])ws[noteCell2].s={font:{italic:true,color:{rgb:'6B7280'},sz:9}};

  ws['!cols']=headers.map((_,i)=>({wch:i===1?22:i===6?28:i<8?16:14}));
  const wb=XLSXS.utils.book_new(); XLSXS.utils.book_append_sheet(wb,ws,'Template');
  XLSXS.writeFile(wb,'template-import-siswa.xlsx');
  showToast('Template didownload!','success');
}

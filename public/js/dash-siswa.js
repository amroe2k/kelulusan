// Siswa CRUD + Table rendering
let currentSiswaPage = 1;
const itemsPerPage = 5;

async function loadAndRenderSiswa(){
  try{
    const r=await fetch('/api/siswa.php');
    const d=await r.json();
    if(!d.success){
      showToast(d.error||'Sesi berakhir, silakan login ulang','error');
      if(d.error==='Unauthorized') window.location.href='/login';
      return;
    }
    allSiswa=d.data||[];
    // Reset search/filter saat load fresh
    const si=$('search-siswa'); if(si) si.value='';
    currentSiswaPage = 1;
    // Populate kelas filter dropdown
    const kelasSet=[...new Set(allSiswa.map(s=>s.kelas).filter(Boolean))].sort();
    const fk=$('filter-kelas');
    if(fk){
      const cur=fk.value;
      fk.innerHTML='<option value="">Semua Kelas</option>'+kelasSet.map(k=>`<option value="${k}">${k}</option>`).join('');
      fk.value=cur;
    }
    renderSiswaTable(allSiswa);
    if(typeof renderOverview==='function') renderOverview();
  }catch(e){showToast('Gagal memuat data siswa','error');}
}

function renderSiswaTable(list){
  const search=($('search-siswa')?.value||'').toLowerCase();
  const filter=$('filter-status')?.value||'';
  const filterKelas=$('filter-kelas')?.value||'';
  const isGuru=auth?.role==='guru';
  const kelasFilter=isGuru?(auth.kelas||''):''; // guru only sees their kelas
  const isAdmin=auth?.role==='admin';

  let rows=list.filter(s=>{
    if(kelasFilter&&!s.kelas.includes(kelasFilter))return false;
    if(filterKelas&&s.kelas!==filterKelas)return false;
    if(search&&!s.nama.toLowerCase().includes(search)&&!String(s.nisn||'').includes(search))return false;
    if(filter&&s.status!==filter)return false;
    return true;
  });

  if($('table-count'))$('table-count').textContent=`${rows.length} Data Ditampilkan`;
  const tbody=$('siswa-table'); tbody.innerHTML='';

  // Pagination logic
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1;
  if (currentSiswaPage > totalPages) currentSiswaPage = totalPages;
  const startIndex = (currentSiswaPage - 1) * itemsPerPage;
  const paginatedRows = rows.slice(startIndex, startIndex + itemsPerPage);

  const pagContainer = $('pagination-container');
  if(pagContainer) {
    if(rows.length > itemsPerPage) {
      pagContainer.classList.remove('hidden');
      $('page-indicator').textContent = `${currentSiswaPage} / ${totalPages}`;
      $('btn-prev-page').disabled = currentSiswaPage === 1;
      $('btn-next-page').disabled = currentSiswaPage === totalPages;
    } else {
      pagContainer.classList.add('hidden');
    }
  }

  paginatedRows.forEach(s=>{
    const isLulus=s.status==='LULUS';
    const tr=document.createElement('tr');
    tr.className='hover:bg-[#131b2c] transition-colors';
    tr.innerHTML=`
      <td class="px-4 py-3 text-center"><input type="checkbox" class="row-check w-4 h-4 accent-indigo-500 cursor-pointer" data-id="${s.id}"></td>
      <td class="px-4 py-3"><p class="text-sm font-bold text-white">${s.nama}</p><div class="flex items-center gap-1.5 group"><p class="text-xs text-slate-500 font-mono">${s.nisn||''}</p>${s.nisn?`<button class="copy-nisn opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-indigo-400" data-nisn="${s.nisn}" title="Salin NISN"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>`:''}</div></td>
      <td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded-md bg-[#172033] border border-slate-700 text-xs font-medium text-slate-300">${s.kelas}</span></td>
      <td class="px-4 py-3 text-center"><span class="text-sm font-bold ${parseFloat(s.rata_rata||0)>=75?'text-emerald-400':'text-rose-400'}">${s.rata_rata?parseFloat(s.rata_rata).toFixed(1):'-'}</span></td>
      <td class="px-4 py-3 text-center">
        <button class="toggle-status status-pill ${isLulus?'lulus':'tidak'}" data-id="${s.id}" data-status="${s.status}">
          ${isLulus?`<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`:`<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`}
          <span class="mt-px">${s.status}</span>
        </button>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-detail-siswa p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors" data-id="${s.id}" title="Detail Siswa"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
          <button class="btn-edit-siswa p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors" data-id="${s.id}" title="Edit"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          ${isAdmin?`<button class="btn-del-siswa p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors" data-id="${s.id}" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`:``}
        </div>
      </td>`,
    tbody.appendChild(tr);
  });

  // Copy NISN
  tbody.querySelectorAll('.copy-nisn').forEach(btn=>{
    btn.onclick=()=>{
      const nisn = btn.dataset.nisn;
      navigator.clipboard.writeText(nisn).then(()=>{
        showToast('NISN ' + nisn + ' disalin!', 'success');
      }).catch(()=>{
        showToast('Gagal menyalin NISN', 'error');
      });
    };
  });

  // Toggle status
  tbody.querySelectorAll('.toggle-status').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.id,cur=btn.dataset.status,next=cur==='LULUS'?'TIDAK LULUS':'LULUS';
      btn.innerHTML='<span class="animate-pulse text-xs">...</span>';
      const r=await fetch('/api/siswa.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_status',keys:[id],status:next})});
      const res=await r.json();
      if(res.success){const s=allSiswa.find(x=>x.id===id);if(s)s.status=next;renderSiswaTable(allSiswa);showToast('Status diperbarui','success');}
      else showToast('Gagal','error');
    };
  });

  // Detail
  tbody.querySelectorAll('.btn-detail-siswa').forEach(btn=>{
    btn.onclick=()=>openSiswaDetail(allSiswa.find(s=>s.id===btn.dataset.id));
  });

  // Edit
  tbody.querySelectorAll('.btn-edit-siswa').forEach(btn=>{
    btn.onclick=()=>openSiswaModal(allSiswa.find(s=>s.id===btn.dataset.id));
  });

  // Delete
  tbody.querySelectorAll('.btn-del-siswa').forEach(btn=>{
    btn.onclick=()=>{
      const s=allSiswa.find(x=>x.id===btn.dataset.id);
      showConfirm(`Hapus ${s?.nama}?`,'Data tidak dapat dikembalikan.',async()=>{
        const r=await fetch('/api/siswa.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:btn.dataset.id})});
        const res=await r.json();
        if(res.success){allSiswa=allSiswa.filter(x=>x.id!==btn.dataset.id);renderSiswaTable(allSiswa);showToast('Data dihapus','success');}
        else showToast(res.error||'Gagal','error');
      });
    };
  });

  // Check-all
  $('check-all').onchange=e=>{tbody.querySelectorAll('.row-check').forEach(c=>c.checked=e.target.checked);updateBulkButtons();};
  tbody.querySelectorAll('.row-check').forEach(c=>c.onchange=updateBulkButtons);
}

function updateBulkButtons(){
  const n=document.querySelectorAll('.row-check:checked').length;
  $('btn-bulk-lulus')?.classList.toggle('hidden',!n);
  $('btn-bulk-tidak')?.classList.toggle('hidden',!n);
  $('selected-count')?.classList.toggle('hidden',!n);
  if($('selected-count'))$('selected-count').textContent=`${n} Dipilih`;
}

async function applyBulk(st){
  const ids=Array.from(document.querySelectorAll('.row-check:checked')).map(c=>c.dataset.id);
  if(!ids.length)return;
  const r=await fetch('/api/siswa.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_status',keys:ids,status:st})});
  const res=await r.json();
  if(res.success){ids.forEach(id=>{const s=allSiswa.find(x=>x.id===id);if(s)s.status=st;});$('check-all').checked=false;updateBulkButtons();renderSiswaTable(allSiswa);showToast(`${res.updated} status diperbarui!`,'success');}
  else showToast('Gagal','error');
}

// --- Detail Siswa Modal ----------------------------------------------------
function openSiswaDetail(s) {
  if(!s) return;
  const modal = $('modal-detail-siswa');
  if(!modal) return;

  // Header
  const isLulus = s.status === 'LULUS';
  const avatarEl = $('detail-avatar');
  const initials = s.nama.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  if(avatarEl){ avatarEl.textContent=initials; avatarEl.className=`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm border ${isLulus?'bg-emerald-200 text-emerald-800 border-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-300 dark:border-transparent':'bg-rose-200 text-rose-800 border-rose-300 dark:bg-rose-500/30 dark:text-rose-300 dark:border-transparent'}`; }
  if($('detail-nama'))     $('detail-nama').textContent     = s.nama;
  if($('detail-nisn'))     $('detail-nisn').textContent     = s.nisn_display || s.nisn || '-';
  if($('detail-kelas'))    $('detail-kelas').textContent    = s.kelas || '-';
  if($('detail-jk'))       $('detail-jk').textContent       = s.jenis_kelamin==='L'?'Laki-laki':'Perempuan';
  if($('detail-ttl'))      $('detail-ttl').textContent      = `${s.tempat_lahir||'-'}, ${s.tanggal_lahir_display||'-'}`;
  if($('detail-rata'))     $('detail-rata').textContent     = s.rata_rata ? parseFloat(s.rata_rata).toFixed(2) : '-';

  // Status badge
  const statusEl = $('detail-status');
  if(statusEl){
    statusEl.textContent = s.status;
    statusEl.className = `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${isLulus?'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':'bg-rose-500/15 text-rose-400 border-rose-500/30'}`;
  }

  // Nilai table
  const tbody = $('detail-nilai-tbody');
  if(tbody){
    if(s.nilai && s.nilai.length){
      tbody.innerHTML = s.nilai.map((n,i)=>`
        <tr class="border-b border-slate-800/50 hover:bg-[#131b2c] transition-colors">
          <td class="px-4 py-2.5 text-center text-xs text-slate-500">${i+1}</td>
          <td class="px-4 py-2.5 text-sm text-slate-300">${n.mapel}</td>
          <td class="px-4 py-2.5 text-center text-sm font-bold ${parseFloat(n.nilai)>=75?'text-emerald-400':'text-rose-400'}">${parseFloat(n.nilai).toFixed(0)}</td>
        </tr>`).join('');
    } else {
      tbody.innerHTML='<tr><td colspan="3" class="px-4 py-6 text-center text-slate-600 text-xs">Belum ada data nilai</td></tr>';
    }
  }

  // Preview SKL button — uses shared openSklModal with SKL1 as default
  const btnPreview = $('detail-btn-preview-skl');
  if(btnPreview){
    btnPreview.onclick = () => {
      modalClose('modal-detail-siswa');
      if(typeof window._openSklModal === 'function'){
        window._openSklModal(s, s.nilai, 'skl1');
      } else {
        // Fallback: direct render
        const meta = allData?._meta || {};
        const html = buildSklPreviewHtml(meta, s, s.nilai, 'skl1');
        const iframe = $('skl-iframe');
        if(iframe) iframe.srcdoc = html;
        const sv = parseInt($('skl-scale')?.value||65);
        const wrap = $('skl-preview-wrap');
        if(wrap) wrap.style.transform=`scale(${sv/100})`;
        if($('skl-scale-val')) $('skl-scale-val').textContent=sv+'%';
        modalOpen('modal-skl-preview');
      }
    };
  }

  // Edit button
  const btnEdit = $('detail-btn-edit');
  if(btnEdit) btnEdit.onclick = () => { modalClose('modal-detail-siswa'); openSiswaModal(s); };

  modalOpen('modal-detail-siswa');
}

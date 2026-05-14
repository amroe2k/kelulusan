// Identitas, Pengguna, Sync, Init

// ── Konstanta Global ──────────────────────────────────────────────────────
const VALID_VIEWS = ['overview','lembaga','identitas','siswa-data','pengguna','json-history','sync','profile'];
// ─── Asset helpers ───
function getAssetEnabled(field){
  return localStorage.getItem('asset_'+field+'_enabled') !== '0';
}
function setAssetEnabled(field, val){
  localStorage.setItem('asset_'+field+'_enabled', val ? '1' : '0');
}
async function deleteAsset(field){
  showConfirm(
    'Hapus ' + {logo:'Logo',stempel:'Stempel',ttd:'Tanda Tangan',kop_surat:'Kop Surat'}[field],
    'Gambar akan dihapus permanen dari database. Lanjutkan?',
    async () => {
      const res = await (await fetch('/api/identitas.php',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({[field]: null})
      })).json();
      if(res.success){
        if(allData?._meta) allData._meta[field] = null;
        renderIdentitas();
        showToast('Gambar berhasil dihapus','success');
      } else showToast('Gagal menghapus gambar','error');
    }
  );
}
function applyAssetToggle(field){
  const enabled = getAssetEnabled(field);
  const img = $('view-'+field);
  const card = $('card-asset-'+field);
  if(img) img.style.opacity = enabled ? '1' : '0.3';
  if(card) card.style.borderColor = enabled ? '' : '#ef44442a';
}

function renderIdentitas(){
  if(!allData||!allData._meta)return;
  const m=allData._meta;
  $('id-sekolah').textContent=m.sekolah||'-'; $('id-npsn').textContent=m.npsn||'-'; $('id-nss').textContent=m.nss||'-';
  $('id-tapel').textContent=m.tahun_ajaran||'-'; $('id-alamat').textContent=m.alamat||'-';
  $('id-telepon').textContent=m.telepon||'-'; $('id-email').textContent=m.email||'-';
  $('id-kepsek').textContent=m.kepala_sekolah||'-';
  // Jabatan (opsional)
  if($('id-jabatan')){
    if(m.jabatan_kepsek){ $('id-jabatan').textContent=m.jabatan_kepsek; $('id-jabatan').classList.remove('hidden'); }
    else { $('id-jabatan').classList.add('hidden'); }
  }
  if($('id-nip')) {
    const mode = m.id_kepsek_mode || 'nip';
    if($('id-nip')) $('id-nip').textContent = m.nip_kepsek||'-';
    if($('id-nuptk')) $('id-nuptk').textContent = m.nuptk_kepsek||'-';
    // Badge aktif pada read view
    if($('id-id-kepsek-mode-badge')) {
      const badge = $('id-id-kepsek-mode-badge');
      if(mode==='nuptk'){
        badge.textContent='NUPTK Aktif di SKL';
        badge.className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400';
      } else {
        badge.textContent='NIP Aktif di SKL';
        badge.className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
      }
    }
  }
  $('id-tgl').textContent=m.tanggal_pengumuman ? formatTglDisplay(m.tanggal_pengumuman) : '-';
  // New fields
  if($('id-jenjang')) $('id-jenjang').textContent = m.jenjang||'SMA';
  if($('id-tgl-skl2')) $('id-tgl-skl2').textContent = m.tanggal_skl2 ? formatTglDisplay(m.tanggal_skl2) : '-';
  if($('id-kota')) $('id-kota').textContent = m.kota||'-';
  if($('id-kurikulum')) $('id-kurikulum').textContent = m.kurikulum||'Kurikulum Merdeka';
  if($('id-provinsi')) $('id-provinsi').textContent = m.provinsi||'-';
  // Konsentrasi Keahlian — only show for SMK
  const isSmkView = (m.jenjang||'').toUpperCase() === 'SMK';
  if($('view-konsentrasi-wrap')) $('view-konsentrasi-wrap').classList.toggle('hidden', !isSmkView);
  if($('id-konsentrasi')) $('id-konsentrasi').textContent = m.kompetensi_keahlian||'-';
  if($('id-nomor-surat')) {
    const mode = m.nomor_surat_mode || 'auto';
    if(mode === 'static') {
      if($('id-nomor-mode')) {
          $('id-nomor-mode').textContent = 'Statis';
          $('id-nomor-mode').className = 'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400';
      }
      $('id-nomor-surat').className = 'text-violet-600 dark:text-violet-400 font-mono text-sm font-medium bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 rounded-lg inline-block';
      $('id-nomor-surat').textContent = m.nomor_surat_statis ? m.nomor_surat_statis : '-';
    } else {
      if($('id-nomor-mode')) {
          $('id-nomor-mode').textContent = 'Auto';
          $('id-nomor-mode').className = 'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
      }
      $('id-nomor-surat').className = 'text-indigo-600 dark:text-indigo-400 font-mono text-sm font-medium bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg inline-block';
      $('id-nomor-surat').textContent = m.nomor_surat_suffix ? ('XXX'+m.nomor_surat_suffix) : '-';
    }
  }
  // Domain
  const fallbackDomain = 'namadomain.com';
  const displayDomain = m.domain ? m.domain : fallbackDomain;
  
  if($('id-domain')) $('id-domain').textContent = 'https://' + displayDomain;
  
  if($('id-pengumuman')) {
    const peng = (m.pengumuman || '').trim();
    if(peng) {
        $('id-pengumuman').innerHTML = peng;
        $('id-pengumuman').classList.remove('italic', 'text-slate-400');
    } else {
        $('id-pengumuman').textContent = '- Belum ada pengumuman -';
        $('id-pengumuman').classList.add('italic', 'text-slate-400');
    }
  }
  
  // Update URL di sync card
  const urlEl=$('upload-url-text');
  if(urlEl)urlEl.textContent=`https://${displayDomain}/admin-upload.php`;
  if(auth?.role==='admin')$('btn-edit-identitas')?.classList.remove('hidden');
  // Tampilkan gambar di view mode
  const setViewImg=(id,noId,delBtnId,src)=>{
    const img=$(id),no=$(noId),del=$(delBtnId);
    if(src){
      if(img){img.src=src;img.classList.remove('hidden');}
      if(no)no.classList.add('hidden');
      if(del){del.classList.remove('hidden');del.classList.add('flex');}
    } else {
      if(img){img.src='';img.classList.add('hidden');}
      if(no)no.classList.remove('hidden');
      if(del){del.classList.add('hidden');del.classList.remove('flex');}
    }
  };
  setViewImg('view-logo','no-logo','btn-del-logo',m.logo);
  setViewImg('view-stempel','no-stempel','btn-del-stempel',m.stempel);
  setViewImg('view-ttd','no-ttd','btn-del-ttd',m.ttd);

  setViewImg('view-kop_surat','no-kop_surat','btn-del-kop_surat', m.kop_surat);

  // ─── Kop Surat card visibility ───
  const kopCard = $('card-asset-kop_surat');
  if (kopCard) kopCard.classList.toggle('hidden', !m.kop_surat);

  $('view-assets')?.classList.toggle('hidden',!(m.logo||m.stempel||m.ttd||m.kop_surat));

  // ─── Bind delete buttons ───
  document.querySelectorAll('.asset-del-btn').forEach(btn => {
    btn.onclick = () => deleteAsset(btn.dataset.field);
  });

  // ─── Bind toggle switches ───
  const toggleLabels = {logo:'Logo',stempel:'Stempel',ttd:'Tanda Tangan',kop_surat:'Kop Surat'};
  ['logo','stempel','ttd','kop_surat'].forEach(field => {
    const toggle = $('toggle-'+field);
    if(!toggle) return;
    toggle.checked = getAssetEnabled(field);
    applyAssetToggle(field);
    toggle.onchange = () => {
      setAssetEnabled(field, toggle.checked);
      applyAssetToggle(field);
      showToast(toggleLabels[field] + (toggle.checked ? ' diaktifkan di SKL' : ' dinonaktifkan di SKL'), toggle.checked ? 'success' : 'warning');
    };
  });
}

async function renderPengguna(){
  try{
    const r=await fetch('/api/users.php'); const d=await r.json();
    const tbody=$('user-table'); if(!tbody)return; tbody.innerHTML='';
    (d.users||[]).forEach(u=>{
      const tr=document.createElement('tr'); tr.className='hover:bg-[#131b2c] transition-colors';
      const aktifBadge=(aktif)=>aktif!='0'
        ?`<button class="toggle-aktif aktif-badge aktif" title="Klik untuk nonaktifkan"><span class="mt-px">Aktif</span></button>`
        :`<button class="toggle-aktif aktif-badge nonaktif" title="Klik untuk aktifkan"><span class="mt-px">Non-aktif</span></button>`;
      tr.innerHTML=`<td class="px-6 py-4 font-mono text-xs text-slate-400">${u.username}</td><td class="px-6 py-4 text-sm font-bold text-white">${u.nama}</td><td class="px-6 py-4"><span class="role-badge ${u.role}"><span class="mt-px">${u.role}</span></span></td><td class="px-4 py-4 text-xs text-slate-400">${u.kelas||'-'}</td><td class="px-6 py-4 text-center" id="status-cell-${u.id}">${aktifBadge(u.aktif)}</td><td class="px-6 py-4 text-right"><div class="flex justify-end gap-2"><button class="btn-edit-user p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400" data-id="${u.id}" title="Edit"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button><button class="btn-del-user p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" data-id="${u.id}" data-nama="${u.nama}" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td>`;
      tbody.appendChild(tr);
      // Toggle aktif handler
      tr.querySelector('.toggle-aktif').onclick=async(e)=>{
        const btn=e.currentTarget; btn.textContent='...';
        const res=await(await fetch('/api/users.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle_aktif',id:u.id})})).json();
        if(res.success){
          const cell=$(`status-cell-${u.id}`);
          if(cell)cell.innerHTML=aktifBadge(res.aktif);
          cell?.querySelector('.toggle-aktif')?.addEventListener('click', arguments.callee); // re-attach
          showToast(res.aktif?'Akun diaktifkan':'Akun dinonaktifkan',res.aktif?'success':'warning');
          // Re-render cleanly
          u.aktif=res.aktif;
          renderPengguna();
        } else showToast(res.error||'Gagal','error');
      };
    });
    tbody.querySelectorAll('.btn-edit-user').forEach(btn=>{
      btn.onclick=async()=>{
        const uid=btn.dataset.id;
        const ur=(d.users||[]).find(x=>x.id===uid);
        if(!ur)return;
        $('modal-user-title').textContent='Edit Pengguna'; $('user-id').value=ur.id;
        $('user-username').value=ur.username; $('user-nama').value=ur.nama;
        $('user-role').value=ur.role; $('user-kelas').value=ur.kelas||'';
        $('user-password').value=''; modalOpen('modal-user');
      };
    });
    tbody.querySelectorAll('.btn-del-user').forEach(btn=>{
      btn.onclick=()=>showConfirm(`Hapus ${btn.dataset.nama}?`,'Akun ini akan dihapus.',async()=>{
        const res=await(await fetch('/api/users.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:btn.dataset.id})})).json();
        if(res.success){showToast('Akun dihapus','success');renderPengguna();}else showToast(res.error||'Gagal','error');
      });
    });
  }catch(e){showToast('Gagal memuat pengguna','error');}
}



document.addEventListener('DOMContentLoaded',async()=>{
  console.log('[DASH-INIT] DOMContentLoaded START');
  try{auth=JSON.parse(sessionStorage.getItem('auth')||'null');}catch(e){auth=null;}
  if(!auth||auth.role==='siswa'){window.location.href='/login';return;}

  if($('sb-nama'))$('sb-nama').textContent=auth.nama||'';
  if($('sb-role'))$('sb-role').textContent=(auth.role||'admin').toUpperCase();
  if($('sb-avatar'))$('sb-avatar').textContent=(auth.nama||'A').charAt(0).toUpperCase();

  // SKL modal sekarang dikelola oleh dash-skl.js (self-contained)

  // Load saved avatar
  const _savedAvatar = localStorage.getItem(`avatar_${auth.id || auth.username}`);
  if (_savedAvatar && typeof applyAvatar === 'function') applyAvatar(_savedAvatar);

  // Show admin-only elements
  if(auth.role==='admin'){
    document.querySelectorAll('.admin-only').forEach(el=>el.classList.remove('hidden'));
  }

  // ─── Sidebar Collapse ───
  window.applySidebarCollapse = function(toggle) {
    const sb = $('dash-sidebar');
    const overlay = $('sidebar-overlay');
    if (!sb) return;
    
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
      if (toggle) {
        const isActive = sb.classList.toggle('mobile-active');
        if (overlay) overlay.classList.toggle('active', isActive);
      } else {
        sb.classList.remove('mobile-active');
        if (overlay) overlay.classList.remove('active');
      }
      return;
    }

    let collapsed = localStorage.getItem('sb-collapsed') === '1';
    if (toggle) {
      collapsed = !collapsed;
      localStorage.setItem('sb-collapsed', collapsed ? '1' : '0');
    }
    sb.classList.toggle('sb-collapsed', collapsed);
    sb.classList.toggle('collapsed', collapsed);
  };
  applySidebarCollapse(false); // init state dari localStorage

  $('btn-toggle-sidebar')?.addEventListener('click', () => applySidebarCollapse(true));

  const _logoutBtn=document.getElementById('btn-logout'); if(_logoutBtn) _logoutBtn.onclick = () => showConfirm(
    'Keluar Sistem',
    'Yakin ingin mengakhiri sesi aktif?',
    async () => {
      try { await fetch('/api/logout.php'); } catch(e) {}
      sessionStorage.removeItem('auth');
      window.location.href = '/login';
    }
  );
  console.log('[DASH-INIT] CP-1: after logout setup');

  // Load data.php (identitas) di background
  const t = Date.now();
  fetch(`/api/data.php?t=${t}`)
    .then(async r => {
      const text = await r.text();
      try { return JSON.parse(text); }
      catch(parseErr) {
        console.error('[data.php] Invalid JSON:', text.substring(0, 300));
        throw new Error('PHP response bukan JSON: ' + text.substring(0, 100));
      }
    })
    .then(d => {
      if (d?.error) {
        console.warn('[data.php] Error response:', d.error);
        const sbLembaga = $('sb-lembaga-nama');
        if(sbLembaga) sbLembaga.textContent = 'Tidak Ada Lembaga Aktif';
        return;
      }
      allData = d;
      // Tampilkan nama lembaga aktif di sidebar
      const namaLembaga = d?._meta?.lembaga_nama || d?._meta?.sekolah || '';
      const sbLembaga = $('sb-lembaga-nama');
      if(sbLembaga) sbLembaga.textContent = namaLembaga || 'Lembaga';
      
      // Selalu panggil renderIdentitas agar elemen global (seperti upload URL) ter-update
      if(typeof renderIdentitas === 'function') renderIdentitas();
      
      if(currentView==='overview') renderOverview();
    })
    .catch(e => {
      console.error('[data.php] Fetch error:', e);
      showToast('Gagal memuat data identitas: ' + e.message, 'error');
    });

  // --- Sidebar Toggle handled in applySidebarCollapse ---

  // Tentukan & switch view LANGSUNG
  const parts=window.location.pathname.split('/').filter(Boolean);
  const pv=parts[parts.length-1]||'overview';
  switchView(VALID_VIEWS.includes(pv)?pv:'overview');
  console.log('[DASH-INIT] CP-2: after switchView [BUILD:20260508-v3]');

  // Init lembaga modal events — wrapped in try-catch for safety
  try { if(typeof initLembagaView==='function') initLembagaView(); else console.warn('[DASH-INIT] initLembagaView not defined'); } catch(e){ console.error('[initLembagaView ERROR]',e); }
  console.log('[DASH-INIT] CP-2b: after initLembagaView');

  // Preload allSiswa SELALU supaya overview stats terpopulasi
  fetch(`/api/siswa.php?t=${t}`).then(r=>r.json()).then(d=>{
    if(d.success){ allSiswa=d.data||[]; if(currentView==='overview')renderOverview(); }
  }).catch(()=>{});
  console.log('[DASH-INIT] CP-2c: after siswa fetch');

  // --- Siswa events ---
  $('search-siswa')?.addEventListener('input',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('filter-status')?.addEventListener('change',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('filter-kompetensi')?.addEventListener('change',()=>{ currentSiswaPage=1; repopulateKelasByKompetensi($('filter-kompetensi').value); });
  $('filter-kelas')?.addEventListener('change',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('btn-prev-page')?.addEventListener('click',()=>{ if(currentSiswaPage>1) { currentSiswaPage--; renderSiswaTable(allSiswa); } });
  $('btn-next-page')?.addEventListener('click',()=>{ currentSiswaPage++; renderSiswaTable(allSiswa); });
  $('btn-bulk-lulus')?.addEventListener('click',()=>applyBulk('LULUS'));
  $('btn-bulk-tidak')?.addEventListener('click',()=>applyBulk('TIDAK LULUS'));
  // Footer variants (ID unik, bukan duplikat)
  $('btn-bulk-lulus-footer')?.addEventListener('click',()=>applyBulk('LULUS'));
  $('btn-bulk-tidak-footer')?.addEventListener('click',()=>applyBulk('TIDAK LULUS'));
  $('btn-bulk-delete')?.addEventListener('click',()=>deleteBulkSiswa());
  $('btn-hapus-semua')?.addEventListener('click',()=>deleteAllSiswa());
  $('btn-add-siswa')?.addEventListener('click',()=>openSiswaModal());
  $('btn-add-mapel')?.addEventListener('click',()=>addNilaiRow());
  $('form-siswa')?.addEventListener('submit',saveSiswa);
  $('modal-siswa-close')?.addEventListener('click',()=>modalClose('modal-siswa'));
  $('modal-siswa-cancel')?.addEventListener('click',()=>modalClose('modal-siswa'));
  console.log('[DASH-INIT] CP-2d: after siswa events');
  $('btn-import-siswa')?.addEventListener('click',()=>{
    // Reset result & preview
    $('import-result')?.classList.add('hidden');
    $('import-preview')?.classList.add('hidden');
    $('btn-import-submit').disabled=true;
    // Reset file input
    if($('xlsx-file-input')) $('xlsx-file-input').value='';
    // Reset drop zone ke state awal
    const dz=$('xlsx-drop-zone');
    if(dz){
      dz.classList.remove('border-emerald-500','bg-emerald-500/5','border-indigo-500');
      dz.classList.add('border-slate-700');
    }
    // Sembunyikan nama file
    const fn=$('xlsx-file-name');
    if(fn){ fn.textContent=''; fn.classList.add('hidden'); }
    // Reset overlay
    const ov=$('xlsx-drag-overlay');
    if(ov) ov.style.opacity='0';
    // Reset imported rows
    importedRows=[];
    if ($('btn-import-submit')) {
      $('btn-import-submit').textContent = 'Proses Import';
      $('btn-import-submit').disabled = true;
    }
    modalOpen('modal-import');
  });
  $('btn-export-siswa')?.addEventListener('click',exportXlsx);
  try { if(typeof initImport==='function') initImport(); } catch(e){ console.error('[initImport]',e); }
  console.log('[DASH-INIT] CP-3: after initImport, before Quill');

  // --- Initialize Quill Editor for Pengumuman ---
  // NOTE: quillPengumuman declared on window so the btn-edit-identitas click handler
  // (which is a closure) can access it reliably.
  window._quillPengumuman = null;
  try {
    if ($('editor-pengumuman') && typeof Quill !== 'undefined') {
      window._quillPengumuman = new Quill('#editor-pengumuman', {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'clean']
          ]
        },
        placeholder: 'Tuliskan pengumuman tambahan seperti jadwal cap 3 jari, pengambilan SKHU, dll...'
      });
      window._quillPengumuman.on('text-change', function() {
        if ($('input-pengumuman')) $('input-pengumuman').value = window._quillPengumuman.root.innerHTML;
      });

      // Add tooltips to buttons — guard against null container on hidden elements
      const titles = {
        'bold': 'Tebal (Ctrl+B)',
        'italic': 'Miring (Ctrl+I)',
        'underline': 'Garis Bawah (Ctrl+U)',
        'strike': 'Coret',
        'list': { 'ordered': 'Daftar Angka', 'bullet': 'Daftar Simbol' },
        'link': 'Tambah Tautan',
        'clean': 'Hapus Format'
      };
      const toolbarModule = window._quillPengumuman.getModule('toolbar');
      const toolbarContainer = toolbarModule?.container;
      if (toolbarContainer) {
        toolbarContainer.querySelectorAll('button, .ql-picker').forEach(el => {
          let type = Array.from(el.classList).find(c => c.startsWith('ql-'))?.replace('ql-', '');
          if (!type) return;
          let title = titles[type];
          if (typeof title === 'object') {
            const val = el.value || el.getAttribute('value');
            title = title[val] || type;
          }
          if (title) el.setAttribute('title', title);
        });
      }
    }
  } catch(quillErr) {
    console.warn('[DASH-INIT] Quill init error (non-fatal):', quillErr);
  }
  console.log('[DASH-INIT] CP-4: after Quill init');

  // --- Identitas events ---
  console.log('[DASH-INIT] Attaching btn-edit-identitas listener, btn exists:', !!$('btn-edit-identitas'));
  $('btn-edit-identitas')?.addEventListener('click',()=>{ try {
    if(!allData||!allData._meta){showToast('Data belum dimuat, coba lagi','warning');return;}
    const m=allData._meta;
    ['sekolah','npsn','nss','tapel','alamat','kepsek','jabatan','nip','nuptk','tgl','telepon','email','domain'].forEach(k=>{
      const map={sekolah:'sekolah',npsn:'npsn',nss:'nss',tapel:'tahun_ajaran',alamat:'alamat',kepsek:'kepala_sekolah',jabatan:'jabatan_kepsek',nip:'nip_kepsek',nuptk:'nuptk_kepsek',tgl:'tanggal_pengumuman',telepon:'telepon',email:'email',domain:'domain'};
      const el=$(`input-${k}`);
      if(el){
        let val=m[map[k]]||'';
        if(k==='tgl'&&val){const d=parseTgl(val);if(d)val=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
        el.value=val;
      }
    });
    // New fields prefill
    if($('input-jenjang')) $('input-jenjang').value = m.jenjang||'SMA';
    if($('input-kurikulum')) $('input-kurikulum').value = m.kurikulum||'Kurikulum Merdeka';
    if($('input-nomor-surat')) $('input-nomor-surat').value = m.nomor_surat_suffix||'';
    if($('input-nomor-surat-statis')) $('input-nomor-surat-statis').value = m.nomor_surat_statis||'';
    if($('input-pengumuman')) {
      $('input-pengumuman').value = m.pengumuman||'';
      if(window._quillPengumuman) window._quillPengumuman.root.innerHTML = m.pengumuman||'';
    }
    // Set radio mode
    const mode = m.nomor_surat_mode || 'auto';
    const radioAuto = $('mode-auto'), radioStatic = $('mode-static');
    if(radioAuto) radioAuto.checked = mode === 'auto';
    if(radioStatic) radioStatic.checked = mode === 'static';
    // Show correct section
    $('section-nomor-auto')?.classList.toggle('hidden', mode !== 'auto');
    $('section-nomor-static')?.classList.toggle('hidden', mode !== 'static');
    // Set id_kepsek_mode radio
    const idKepsekMode = m.id_kepsek_mode || 'nip';
    const radioNip = $('mode-id-nip'), radioNuptk = $('mode-id-nuptk');
    if(radioNip) radioNip.checked = idKepsekMode === 'nip';
    if(radioNuptk) radioNuptk.checked = idKepsekMode === 'nuptk';
    // Tampilkan section yang sesuai dengan mode aktif saat load
    $('section-nip')?.classList.toggle('hidden', idKepsekMode !== 'nip');
    $('section-nuptk')?.classList.toggle('hidden', idKepsekMode !== 'nuptk');
    // tanggal_skl2
    if($('input-tgl-skl2')){
      let v=m.tanggal_skl2||'';
      if(v){const d=parseTgl(v);if(d)v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
      $('input-tgl-skl2').value=v;
    }

    // Populate Provinsi via searchable-select
    if(typeof WILAYAH_DATA !== 'undefined'){
      ssSetOptions('wrap-provinsi', Object.keys(WILAYAH_DATA), m.provinsi||'');
      const selectedProv = m.provinsi||'';
      const kotaList = (selectedProv && WILAYAH_DATA[selectedProv]) ? WILAYAH_DATA[selectedProv] : [];
      ssSetOptions('wrap-kota', kotaList, m.kota||'');
      // When provinsi changes → repopulate kota
      const wrapProv = document.getElementById('wrap-provinsi');
      if(wrapProv) wrapProv._ssOnChange = (prov) => {
        const kl = (prov && WILAYAH_DATA[prov]) ? WILAYAH_DATA[prov] : [];
        ssSetOptions('wrap-kota', kl, '');
      };
    }
    // Reset semua zone (data-changed=false) lalu pre-fill gambar yg sudah ada
    document.querySelectorAll('.img-zone').forEach(z=>z.dataset.changed='false');
    prefillZone('input-logo',      m.logo);
    prefillZone('input-stempel',   m.stempel);
    prefillZone('input-ttd',       m.ttd);
    prefillZone('input-kop_surat', m.kop_surat);
    $('identitas-view')?.classList.add('hidden');
    $('identitas-edit')?.classList.remove('hidden');
    $('btn-edit-identitas')?.classList.add('hidden');
    // Radio toggle listener (attach once per open)
    document.querySelectorAll('[name="nomor_surat_mode"]').forEach(radio => {
      radio.onchange = () => {
        const isStatic = $('mode-static')?.checked;
        $('section-nomor-auto')?.classList.toggle('hidden', isStatic);
        $('section-nomor-static')?.classList.toggle('hidden', !isStatic);
      };
    });
    // id_kepsek_mode radio listener — toggle section NIP / NUPTK
    document.querySelectorAll('[name="id_kepsek_mode"]').forEach(radio => {
      radio.onchange = () => {
        const isNuptk = $('mode-id-nuptk')?.checked;
        $('section-nip')?.classList.toggle('hidden', isNuptk);
        $('section-nuptk')?.classList.toggle('hidden', !isNuptk);
      };
    });
  } catch(err) { console.error('[EditIdentitas]', err); showToast('Gagal membuka form: ' + err.message, 'error'); } });
  $('btn-cancel-identitas')?.addEventListener('click',()=>{
    $('identitas-edit')?.classList.add('hidden');
    $('identitas-view')?.classList.remove('hidden');
    $('btn-edit-identitas')?.classList.remove('hidden');
  });
  $('form-identitas')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const rawDomain=($('input-domain')?.value||'').trim().replace(/^https?:\/\//,'');
    const nomorMode = $('mode-static')?.checked ? 'static' : 'auto';
    const idKepsekMode = $('mode-id-nuptk')?.checked ? 'nuptk' : 'nip';
    const p={sekolah:$('input-sekolah').value,npsn:$('input-npsn').value,nss:$('input-nss').value,jenjang:$('input-jenjang')?.value||'SMA',kurikulum:$('input-kurikulum')?.value||'Kurikulum Merdeka',tahun_ajaran:$('input-tapel').value,alamat:$('input-alamat').value,provinsi:$('input-provinsi')?.value||'',kota:$('input-kota')?.value||'',kepala_sekolah:$('input-kepsek').value,jabatan_kepsek:$('input-jabatan')?.value||'',nip_kepsek:$('input-nip').value,nuptk_kepsek:$('input-nuptk')?.value||'',id_kepsek_mode:idKepsekMode,tanggal_pengumuman:$('input-tgl').value,tanggal_skl2:$('input-tgl-skl2')?.value||null,nomor_surat_mode:nomorMode,nomor_surat_suffix:$('input-nomor-surat')?.value||'',nomor_surat_statis:$('input-nomor-surat-statis')?.value||'',telepon:$('input-telepon')?.value||'',email:$('input-email')?.value||'',domain:rawDomain,pengumuman:$('input-pengumuman')?.value||''};
    // Hanya kirim gambar jika user benar-benar mengubahnya (data-changed='true')
    // Jika data-changed='clear', kirim null untuk hapus gambar dari DB
    document.querySelectorAll('.img-zone').forEach(zone=>{
      const col = zone.dataset.input.replace('input-',''); // 'logo','stempel','ttd'
      const changed = zone.dataset.changed;
      if(changed==='true'){
        const img=$(zone.dataset.preview);
        if(img&&img.src.startsWith('data:')) p[col]=img.src;
      } else if(changed==='clear'){
        p[col]=null;
      }
      // changed==='false' → tidak kirim → PHP pakai COALESCE (nilai lama)
    });
    const btn=e.target.querySelector('[type="submit"]');
    btn.textContent='Menyimpan...'; btn.disabled=true;
    const res=await(await fetch('/api/identitas.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();
    btn.textContent='Simpan Perubahan'; btn.disabled=false;
    if(res.success){
      Object.assign(allData._meta,p);
      $('identitas-edit')?.classList.add('hidden');
      $('identitas-view')?.classList.remove('hidden');
      $('btn-edit-identitas')?.classList.remove('hidden');
      renderIdentitas();
      showToast('Identitas disimpan!','success');
    } else showToast(res.error||'Gagal','error');
  });

  // --- User modal events ---
  $('btn-add-user')?.addEventListener('click',()=>{$('modal-user-title').textContent='Tambah Pengguna';$('user-id').value='';$('user-username').value='';$('user-nama').value='';$('user-role').value='guru';$('user-kelas').value='';$('user-password').value='';modalOpen('modal-user');});
  $('modal-user-close')?.addEventListener('click',()=>modalClose('modal-user'));
  $('modal-user-cancel')?.addEventListener('click',()=>modalClose('modal-user'));
  $('form-user')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const uid=$('user-id').value;
    const payload={action:uid?'update':'create',id:uid,username:$('user-username').value,nama:$('user-nama').value,role:$('user-role').value,kelas:$('user-kelas').value};
    const pw=$('user-password').value;
    if(pw)payload.password=pw;
    const res=await(await fetch('/api/users.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).json();
    if(res.success){modalClose('modal-user');renderPengguna();showToast(uid?'Pengguna diperbarui':'Pengguna ditambahkan','success');}
    else showToast(res.error||'Gagal','error');
  });

  // --- Sync event ---
  $('btn-generate-json')?.addEventListener('click', async () => {
    const pwd = $('input-sync-password')?.value;
    if (!pwd) { showToast('Password wajib diisi sebelum generate.', 'warning'); return; }

    const btn = $('btn-generate-json');
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating...';
    btn.disabled = true;

    try {
      const res = await (await fetch('/api/generate_json.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      })).json();

      $('input-sync-password').value = '';

      if (res.success) {
        $('sync-logs')?.classList.remove('hidden');
        if ($('sync-log-content')) $('sync-log-content').textContent = res.output || 'Sukses.';
        const matchTotal = (res.output || '').match(/Total\s*:\s*(\d+)/);
        const matchLulus = (res.output || '').match(/Lulus\s*:\s*(\d+)/);
        const totalStr = matchTotal ? ` ${matchTotal[1]} siswa` : '';
        const lulusStr = matchLulus ? `, ${matchLulus[1]} lulus` : '';
        showToast(`✓ Generate JSON berhasil!${totalStr}${lulusStr}`, 'success');
        loadArchiveList(); // refresh list setelah generate
        
        // Refresh allSiswa agar overview up-to-date
        fetch(`/api/siswa.php?t=${Date.now()}`).then(r=>r.json()).then(d=>{
          if(d.success){ 
            allSiswa=d.data||[]; 
            if(currentView==='overview') renderOverview(); 
          }
        });

        // Refresh indikator sinkronisasi
        if(typeof loadSyncStatus==='function') loadSyncStatus();
      } else {
        $('sync-logs')?.classList.remove('hidden');
        if ($('sync-log-content')) $('sync-log-content').textContent = res.error || res.output || 'Gagal.';
        showToast(res.error || 'Generate JSON gagal. Lihat log untuk detail.', 'error');
      }
    } catch (err) {
      showToast('Error koneksi: ' + err.message, 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  });



  // Init Profile Events
  if (typeof initProfileEvents === 'function') initProfileEvents();

  window.addEventListener('popstate',()=>{
    const parts=window.location.pathname.split('/').filter(Boolean);
    const pv=parts[parts.length-1]||'overview';
    const tv=VALID_VIEWS.includes(pv)?pv:'overview';
    if(currentView!==tv)switchView(tv);
  });

  // Init drag-drop zones SEKALI saat halaman siap
  initDragDrop();
  // Init searchable selects (Provinsi & Kota)
  if (typeof ssInitAll === 'function') ssInitAll();



  // --- Detail Siswa Modal closes ---
  $('modal-detail-close')?.addEventListener('click',()=>modalClose('modal-detail-siswa'));
  $('modal-detail-cancel')?.addEventListener('click',()=>modalClose('modal-detail-siswa'));
  $('modal-detail-siswa')?.addEventListener('click',e=>{
    if(e.target.id==='modal-detail-siswa') modalClose('modal-detail-siswa');
  });
  // SKL preview modal sekarang sepenuhnya dikelola oleh dash-skl.js



  // ─── Set Upload Password ───
  // Toggle panel
  $('btn-toggle-upload-pw')?.addEventListener('click', () => {
    const panel = $('upload-pw-panel');
    const icon  = $('icon-toggle-pw');
    if (!panel) return;
    const isHidden = panel.classList.toggle('hidden');
    if (icon) icon.style.transform = isHidden ? '' : 'rotate(180deg)';
  });

  // Eye toggle via event delegation
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button[data-eye-target]');
    if (!btn) return;
    const inputId = btn.dataset.inputTarget;
    const eyeId   = btn.dataset.eyeTarget;
    if (inputId && eyeId) togglePw(inputId, eyeId);
  }, { passive: true });

  $('form-upload-password')?.addEventListener('submit', async e => {
    e.preventDefault();
    const newPw  = $('input-upload-pw')?.value?.trim();
    const confPw = $('input-upload-pw-confirm')?.value?.trim();
    const adminPw = $('input-upload-admin-pw')?.value?.trim();

    if (!newPw || !confPw || !adminPw) { showToast('Semua field wajib diisi.','warning'); return; }
    if (newPw !== confPw) { showToast('Konfirmasi password tidak cocok.','error'); return; }
    if (newPw.length < 8) { showToast('Password minimal 8 karakter.','warning'); return; }

    const btn = $('btn-save-upload-pw');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="animate-pulse">Menyimpan...</span>';
    btn.disabled = true;

    try {
      const res = await fetch('/api/set-upload-password.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ new_password: newPw, confirm_password: confPw, admin_password: adminPw })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Password berhasil diperbarui.', 'success');
        // Reset form
        $('form-upload-password')?.reset();
      } else {
        showToast(json.error || 'Gagal memperbarui password.', 'error');
      }
    } catch(err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  });
});

// ── loadArchiveList: Render daftar arsip JSON di view-sync ─────────────────
async function loadArchiveList() {
  const container = document.getElementById('archive-list');
  if (!container) return;

  container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4 animate-pulse">Memuat arsip...</p>';

  try {
    const res = await fetch('/api/json-history.php');
    const data = await res.json();

    // Filter hanya yang punya file fisik (bukan auto-sync)
    const allArchives = (data.data || []).filter(r => r.file_name && r.file_exists);

    // Ambil 1 terbaru per lembaga (API sudah ORDER BY generated_at DESC)
    const seen = new Map();
    allArchives.forEach(r => {
      if (!seen.has(r.lembaga_id)) seen.set(r.lembaga_id, r);
    });
    const archives = [...seen.values()];

    if (archives.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 gap-2 text-slate-600">
          <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <p class="text-xs">Belum ada arsip — generate dulu di Langkah 1.</p>
        </div>`;
      return;
    }

    container.innerHTML = archives.map(r => {
      const kb   = r.file_size ? (r.file_size / 1024).toFixed(0) + ' KB' : '-';
      const tgl  = r.generated_at
        ? new Date(r.generated_at).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
        : '-';
      const nama = r.lembaga_nama || r.lembaga_slug || '-';
      const file = r.file_name;

      return `
        <div class="flex items-center justify-between gap-3 bg-[#0F1523] border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-white font-mono truncate" title="${file}">${file}</p>
              <p class="text-[10px] text-slate-500 mt-0.5 truncate">${nama} · ${kb} · ${tgl}</p>
            </div>
          </div>
          <a href="/exports/${encodeURIComponent(file)}" download="${file}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all flex-shrink-0 group-hover:border-emerald-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Unduh
          </a>
        </div>`;
    }).join('');

  } catch (e) {
    container.innerHTML = '<p class="text-xs text-rose-400 text-center py-4">Gagal memuat arsip.</p>';
  }
}

// -- Bundle Deploy Functions -----------------------------------------------

window.copyUploadUrl = function() {
  const text = document.getElementById('upload-url-text')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('URL upload berhasil disalin!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin URL.', 'error');
  });
};

async function populateBundleSelect() {
  const sel = document.getElementById('bundle-lembaga-select');
  if (!sel) return;
  try {
    const res  = await fetch('/api/lembaga.php');
    const data = await res.json();
    const list = data.data || data.lembaga || [];
    sel.innerHTML = list.length
      ? '<option value="">-- Pilih Lembaga --</option>' +
        list.map(l => `<option value="${l.id}">${l.nama}</option>`).join('')
      : '<option value="">Belum ada lembaga</option>';
  } catch { sel.innerHTML = '<option value="">Gagal memuat</option>'; }
}

async function createBundle() {
  const sel       = document.getElementById('bundle-lembaga-select');
  const btn       = document.getElementById('btn-create-bundle');
  const lembagaId = sel?.value;
  if (!lembagaId) { showToast('Pilih lembaga terlebih dahulu.', 'warning'); return; }
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Membuat Bundle...';
  btn.disabled = true;
  try {
    const res  = await fetch('/api/create-bundle.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lembaga_id: lembagaId })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('bundle-result')?.classList.remove('hidden');
      const n = document.getElementById('bundle-file-name');
      const m = document.getElementById('bundle-file-meta');
      const a = document.getElementById('bundle-download-link');
      if (n) n.textContent = data.zip_name;
      if (m) m.textContent = data.lembaga + ' · ' + data.size_kb + ' KB · ' + data.total_files + ' files';
      if (a) { a.href = data.zip_url; a.download = data.zip_name; }

      // ── Tampilkan badge build mode di hasil bundle ──
      const bdgEl = document.getElementById('bundle-build-badge');
      if (bdgEl) {
        if (data.build_mode === 'frontend') {
          bdgEl.innerHTML = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Frontend Only · <code class="font-mono opacity-80">${data.dist_used}</code>
            </span>`;
        } else {
          bdgEl.innerHTML = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Build Lengkap · <code class="font-mono opacity-80">${data.dist_used}</code>
            </span>`;
        }
        bdgEl.classList.remove('hidden');
      }

      // ── Tampilkan warning jika pakai build legacy ──
      if (data.build_mode_info) {
        showToast('⚠️ ' + data.build_mode_info, 'warning');
      }

      showToast('Bundle berhasil: ' + data.zip_name + ' (' + data.size_kb + ' KB)', 'success');
      if(typeof loadBundleList === 'function') loadBundleList(); // Refresh manajemen bundle
    } else {
      showToast(data.error || 'Gagal membuat bundle.', 'error');
    }
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

// ── Bundle Management: List, Delete, Delete All ──────────────────────────────

async function loadBundleList() {
  const container  = document.getElementById('bundle-list');
  const infoBar    = document.getElementById('bundle-storage-info');
  const infoText   = document.getElementById('bundle-storage-text');
  const countBadge = document.getElementById('bundle-count-badge');
  if (!container) return;

  // Animasi loading
  container.innerHTML = `
    <div class="flex items-center justify-center gap-2 py-6 text-slate-500">
      <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <span class="text-xs">Memuat daftar bundle...</span>
    </div>`;

  try {
    const res  = await fetch('/api/delete-bundle.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memuat');

    const files = data.data || [];

    // Update storage info bar
    if (infoBar && files.length > 0) {
      const totalMb = files.reduce((s, f) => s + (f.size_bytes || 0), 0) / (1024 * 1024);
      infoBar.classList.remove('hidden');
      if (infoText) infoText.textContent = `Total penyimpanan: ${totalMb.toFixed(1)} MB digunakan`;
      if (countBadge) countBadge.textContent = `${files.length} Bundle`;
    } else if (infoBar) {
      infoBar.classList.add('hidden');
    }

    if (files.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 gap-2 text-slate-600">
          <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <p class="text-xs">Belum ada bundle tersimpan.</p>
          <p class="text-[10px] text-slate-600">Buat bundle baru di Langkah 4.</p>
        </div>`;
      return;
    }

    container.innerHTML = files.map(f => {
      const tgl  = f.created_at
        ? new Date(f.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '-';
      const sizeTxt = f.size_mb >= 1 ? `${f.size_mb} MB` : `${f.size_kb} KB`;
      // Warna ukuran: hijau < 50MB, kuning 50-150MB, merah > 150MB
      const sizeColor = f.size_mb > 150 ? 'text-rose-400' : f.size_mb > 50 ? 'text-amber-400' : 'text-emerald-400';

      return `
      <div id="bundle-row-${f.file_name.replace(/[^a-z0-9]/gi,'_')}" class="flex items-center justify-between gap-3 bg-[#0F1523] border border-slate-800 rounded-xl px-4 py-3 hover:border-rose-500/20 transition-all group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-white font-mono truncate" title="${f.file_name}">${f.file_name}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-500">${tgl}</span>
              <span class="text-[10px] font-bold ${sizeColor}">${sizeTxt}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <a href="${f.url}" download="${f.file_name}"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-bold transition-all" title="Unduh">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Unduh
          </a>
          <button onclick="deleteBundle('${f.file_name}')"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-400 text-rose-400 text-xs font-bold transition-all opacity-0 group-hover:opacity-100" title="Hapus bundle ini">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Hapus
          </button>
        </div>
      </div>`;
    }).join('');

  } catch (e) {
    container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Gagal memuat daftar bundle: ${e.message}</p>`;
  }
}

async function deleteBundle(fileName) {
  showConfirm(
    `Hapus bundle ini?`,
    fileName,
    async () => {
      try {
        const res  = await fetch('/api/delete-bundle.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', file_name: fileName })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Bundle dihapus: ' + fileName, 'success');
          loadBundleList(); // Refresh list
        } else {
          showToast(data.error || 'Gagal menghapus bundle.', 'error');
        }
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }
  );
}

async function deleteAllBundles() {
  const container = document.getElementById('bundle-list');
  const count = container?.querySelectorAll('[id^="bundle-row-"]').length || 0;
  if (!count) { showToast('Tidak ada bundle untuk dihapus.', 'info'); return; }

  showConfirm(
    `Hapus semua ${count} bundle?`,
    'Seluruh file ZIP di folder bundles/ akan dihapus permanen dari server.',
    async () => {
      try {
        const res  = await fetch('/api/delete-bundle.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_all' })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          loadBundleList();
        } else {
          showToast(data.error || 'Gagal.', 'error');
        }
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }
  );
}

// ── Sync Tab Switcher ────────────────────────────────────────────────────────
window.switchSyncTab = function(tabIndex) {
  // Reset buttons
  document.querySelectorAll('.sync-tab-btn').forEach(btn => {
    btn.classList.remove('active', 'border-indigo-500', 'border-emerald-500', 'border-violet-500', 'border-fuchsia-500', 'border-rose-500', 'text-indigo-400', 'text-emerald-400', 'text-violet-400', 'text-fuchsia-400', 'text-rose-400');
    btn.classList.add('border-transparent', 'text-slate-500');
    // Matikan span styling
    const span = btn.querySelector('span');
    if (span) {
      span.classList.remove('bg-indigo-500/20', 'bg-emerald-500/20', 'bg-violet-500/20', 'bg-fuchsia-500/20', 'bg-rose-500/20', 'text-indigo-400', 'text-emerald-400', 'text-violet-400', 'text-fuchsia-400', 'text-rose-400');
      span.classList.add('bg-slate-800');
    }
  });

  // Hide all contents
  document.querySelectorAll('.sync-tab-content').forEach(content => {
    content.classList.remove('block');
    content.classList.add('hidden');
  });

  // Activate selected button
  const activeBtn = document.getElementById('btn-sync-tab-' + tabIndex);
  if (activeBtn) {
    const colors = ['indigo', 'emerald', 'violet', 'fuchsia', 'rose'];
    const c = colors[tabIndex - 1];
    
    activeBtn.classList.remove('border-transparent', 'text-slate-500');
    activeBtn.classList.add('active', `border-${c}-500`, `text-${c}-400`);
    
    const span = activeBtn.querySelector('span');
    if (span) {
      span.classList.remove('bg-slate-800');
      span.classList.add(`bg-${c}-500/20`, `text-${c}-400`);
    }
  }

  // Show selected content
  const activeContent = document.getElementById('sync-content-' + tabIndex);
  if (activeContent) {
    activeContent.classList.remove('hidden');
    activeContent.classList.add('block');
  }
}

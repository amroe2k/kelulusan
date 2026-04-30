// Identitas, Pengguna, Sync, Init
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
  $('id-kepsek').textContent=m.kepala_sekolah||'-'; $('id-nip').textContent='NIP. '+(m.nip_kepsek||'-');
  $('id-tgl').textContent=m.tanggal_pengumuman ? formatTglDisplay(m.tanggal_pengumuman) : '-';
  // New fields
  if($('id-jenjang')) $('id-jenjang').textContent = m.jenjang||'SMA';
  if($('id-tgl-skl2')) $('id-tgl-skl2').textContent = m.tanggal_skl2 ? formatTglDisplay(m.tanggal_skl2) : '-';
  if($('id-kota')) $('id-kota').textContent = m.kota||'-';
  if($('id-nomor-surat')) $('id-nomor-surat').textContent = m.nomor_surat_suffix ? ('XXX'+m.nomor_surat_suffix) : '-';
  // Domain
  if(m.domain){
    $('id-domain')&&($('id-domain').textContent='https://'+m.domain);
    // Update URL di sync card
    const urlEl=$('upload-url-text');
    if(urlEl)urlEl.textContent=`https://${m.domain}/admin-upload.php`;
  }
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
  try{auth=JSON.parse(sessionStorage.getItem('auth')||'null');}catch(e){auth=null;}
  if(!auth||auth.role==='siswa'){window.location.href='/login';return;}

  if($('sb-nama'))$('sb-nama').textContent=auth.nama||'';
  if($('sb-role'))$('sb-role').textContent=(auth.role||'admin').toUpperCase();
  $('sb-avatar').textContent=auth.nama.charAt(0).toUpperCase();

  // Show admin-only elements
  if(auth.role==='admin'){
    document.querySelectorAll('.admin-only').forEach(el=>el.classList.remove('hidden'));
  }

  // ─── Sidebar Collapse ───
  window.applySidebarCollapse = function(toggle) {
    const sb = $('dash-sidebar');
    if (!sb) return;
    let collapsed = localStorage.getItem('sb-collapsed') === '1';
    if (toggle) {
      collapsed = !collapsed;
      localStorage.setItem('sb-collapsed', collapsed ? '1' : '0');
    }
    sb.classList.toggle('sb-collapsed', collapsed);
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

  // Load data.php (identitas) di background
  fetch('/api/data.php').then(r=>r.json()).then(d=>{
    allData=d;
    if(currentView==='identitas') renderIdentitas();
    if(currentView==='overview') renderOverview();
  }).catch(e=>console.error('[data.php]',e));

  // --- Sidebar Toggle ---
  $('btn-toggle-sidebar')?.addEventListener('click', () => {
    $('dash-sidebar')?.classList.toggle('collapsed');
  });

  // Tentukan & switch view LANGSUNG
  const parts=window.location.pathname.split('/').filter(Boolean);
  const pv=parts[parts.length-1]||'overview';
  const valid=['overview','lembaga','identitas','siswa-data','pengguna','json-history','sync'];
  switchView(valid.includes(pv)?pv:'overview');

  // Init lembaga modal events
  initLembagaView();

  // Preload allSiswa SELALU supaya overview stats terpopulasi
  fetch('/api/siswa.php').then(r=>r.json()).then(d=>{
    if(d.success){ allSiswa=d.data||[]; if(currentView==='overview')renderOverview(); }
  }).catch(()=>{});

  // --- Siswa events ---
  $('search-siswa')?.addEventListener('input',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('filter-status')?.addEventListener('change',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('filter-kelas')?.addEventListener('change',()=>{ currentSiswaPage=1; renderSiswaTable(allSiswa); });
  $('btn-prev-page')?.addEventListener('click',()=>{ if(currentSiswaPage>1) { currentSiswaPage--; renderSiswaTable(allSiswa); } });
  $('btn-next-page')?.addEventListener('click',()=>{ currentSiswaPage++; renderSiswaTable(allSiswa); });
  $('btn-bulk-lulus')?.addEventListener('click',()=>applyBulk('LULUS'));
  $('btn-bulk-tidak')?.addEventListener('click',()=>applyBulk('TIDAK LULUS'));
  $('btn-add-siswa')?.addEventListener('click',()=>openSiswaModal());
  $('btn-add-mapel')?.addEventListener('click',()=>addNilaiRow());
  $('form-siswa')?.addEventListener('submit',saveSiswa);
  $('modal-siswa-close')?.addEventListener('click',()=>modalClose('modal-siswa'));
  $('modal-siswa-cancel')?.addEventListener('click',()=>modalClose('modal-siswa'));
  $('btn-import-siswa')?.addEventListener('click',()=>{$('import-result')?.classList.add('hidden');$('import-preview')?.classList.add('hidden');$('xlsx-file-name').textContent='';$('xlsx-file-input').value='';$('btn-import-submit').disabled=true;modalOpen('modal-import');});
  $('btn-export-siswa')?.addEventListener('click',exportXlsx);
  initImport();

  // --- Identitas events ---
  $('btn-edit-identitas')?.addEventListener('click',()=>{
    const m=allData._meta;
    ['sekolah','npsn','nss','tapel','alamat','kota','kepsek','nip','tgl','telepon','email','domain'].forEach(k=>{
      const map={sekolah:'sekolah',npsn:'npsn',nss:'nss',tapel:'tahun_ajaran',alamat:'alamat',kota:'kota',kepsek:'kepala_sekolah',nip:'nip_kepsek',tgl:'tanggal_pengumuman',telepon:'telepon',email:'email',domain:'domain'};
      const el=$(`input-${k}`);
      if(el){
        let val=m[map[k]]||'';
        if(k==='tgl'&&val){const d=parseTgl(val);if(d)val=d.toISOString().split('T')[0];}
        el.value=val;
      }
    });
    // New fields prefill
    if($('input-jenjang')) $('input-jenjang').value = m.jenjang||'SMA';
    if($('input-nomor-surat')) $('input-nomor-surat').value = m.nomor_surat_suffix||'';
    // tanggal_skl2
    if($('input-tgl-skl2')){
      let v=m.tanggal_skl2||'';
      if(v){const d=parseTgl(v);if(d)v=d.toISOString().split('T')[0];}
      $('input-tgl-skl2').value=v;
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
  });
  $('btn-cancel-identitas')?.addEventListener('click',()=>{
    $('identitas-edit')?.classList.add('hidden');
    $('identitas-view')?.classList.remove('hidden');
    $('btn-edit-identitas')?.classList.remove('hidden');
  });
  $('form-identitas')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const rawDomain=($('input-domain')?.value||'').trim().replace(/^https?:\/\//,'');
    const p={sekolah:$('input-sekolah').value,npsn:$('input-npsn').value,nss:$('input-nss').value,jenjang:$('input-jenjang')?.value||'SMA',kompetensi_keahlian:$('input-kompetensi')?.value||'',tahun_ajaran:$('input-tapel').value,alamat:$('input-alamat').value,kota:$('input-kota')?.value||'',kepala_sekolah:$('input-kepsek').value,nip_kepsek:$('input-nip').value,tanggal_pengumuman:$('input-tgl').value,tanggal_skl2:$('input-tgl-skl2')?.value||null,nomor_surat_suffix:$('input-nomor-surat')?.value||'',telepon:$('input-telepon')?.value||'',email:$('input-email')?.value||'',domain:rawDomain};
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
        // Tampilkan log
        $('sync-logs')?.classList.remove('hidden');
        if ($('sync-log-content')) $('sync-log-content').textContent = res.output || 'Sukses.';

        // Parse jumlah siswa dari output log
        const matchTotal = (res.output || '').match(/Total\s*:\s*(\d+)/);
        const matchLulus = (res.output || '').match(/Lulus\s*:\s*(\d+)/);
        const totalStr = matchTotal ? ` ${matchTotal[1]} siswa` : '';
        const lulusStr = matchLulus ? `, ${matchLulus[1]} lulus` : '';

        showToast(`✓ Generate JSON berhasil!${totalStr}${lulusStr}`, 'success');
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

  window.addEventListener('popstate',()=>{
    const parts=window.location.pathname.split('/').filter(Boolean);
    const pv=parts[parts.length-1]||'overview';
    const valid=['overview','lembaga','identitas','siswa-data','pengguna','json-history','sync'];
    const tv=valid.includes(pv)?pv:'overview';
    if(currentView!==tv)switchView(tv);
  });

  // Init drag-drop zones SEKALI saat halaman siap
  initDragDrop();


  // --- Detail Siswa Modal closes ---
  $('modal-detail-close')?.addEventListener('click',()=>modalClose('modal-detail-siswa'));
  $('modal-detail-cancel')?.addEventListener('click',()=>modalClose('modal-detail-siswa'));
  $('modal-detail-siswa')?.addEventListener('click',e=>{
    if(e.target.id==='modal-detail-siswa') modalClose('modal-detail-siswa');
  });
  // --- Preview SKL ---
  let _sklCurrentType = 'skl1'; // default SKL1 (tanpa nilai)
  let _sklCurrentSiswa = null;
  let _sklCurrentNilai = null;

  const renderSklIframe = (type) => {
    _sklCurrentType = type;
    const meta = allData?._meta || {};
    const html = buildSklPreviewHtml(meta, _sklCurrentSiswa, _sklCurrentNilai, type);
    const iframe = $('skl-iframe');
    if(iframe) iframe.srcdoc = html;
    // Update tab styles
    const tab1 = $('skl-tab-1'), tab2 = $('skl-tab-2');
    if(tab1 && tab2){
      tab1.className = type==='skl1'
        ? 'px-3 py-1 rounded-md text-xs font-bold transition-colors bg-emerald-600 text-white'
        : 'px-3 py-1 rounded-md text-xs font-bold transition-colors text-slate-400 hover:text-white';
      tab2.className = type==='skl2'
        ? 'px-3 py-1 rounded-md text-xs font-bold transition-colors bg-indigo-600 text-white'
        : 'px-3 py-1 rounded-md text-xs font-bold transition-colors text-slate-400 hover:text-white';
    }
  };

  const openSklModal = (siswaData=null, nilaiData=null, initialType='skl1') => {
    _sklCurrentSiswa = siswaData;
    _sklCurrentNilai = nilaiData;
    renderSklIframe(initialType);
    const sv = parseInt($('skl-scale')?.value||65);
    const wrap = $('skl-preview-wrap');
    if(wrap) wrap.style.transform=`scale(${sv/100})`;
    if($('skl-scale-val')) $('skl-scale-val').textContent=sv+'%';
    modalOpen('modal-skl-preview');
  };

  $('btn-preview-skl')?.addEventListener('click', () => openSklModal(null, null, 'skl1'));
  $('skl-tab-1')?.addEventListener('click', () => renderSklIframe('skl1'));
  $('skl-tab-2')?.addEventListener('click', () => renderSklIframe('skl2'));
  $('modal-skl-close')?.addEventListener('click',()=>modalClose('modal-skl-preview'));
  $('modal-skl-print')?.addEventListener('click',()=> {
    const iframe = $('skl-iframe');
    if(iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  });
  $('modal-skl-preview')?.addEventListener('click',e=>{
    if(e.target.id==='modal-skl-preview') modalClose('modal-skl-preview');
  });
  $('skl-scale')?.addEventListener('input',e=>{
    const v=parseInt(e.target.value);
    if($('skl-scale-val')) $('skl-scale-val').textContent=v+'%';
    const w=$('skl-preview-wrap'); if(w) w.style.transform=`scale(${v/100})`;
  });

  // Expose for detail modal usage
  window._openSklModal = openSklModal;

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

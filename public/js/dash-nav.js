// Sidebar & routing
function renderSidebar(){
  const nav=$('sidebar-nav'); nav.innerHTML='';
  const items=[
    {id:'overview',label:'Overview',icon:'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'},
    {id:'lembaga',label:'Manajemen Lembaga',icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'},
    {id:'identitas',label:'Identitas Lembaga',icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
    {id:'siswa-data',label:'Data Kelulusan',icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'},
    {id:'pengguna',label:'Manajemen Akun',icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'},
    {id:'json-history',label:'Riwayat JSON',icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
    {id:'sync',label:'Sinkronisasi Cloud',icon:'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'},
  ];
  const role=auth?.role||'admin';
  const isDark=document.documentElement.classList.contains('dark');
  items.forEach(item=>{
    if(item.id==='__divider__'){
      const div=document.createElement('div');
      div.style.cssText='height:1px;background:rgba(148,163,184,.1);margin:6px 12px;';
      nav.appendChild(div); return;
    }
    if(role==='guru'&&item.id!=='siswa-data')return;
    const isActive=currentView===item.id;
    const el=document.createElement('div');
    el.setAttribute('class', `nav-item group ${isActive?'active':''}`);
    el.setAttribute('data-label', item.label);
    el.style.cssText=`display:flex;align-items:center;gap:1rem;width:100%;padding:0.75rem;border-radius:0.75rem;cursor:pointer;transition:all 0.2s;position:relative;font-weight:600;overflow:hidden;font-size:0.875rem;color:${isActive?'#ffffff':(isDark?'#94a3b8':'#475569')};background:${isActive?'linear-gradient(to right,#6366f1,#4f46e5)':'transparent'};margin-bottom:2px;`;
    el.innerHTML=`<svg style="width:1.25rem;height:1.25rem;flex-shrink:0;color:${isActive?'#ffffff':(isDark?'#94a3b8':'#6366f1')};opacity:${isActive?'1':'0.8'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"/></svg><span style="white-space:nowrap">${item.label}</span>`;
    el.onmouseenter=()=>{if(!isActive){el.style.background=isDark?'rgba(99,102,241,0.1)':'rgba(99,102,241,0.08)';el.style.color=isDark?'#e2e8f0':'#1e293b';}};
    el.onmouseleave=()=>{if(!isActive){el.style.background='transparent';el.style.color=isDark?'#94a3b8':'#475569';}};
    el.onclick=()=>switchView(item.id);
    nav.appendChild(el);
  });
}

function switchView(id){
  currentView=id;
  const newPath=`/dashboard/${id}`;
  if(window.location.pathname!==newPath) window.history.pushState(null,null,newPath);
  // Gunakan VALID_VIEWS dari dash-init.js (konstanta bersama)
  (typeof VALID_VIEWS !== 'undefined' ? VALID_VIEWS : ['overview','lembaga','identitas','siswa-data','pengguna','json-history','sync'])
    .forEach(v=>{const el=$(`view-${v}`);if(el)el.classList.add('hidden');});
  const a=$(`view-${id}`); if(a)a.classList.remove('hidden');
  const titles={
    overview:'Pusat Kendali',
    lembaga:'Manajemen Lembaga',
    identitas:'Identitas Lembaga',
    'siswa-data':'Data Kelulusan',
    pengguna:'Manajemen Akun',
    'json-history':'Riwayat JSON',
    sync:'Sinkronisasi Cloud',
    profile:'Profil Saya'
  };
  if($('page-title'))$('page-title').textContent=titles[id]||id;
  renderSidebar();
  if(id==='overview'){
    // Replay entrance animation
    document.querySelectorAll('.ov-card').forEach(el => {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = '';
    });
    // Selalu fetch ulang dari server agar data selalu fresh
    ['ov-total','ov-lulus','ov-tidak','ov-rata'].forEach(eid=>{
      const el=$(eid); if(el) el.textContent='...';
    });
    fetch(`/api/siswa.php?t=${Date.now()}`).then(r=>r.json()).then(d=>{
      if(d.success){ allSiswa=d.data||[]; }
      renderOverview();
    }).catch(()=>renderOverview());
  }
  if(id==='lembaga')renderLembaga();
  if(id==='identitas')renderIdentitas();
  if(id==='siswa-data')loadAndRenderSiswa();
  if(id==='pengguna')renderPengguna();
  if(id==='json-history')renderJsonHistory();
  if(id==='sync'){ loadArchiveList(); populateBundleSelect(); if(typeof loadSyncStatus==='function') loadSyncStatus(); }
  if(id==='profile' && typeof renderProfile==='function') renderProfile();
  // Re-apply sidebar collapse state after re-render
  applySidebarCollapse(false);
}

function renderOverview(){
  if(!allSiswa.length){
    ['ov-total','ov-lulus','ov-tidak','ov-rata'].forEach(id=>{
      const el=$(id); if(el)el.textContent='...';
    });
    if($('kelas-chart'))$('kelas-chart').innerHTML='<div class="col-span-2 text-center py-8 text-slate-500 text-sm animate-pulse">Memuat data...</div>';
    return;
  }
  const lulus=allSiswa.filter(s=>s.status==='LULUS');
  $('ov-total').textContent=allSiswa.length;
  $('ov-lulus').textContent=lulus.length;
  $('ov-tidak').textContent=allSiswa.length-lulus.length;
  const avg=allSiswa.length?(allSiswa.reduce((a,s)=>a+(parseFloat(s.rata_rata)||0),0)/allSiswa.length):0;
  $('ov-rata').textContent=avg.toFixed(2);
  const byKelas={};
  allSiswa.forEach(s=>{if(!byKelas[s.kelas])byKelas[s.kelas]={total:0,lulus:0};byKelas[s.kelas].total++;if(s.status==='LULUS')byKelas[s.kelas].lulus++;});
  $('kelas-chart').innerHTML=Object.entries(byKelas).sort((a,b)=>a[0].localeCompare(b[0])).map(([kelas,d])=>{
    const pct=d.total?Math.round(d.lulus/d.total*100):0;
    const colorClass=pct>=80?'bg-emerald-500':pct>=60?'bg-amber-500':'bg-rose-500';
    const textClass=pct>=80?'text-emerald-500':pct>=60?'text-amber-500':'text-rose-500';
    return `<div class="mb-5"><div class="flex justify-between items-end mb-2"><div><p class="text-sm font-bold text-white">${kelas}</p><p class="text-[10px] text-slate-500">${d.lulus}/${d.total} Lulus</p></div><span class="text-lg font-black ${textClass}">${pct}%</span></div><div class="h-2.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full rounded-full ${colorClass} transition-all duration-700" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

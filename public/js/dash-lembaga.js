// ── MANAJEMEN LEMBAGA ────────────────────────────────────────────────────
let allLembaga = [];

async function renderLembaga() {
  const wrap = $('view-lembaga');
  if (!wrap) return;
  const tbody = $('lembaga-table');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500 text-sm animate-pulse">Memuat data...</td></tr>';

  try {
    const r = await fetch('/api/lembaga.php');
    const d = await r.json();
    allLembaga = d.data || [];
    renderLembagaTable();
    renderJenjangWidget();
    renderActiveBadge();
  } catch (e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-rose-400 text-sm">Gagal memuat data lembaga.</td></tr>';
  }
}

function renderActiveBadge() {
  const aktif = allLembaga.find(l => l.aktif == 1);
  const el = $('lembaga-aktif-info');
  if (!el) return;
  if (aktif) {
    el.innerHTML = `<span class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm shadow-sm">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      Aktif: <span class="text-slate-900 dark:text-white">${aktif.nama}</span>
    </span>`;
  } else {
    el.innerHTML = `<span class="text-amber-400 text-sm font-bold">⚠ Tidak ada lembaga aktif</span>`;
  }
}

function renderJenjangWidget() {
  const container = $('widget-jenjang');
  if (!container) return;
  
  const rawStats = {};
  allLembaga.forEach(l => {
    const j = (l.jenjang || 'Lainnya').toUpperCase();
    if (!rawStats[j]) rawStats[j] = { count: 0, students: 0 };
    rawStats[j].count++;
    rawStats[j].students += parseInt(l.jumlah_siswa || 0);
  });

  const mainCategories = [
    // Row 1
    { id: 'SMA', label: 'SMA', keys: ['SMA'], color: 'blue', icon: 'building' },
    { id: 'SMK', label: 'SMK', keys: ['SMK'], color: 'cyan', icon: 'building-alt' },
    { id: 'MA', label: 'MA', keys: ['MA'], color: 'indigo', icon: 'mosque' },
    // Row 2
    { id: 'SMP', label: 'SMP', keys: ['SMP'], color: 'violet', icon: 'book' },
    { id: 'MTS', label: 'MTs', keys: ['MTS', 'MTTS'], color: 'purple', icon: 'mosque-alt' }
  ];

  const displayStats = [];
  const processedKeys = new Set();
  const predefinedIds = new Set(mainCategories.map(c => c.id)); // ← set of predefined IDs

  mainCategories.forEach(cat => {
    let count = 0;
    let students = 0;
    cat.keys.forEach(k => {
      if (rawStats[k]) {
        count += rawStats[k].count;
        students += rawStats[k].students;
        processedKeys.add(k);
      }
    });
    displayStats.push({
      id: cat.id,      // ← simpan id untuk pengecekan skip
      label: cat.label,
      count,
      students,
      color: cat.color,
      icon: cat.icon
    });
  });

  // Tambahkan sisanya jika ada (biasanya jarang)
  Object.keys(rawStats).forEach(k => {
    if (!processedKeys.has(k)) {
      displayStats.push({
        id: k,
        label: k,
        count: rawStats[k].count,
        students: rawStats[k].students,
        color: 'slate',
        icon: 'other'
      });
    }
  });
  
  let html = '';
  
  displayStats.forEach(s => {
    if (s.count === 0 && s.label === 'Lainnya') return;

    const colors = {
      blue: { icon: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'from-blue-500 to-blue-600' },
      cyan: { icon: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', ring: 'from-cyan-500 to-cyan-600' },
      indigo: { icon: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', ring: 'from-indigo-500 to-indigo-600' },
      violet: { icon: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', ring: 'from-violet-500 to-violet-600' },
      purple: { icon: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', ring: 'from-purple-500 to-purple-600' },
      rose: { icon: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', ring: 'from-rose-500 to-rose-600' },
      slate: { icon: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', ring: 'from-slate-500 to-slate-600' }
    };

    const c = colors[s.color] || colors.slate;
    
    let iconSvg = '';
    if (s.icon === 'building' || s.icon === 'building-alt') {
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`;
    } else if (s.icon === 'book') {
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`;
    } else if (s.icon === 'pencil') {
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
    } else {
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
    }

    html += `
      <div class="relative group">
        <div class="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 shadow-sm hover:shadow-lg dark:hover:bg-[#131b2c] group-hover:-translate-y-1">
          <div class="w-10 h-10 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center border ${c.border} flex-shrink-0 shadow-inner">
            ${iconSvg}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-[10px] font-black ${c.icon} opacity-80 uppercase tracking-[0.2em] truncate mb-0.5">${escHtml(s.label)}</h4>
            <div class="flex items-baseline gap-1.5">
              <p class="text-2xl font-black text-slate-900 dark:text-white leading-none">${s.count}</p>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit</p>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center justify-end gap-1.5 mb-0.5">
              <span class="w-1 h-1 rounded-full ${c.icon.split(' ')[0].replace('text-', 'bg-')} animate-pulse"></span>
              <p class="text-sm font-black ${c.icon}">${s.students.toLocaleString('id-ID')}</p>
            </div>
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Siswa</p>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function renderLembagaTable() {
  const tbody = $('lembaga-table');
  if (!tbody) return;
  
  const searchVal = ($('search-lembaga')?.value || '').toLowerCase();
  const filtered = allLembaga.filter(l => 
    (l.nama || '').toLowerCase().includes(searchVal) || 
    (l.slug || '').toLowerCase().includes(searchVal)
  );

  if (!filtered.length) {
    if (allLembaga.length) {
       tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500 text-sm italic">Pencarian tidak ditemukan.</td></tr>';
    } else {
       tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500 text-sm italic">Belum ada lembaga. Tambahkan lembaga pertama Anda.</td></tr>';
    }
    return;
  }
  tbody.innerHTML = filtered.map(l => {
    const j = (l.jenjang || '').toUpperCase();
    let jColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    if(j.includes('SMA')) jColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    else if(j.includes('SMK')) jColor = 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    else if(j.includes('MA')) jColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    else if(j.includes('SMP')) jColor = 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
    else if(j.includes('MTS')) jColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    else if(j.includes('SD') || j.includes('MI')) jColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

    return `
    <tr class="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${l.aktif==1?'bg-emerald-500/5 dark:bg-emerald-500/10':''}" data-id="${l.id}">
      <td class="px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm flex-shrink-0 border border-indigo-500/20">
            ${l.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="text-slate-900 dark:text-white font-bold text-sm">${escHtml(l.nama)}</p>
            <p class="text-slate-500 font-mono text-[10px] mt-0.5 tracking-wider uppercase">${escHtml(l.slug)}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-5">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border tracking-[0.1em] ${jColor}">
          ${escHtml(l.jenjang || 'Belum Diatur')}
        </span>
      </td>
      <td class="px-4 py-5 text-center">
        <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest ${l.aktif==1
          ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-slate-700'}">
          ${l.aktif==1 ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> AKTIF' : 'NON-AKTIF'}
        </span>
      </td>
      <td class="px-4 py-5 text-center text-slate-700 dark:text-slate-300 font-black text-sm">${l.jumlah_siswa || 0}</td>
      <td class="px-4 py-5 text-slate-500 dark:text-slate-500 text-xs font-medium">${l.created_at ? l.created_at.slice(0,10) : '-'}</td>
      <td class="px-6 py-5 text-right">
        <div class="flex items-center justify-end gap-2">
          ${l.aktif!=1 ? `
          <button onclick="activateLembaga('${l.id}','${escHtml(l.nama)}')"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Aktifkan
          </button>` : `
          <span class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-emerald-500/5 border border-slate-200 dark:border-emerald-500/10 text-slate-500 dark:text-emerald-600 text-[10px] font-black uppercase tracking-widest cursor-default">Sedang Aktif</span>
          `}
          <button onclick="editLembaga('${l.id}','${escHtml(l.nama)}')"
            class="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="Edit Nama">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          ${l.aktif!=1 ? `
          <button onclick="deleteLembaga('${l.id}','${escHtml(l.nama)}')"
            class="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Hapus Permanen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>` : ''}
          <button onclick="manageToken('${l.id}','${escHtml(l.nama)}','${l.form_token||''}','${l.form_token_expires||''}')"
            class="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Link Form Publik">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </button>
        </div>
      </td>
    </tr>`}).join('');
}

async function manageToken(id, nama, token, expires) {
  const isDark = document.documentElement.classList.contains('dark');
  let linkInfo = '<p class="text-slate-500 text-sm">Belum ada link form yang aktif.</p>';
  if (token) {
      const url = window.location.origin + '/form-lembaga?token=' + token;
      let expText = new Date(expires).getTime() < Date.now() ? '<span class="text-rose-500 font-bold">Kadaluarsa</span>' : `Berlaku s/d: ${expires}`;
      linkInfo = `
        <div class="p-3 bg-white dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800">
          <input type="text" readonly value="${url}" class="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-300 mb-2 focus:outline-none" onclick="this.select(); document.execCommand('copy'); showToast('Link disalin!','success')">
          <p class="text-[10px] text-slate-500 mt-1">${expText}</p>
        </div>
      `;
  }

  const { isConfirmed, value } = await Swal.fire({
    title: `<span class="text-xl font-black font-outfit text-slate-900 dark:text-white">Link Form: ${nama}</span>`,
    html: `
      <div class="mt-4 text-left">
        ${linkInfo}
        <div class="mt-4">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Masa Berlaku (Hari)</label>
          <input type="number" id="swal-token-days" value="7" min="1" max="30" class="w-full rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Generate Link Baru',
    cancelButtonText: 'Tutup',
    background: isDark ? '#111827' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#0f172a',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 ml-3',
      cancelButton: 'px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all'
    },
    preConfirm: () => {
      return document.getElementById('swal-token-days').value;
    }
  });

  if (isConfirmed && value) {
    const r = await fetch('/api/lembaga.php', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'generate_token', id, days: value })
    });
    const res = await r.json();
    if (res.success) {
      showToast('Link baru berhasil digenerate!','success');
      await renderLembaga();
      manageToken(id, nama, res.token, res.expires); // Re-open to show new link
    } else {
      showToast(res.error||'Gagal generate link','error');
    }
  }
}


function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Tambah Lembaga ────────────────────────────────────────────────────────
function openAddLembaga() {
  $('modal-lembaga-title').textContent = 'Tambah Lembaga';
  $('lembaga-modal-id').value = '';
  $('lembaga-modal-nama').value = '';
  modalOpen('modal-lembaga');
  setTimeout(() => $('lembaga-modal-nama').focus(), 100);
}

function editLembaga(id, nama) {
  $('modal-lembaga-title').textContent = 'Edit Nama Lembaga';
  $('lembaga-modal-id').value = id;
  $('lembaga-modal-nama').value = nama;
  modalOpen('modal-lembaga');
  setTimeout(() => $('lembaga-modal-nama').focus(), 100);
}

async function saveLembaga(e) {
  e.preventDefault();
  const id   = $('lembaga-modal-id').value.trim();
  const nama = $('lembaga-modal-nama').value.trim();
  if (!nama) { showToast('Nama lembaga wajib diisi','error'); return; }

  const btn = $('btn-lembaga-submit');
  btn.textContent = 'Menyimpan...'; btn.disabled = true;

  const body = id ? { action:'update', id, nama } : { action:'create', nama };
  const r = await fetch('/api/lembaga.php', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  const res = await r.json();
  btn.textContent = 'Simpan'; btn.disabled = false;

  if (!res.success) { showToast(res.error||'Gagal','error'); return; }
  modalClose('modal-lembaga');
  showToast(id ? 'Nama diperbarui!' : 'Lembaga ditambahkan!', 'success');
  await renderLembaga();
}

async function activateLembaga(id, nama) {
  const isDark = document.documentElement.classList.contains('dark');
  const confirmed = await Swal.fire({
    title: `<span class="text-xl font-black font-outfit text-slate-900 dark:text-white">Aktifkan Lembaga?</span>`,
    html: `
      <div class="mt-4 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-left">
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Mengaktifkan <strong class="text-emerald-600 dark:text-emerald-400">"${nama}"</strong> akan mengubah sumber data utama dashboard dan publik.
        </p>
        <div class="flex items-center gap-2 mt-3 p-2 bg-white/50 dark:bg-black/20 rounded-lg border border-emerald-200/50 dark:border-emerald-500/10">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Auto-sync JSON aktif</span>
        </div>
      </div>
    `,
    icon: 'question',
    iconColor: '#10b981',
    showCancelButton: true,
    confirmButtonText: 'Ya, Aktifkan',
    cancelButtonText: 'Batal',
    reverseButtons: true,
    background: isDark ? '#111827' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#0f172a',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 ml-3',
      cancelButton: 'px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all'
    }
  });
  if (!confirmed.isConfirmed) return;

  const r = await fetch('/api/lembaga.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'activate', id })
  });
  const res = await r.json();
  if (!res.success) { showToast(res.error||'Gagal','error'); return; }

  showToast(`✓ ${nama} berhasil diaktifkan! Menyinkronkan data...`, 'success');

  // ── Auto-regenerate data.json untuk lembaga baru ──────────────────────
  try {
    const syncRes = await (await fetch('/api/sync-data.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    })).json();
    if (syncRes.success) {
      showToast(`✓ Data JSON tersinkronisasi — ${syncRes.jumlah_siswa} siswa dimuat. Memuat ulang...`, 'success');
    } else {
      showToast('⚠ Lembaga aktif, tapi sync JSON gagal: ' + (syncRes.error || '?'), 'warning');
    }
  } catch(e) {
    showToast('⚠ Lembaga aktif, sync JSON tidak dapat dijangkau.', 'warning');
  }

  setTimeout(() => { window.location.reload(); }, 1500);
}

async function deleteLembaga(id, nama) {
  const isDark = document.documentElement.classList.contains('dark');
  const confirmed = await Swal.fire({
    title: `<span class="text-xl font-black font-outfit text-slate-900 dark:text-white">Hapus Lembaga?</span>`,
    html: `
      <div class="mt-4 p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-left">
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Yakin ingin menghapus <strong class="text-rose-600 dark:text-rose-400">"${nama}"</strong>?
        </p>
        <p class="mt-2 text-[11px] text-rose-500 dark:text-rose-400/80 font-medium">
          ⚠ Seluruh data siswa, nilai, dan pengaturan akan dihapus <strong>secara permanen</strong> dan tidak dapat dikembalikan.
        </p>
      </div>
    `,
    icon: 'warning',
    iconColor: '#ef4444',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Permanen',
    cancelButtonText: 'Batal',
    reverseButtons: true,
    background: isDark ? '#111827' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#0f172a',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 ml-3',
      cancelButton: 'px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all'
    }
  });
  if (!confirmed.isConfirmed) return;

  const r = await fetch('/api/lembaga.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'delete', id })
  });
  const res = await r.json();
  if (!res.success) { showToast(res.error||'Gagal','error'); return; }
  showToast('Lembaga dihapus!','success');
  await renderLembaga();
}

function initLembagaView() {
  $('search-lembaga')?.addEventListener('input', renderLembagaTable);
  $('btn-add-lembaga')?.addEventListener('click', openAddLembaga);
  $('form-lembaga')?.addEventListener('submit', saveLembaga);
  $('modal-lembaga-close')?.addEventListener('click', ()=>modalClose('modal-lembaga'));
  $('modal-lembaga-cancel')?.addEventListener('click', ()=>modalClose('modal-lembaga'));
}

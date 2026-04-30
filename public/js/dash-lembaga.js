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
    el.innerHTML = `<span class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Aktif: ${aktif.nama} <span class="text-emerald-600 font-mono text-xs">[${aktif.slug}]</span>
    </span>`;
  } else {
    el.innerHTML = `<span class="text-amber-400 text-sm font-bold">⚠ Tidak ada lembaga aktif</span>`;
  }
}

function renderLembagaTable() {
  const tbody = $('lembaga-table');
  if (!tbody) return;
  
  const searchVal = ($('search-lembaga')?.value || '').toLowerCase();
  const filtered = allLembaga.filter(l => 
    l.nama.toLowerCase().includes(searchVal) || 
    l.slug.toLowerCase().includes(searchVal)
  );

  if (!filtered.length) {
    if (allLembaga.length) {
       tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 text-sm italic">Pencarian tidak ditemukan.</td></tr>';
    } else {
       tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 text-sm italic">Belum ada lembaga. Tambahkan lembaga pertama Anda.</td></tr>';
    }
    return;
  }
  tbody.innerHTML = filtered.map(l => `
    <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors ${l.aktif==1?'bg-emerald-500/5':''}" data-id="${l.id}">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm flex-shrink-0">
            ${l.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="text-white font-bold text-sm">${escHtml(l.nama)}</p>
            <p class="text-slate-500 font-mono text-[10px] mt-0.5">${escHtml(l.slug)}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-4 text-center">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black ${l.aktif==1
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          : 'bg-slate-700/50 text-slate-500'}">
          ${l.aktif==1 ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> AKTIF' : 'Non-aktif'}
        </span>
      </td>
      <td class="px-4 py-4 text-center text-slate-300 font-bold text-sm">${l.jumlah_siswa || 0}</td>
      <td class="px-4 py-4 text-slate-500 text-xs">${l.created_at ? l.created_at.slice(0,10) : '-'}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end gap-2">
          ${l.aktif!=1 ? `
          <button onclick="activateLembaga('${l.id}','${escHtml(l.nama)}')"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Aktifkan
          </button>` : `
          <span class="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 text-xs font-bold cursor-default">Sedang Aktif</span>
          `}
          <button onclick="editLembaga('${l.id}','${escHtml(l.nama)}')"
            class="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          ${l.aktif!=1 ? `
          <button onclick="deleteLembaga('${l.id}','${escHtml(l.nama)}')"
            class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>` : ''}
        </div>
      </td>
    </tr>`).join('');
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
  const confirmed = await Swal.fire({
    title: `Aktifkan "${nama}"?`,
    html: `Data kelulusan dan export JSON akan menggunakan lembaga ini.<br><small class="text-slate-400">JSON akan di-regenerate otomatis.</small>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Aktifkan',
    cancelButtonText: 'Batal',
    background: '#111827', color: '#e2e8f0',
    confirmButtonColor: '#10b981',
  });
  if (!confirmed.isConfirmed) return;

  const r = await fetch('/api/lembaga.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'activate', id })
  });
  const res = await r.json();
  if (!res.success) { showToast(res.error||'Gagal','error'); return; }

  showToast(`✓ ${nama} berhasil diaktifkan! Memuat ulang sistem...`, 'success');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function deleteLembaga(id, nama) {
  const confirmed = await Swal.fire({
    title: `Hapus "${nama}"?`,
    html: `Semua data siswa dan pengaturan lembaga ini akan <strong>dihapus permanen</strong>.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    background: '#111827', color: '#e2e8f0',
    confirmButtonColor: '#ef4444',
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

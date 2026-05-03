// ── RIWAYAT JSON ─────────────────────────────────────────────────────────

// State
let _selectedHistoryIds = new Set();
let _allHistoryRows     = []; // cache semua data dari API

async function renderJsonHistory() {
  const tbody = $('history-table');
  if (!tbody) return;
  _selectedHistoryIds.clear();
  updateBulkToolbar();
  tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-slate-500 text-sm animate-pulse">Memuat riwayat...</td></tr>';

  try {
    const r = await fetch('/api/json-history.php');
    const d = await r.json();

    // Cache + sortir terbaru di atas
    _allHistoryRows = (d.data || []).sort((a, b) =>
      new Date(b.generated_at) - new Date(a.generated_at)
    );

    // Populate dropdown lembaga (unik)
    populateLembagaDropdown(_allHistoryRows);

    // Reset filter & render
    filterHistoryTable();
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-rose-400 text-sm">Gagal memuat riwayat.</td></tr>';
  }
}

// ── Populate dropdown lembaga ─────────────────────────────────────────────────
function populateLembagaDropdown(rows) {
  const sel = document.getElementById('history-filter-lembaga');
  if (!sel) return;

  // Kumpulkan lembaga unik
  const seen = new Map();
  rows.forEach(r => {
    if (!seen.has(r.lembaga_id)) seen.set(r.lembaga_id, r.lembaga_nama || r.lembaga_slug || r.lembaga_id);
  });

  // Rebuild options (pertahankan pilihan saat ini)
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua Lembaga</option>';
  seen.forEach((nama, id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = nama;
    if (id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Filter & Search ───────────────────────────────────────────────────────────
function filterHistoryTable() {
  const q          = (document.getElementById('history-search')?.value || '').toLowerCase().trim();
  const lembagaId  = document.getElementById('history-filter-lembaga')?.value || '';
  const dateRange  = document.getElementById('history-filter-date')?.value   || '';

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = _allHistoryRows.filter(row => {
    // ── Search ──
    if (q) {
      const haystack = [row.lembaga_nama, row.lembaga_slug, row.file_name].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // ── Filter Lembaga ──
    if (lembagaId && row.lembaga_id !== lembagaId) return false;

    // ── Filter Tanggal ──
    if (dateRange) {
      const rowDate = new Date(row.generated_at);
      if (dateRange === 'today') {
        if (rowDate < today) return false;
      } else if (dateRange === '7d') {
        const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 7);
        if (rowDate < cutoff) return false;
      } else if (dateRange === '30d') {
        const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 30);
        if (rowDate < cutoff) return false;
      } else if (dateRange === 'thismonth') {
        const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        if (rowDate < cutoff) return false;
      }
    }

    return true;
  });

  renderHistoryTable(filtered);

  // Update counter: "5 entri" atau "3 dari 8 entri"
  const countEl = $('history-count');
  if (countEl) {
    const total = _allHistoryRows.length;
    countEl.textContent = filtered.length === total
      ? `${total} entri`
      : `${filtered.length} dari ${total} entri`;
  }
}

function resetHistoryFilter() {
  const search   = document.getElementById('history-search');
  const lembaga  = document.getElementById('history-filter-lembaga');
  const dateEl   = document.getElementById('history-filter-date');
  if (search)  search.value  = '';
  if (lembaga) lembaga.value = '';
  if (dateEl)  dateEl.value  = '';
  filterHistoryTable();
}

function renderHistoryTable(rows) {
  const tbody = $('history-table');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center">
      <div class="flex flex-col items-center gap-3 text-slate-600">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p class="text-sm">Belum ada riwayat generate JSON.</p>
        <p class="text-xs text-slate-700">Klik "Generate JSON" di menu Sinkronisasi untuk membuat arsip pertama.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    const dt    = new Date(row.generated_at);
    const datePart = dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    const timePart = dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const size  = row.file_size ? `${(row.file_size/1024).toFixed(1)} KB` : '-';
    const lulus    = parseInt(row.lulus) || 0;
    const total    = parseInt(row.jumlah_siswa) || 0;
    const pct      = total ? Math.round(lulus/total*100) : 0;
    const fileOk   = row.file_exists;

    return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group/row" data-id="${row.id}">
      <!-- Checkbox -->
      <td class="px-6 py-4 w-16">
        <input type="checkbox" data-history-id="${row.id}"
          class="history-checkbox w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-500 cursor-pointer accent-rose-500"
          onchange="onHistoryCheckbox(this)">
      </td>
      <td class="px-4 py-4">
        <div>
          <p class="text-white font-bold text-sm">${escHtml(row.lembaga_nama||'-')}</p>
          <p class="text-slate-400 font-mono text-[10px] mt-0.5">${escHtml(row.lembaga_slug||'-')}</p>
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="flex flex-col items-center gap-1.5">
          ${fileOk
            ? `<div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm" title="File Tersedia: ${escHtml(row.file_name)}">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
               </div>`
            : `<div class="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm" title="File Hilang / Dihapus">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
               </div>`
          }
          <p class="text-slate-400 font-mono text-[9px] font-bold tracking-tight">${size}</p>
        </div>
      </td>
      <td class="px-4 py-4 text-center">
        <span class="text-white font-bold">${total}</span>
      </td>
      <td class="px-4 py-4 text-center">
        <div>
          <span class="text-emerald-400 font-bold">${lulus}</span>
          <span class="text-slate-400 text-xs"> / ${total-lulus} TL</span>
        </div>
        <div class="h-1 bg-slate-800 rounded-full mt-1.5 w-16 mx-auto overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div>
        </div>
      </td>
      <td class="px-4 py-4 whitespace-nowrap">
        <p class="text-white font-bold text-[11px] leading-none">${datePart}</p>
        <p class="text-slate-400 text-[10px] font-mono mt-1.5 leading-none">${timePart}</p>
      </td>
      <td class="px-8 py-4">
        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
          ${fileOk ? `
          <button onclick="setActiveJson('${escHtml(row.file_name)}')"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-[11px] font-bold transition-all" title="Jadikan data.json aktif">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Set Aktif
          </button>
          <button onclick="restoreJson('${row.id}','${row.lembaga_id}','${escHtml(row.lembaga_nama)}','${escHtml(row.file_name)}')"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[11px] font-bold transition-all" title="Restore ke database lokal">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Restore DB
          </button>` : ''}
          <button onclick="deleteHistory('${row.id}','${escHtml(row.file_name)}')"
            class="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Hapus entri">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Checkbox Handling ─────────────────────────────────────────────────────────

function onHistoryCheckbox(el) {
  const id = el.dataset.historyId;
  if (el.checked) _selectedHistoryIds.add(id);
  else _selectedHistoryIds.delete(id);
  updateBulkToolbar();

  // Sync select-all state
  const all = document.querySelectorAll('.history-checkbox');
  const selectAllEl = $('history-select-all');
  if (selectAllEl) {
    selectAllEl.checked = all.length > 0 && _selectedHistoryIds.size === all.length;
    selectAllEl.indeterminate = _selectedHistoryIds.size > 0 && _selectedHistoryIds.size < all.length;
  }
}

function toggleSelectAllHistory(el) {
  const checkboxes = document.querySelectorAll('.history-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = el.checked;
    const id = cb.dataset.historyId;
    if (el.checked) _selectedHistoryIds.add(id);
    else _selectedHistoryIds.delete(id);
  });
  updateBulkToolbar();
}

function updateBulkToolbar() {
  const toolbar = $('bulk-delete-toolbar');
  const counter = $('bulk-delete-count');
  if (!toolbar) return;
  const count = _selectedHistoryIds.size;
  if (count > 0) {
    toolbar.classList.remove('hidden');
    if (counter) counter.textContent = `${count} dipilih`;
  } else {
    toolbar.classList.add('hidden');
  }
}

// ── Bulk Delete ───────────────────────────────────────────────────────────────

async function bulkDeleteHistory() {
  const ids = [..._selectedHistoryIds];
  if (!ids.length) return;

  const c = await Swal.fire({
    title: 'Hapus Massal?',
    html: `<span class="text-rose-400 font-bold">${ids.length} entri</span> riwayat akan dihapus beserta file arsip-nya.<br><small class="text-slate-500">Arsip terakhir per lembaga akan dilewati untuk keamanan.</small>`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: `Hapus ${ids.length} Entri`, cancelButtonText: 'Batal',
    background: '#111827', color: '#e2e8f0', confirmButtonColor: '#ef4444'
  });
  if (!c.isConfirmed) return;

  showToast('Menghapus...', 'info');

  try {
    const r   = await fetch('/api/json-history.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_delete', ids })
    });
    const res = await r.json();

    if (res.success) {
      let msg = `✓ ${res.deleted} entri dihapus`;
      if (res.skipped > 0) msg += ` · ${res.skipped} dilewati (arsip terakhir)`;
      showToast(msg, res.skipped > 0 ? 'warning' : 'success');
      _selectedHistoryIds.clear();
      await renderJsonHistory();
    } else {
      showToast(res.error || 'Gagal menghapus.', 'error');
    }
  } catch(e) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

// ── Aksi Individual ───────────────────────────────────────────────────────────

async function setActiveJson(fileName) {
  const c = await Swal.fire({
    title: 'Jadikan Aktif?',
    html: `File <code class="text-violet-400">${escHtml(fileName)}</code> akan menggantikan <code>data.json</code> aktif di server lokal ini.<br><small class="text-slate-500">⚠ Tidak mempengaruhi hosting mandiri lembaga.</small>`,
    icon: 'question', showCancelButton: true,
    confirmButtonText: 'Ya, Set Aktif', cancelButtonText: 'Batal',
    background:'#111827', color:'#e2e8f0', confirmButtonColor:'#7c3aed'
  });
  if (!c.isConfirmed) return;

  const r   = await fetch('/api/json-history.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'set_active', file_name: fileName })
  });
  const res = await r.json();
  if (res.success) showToast('data.json diperbarui!','success');
  else showToast(res.error||'Gagal','error');
}

async function restoreJson(id, lembagaId, lembagaNama, fileName) {
  const c = await Swal.fire({
    title: 'Restore ke Database?',
    html: `Data lembaga <strong class="text-amber-400">${escHtml(lembagaNama)}</strong> akan <strong>di-overwrite</strong> dari arsip:<br>
           <code class="text-slate-400 text-xs">${escHtml(fileName)}</code>`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Ya, Restore', cancelButtonText: 'Batal',
    background:'#111827', color:'#e2e8f0', confirmButtonColor:'#f59e0b'
  });
  if (!c.isConfirmed) return;

  showToast('Restoring data...','info');

  const r   = await fetch('/api/json-history.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'restore', file_name: fileName, lembaga_id: lembagaId })
  });
  const res = await r.json();

  if (res.success) {
    showToast(`✓ ${res.imported} siswa berhasil direstore ke ${lembagaNama}! Menyinkronkan JSON...`, 'success');

    try {
      const syncRes = await (await fetch('/api/sync-data.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      })).json();
      if (syncRes.success) {
        showToast(`✓ JSON tersinkronisasi — ${syncRes.jumlah_siswa} siswa dimuat.`, 'success');
      } else {
        showToast('⚠ Restore DB selesai, tapi sync JSON gagal: ' + (syncRes.error || '?'), 'warning');
      }
    } catch(e) {
      showToast('⚠ Restore selesai, sync JSON tidak dapat dijangkau.', 'warning');
    }

    await renderJsonHistory();
  } else {
    showToast(res.error||'Restore gagal','error');
  }
}

async function deleteHistory(id, fileName) {
  const c = await Swal.fire({
    title: 'Hapus Riwayat?',
    html: `File <code class="text-rose-400">${escHtml(fileName)}</code> dan entri riwayat akan dihapus.`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Hapus', cancelButtonText: 'Batal',
    background:'#111827', color:'#e2e8f0', confirmButtonColor:'#ef4444'
  });
  if (!c.isConfirmed) return;

  const r   = await fetch('/api/json-history.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'delete', id, file_name: fileName })
  });
  const res = await r.json();
  if (res.success) { showToast('Riwayat dihapus!','success'); await renderJsonHistory(); }
  else showToast(res.error||'Gagal','error');
}

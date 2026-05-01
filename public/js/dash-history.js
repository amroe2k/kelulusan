// ── RIWAYAT JSON ─────────────────────────────────────────────────────────

async function renderJsonHistory() {
  const tbody = $('history-table');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-slate-500 text-sm animate-pulse">Memuat riwayat...</td></tr>';

  try {
    const r = await fetch('/api/json-history.php');
    const d = await r.json();
    const rows = d.data || [];
    renderHistoryTable(rows);
    $('history-count').textContent = `${rows.length} entri`;
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-rose-400 text-sm">Gagal memuat riwayat.</td></tr>';
  }
}

function renderHistoryTable(rows) {
  const tbody = $('history-table');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center">
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
    const dtStr = `${dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})} ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`;
    const size  = row.file_size ? `${(row.file_size/1024).toFixed(1)} KB` : '-';
    const lulus    = parseInt(row.lulus) || 0;
    const total    = parseInt(row.jumlah_siswa) || 0;
    const pct      = total ? Math.round(lulus/total*100) : 0;
    const fileOk   = row.file_exists;

    return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors" data-id="${row.id}">
      <td class="px-4 py-4">
        <div>
          <p class="text-white font-bold text-sm">${escHtml(row.lembaga_nama||'-')}</p>
          <p class="text-slate-600 font-mono text-[10px] mt-0.5">${escHtml(row.lembaga_slug||'-')}</p>
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="flex items-center gap-2">
          ${fileOk
            ? `<a href="/exports/${encodeURIComponent(row.file_name)}" download
                 class="text-indigo-400 hover:text-indigo-300 font-mono text-xs truncate max-w-[180px] hover:underline" title="${escHtml(row.file_name)}">
                 📄 ${escHtml(row.file_name)}
               </a>`
            : `<span class="text-rose-500/60 font-mono text-xs line-through truncate max-w-[180px]" title="File tidak ditemukan">
                 ${escHtml(row.file_name)}
               </span>`
          }
        </div>
        <p class="text-slate-600 text-[10px] mt-0.5">${size}</p>
      </td>
      <td class="px-4 py-4 text-center">
        <span class="text-white font-bold">${total}</span>
      </td>
      <td class="px-4 py-4 text-center">
        <div>
          <span class="text-emerald-400 font-bold">${lulus}</span>
          <span class="text-slate-600 text-xs"> / ${total-lulus} TL</span>
        </div>
        <div class="h-1 bg-slate-800 rounded-full mt-1.5 w-16 mx-auto overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div>
        </div>
      </td>
      <td class="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">${dtStr}</td>
      <td class="px-4 py-4">
        <div class="flex items-center gap-1.5 flex-wrap">
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

  const btn = document.querySelector(`[data-id="${id}"] .restore-btn`);
  showToast('Restoring data...','info');

  const r   = await fetch('/api/json-history.php', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'restore', file_name: fileName, lembaga_id: lembagaId })
  });
  const res = await r.json();

  if (res.success) {
    showToast(`✓ ${res.imported} siswa berhasil direstore ke ${lembagaNama}! Menyinkronkan JSON...`, 'success');

    // ── Auto-regenerate data.json + bundle-config.js setelah restore ──
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

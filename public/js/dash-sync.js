// ── SYNC STATUS INDICATOR ─────────────────────────────────────────────────

/**
 * renderBuildBadge — Tampilkan badge status build frontend di panel sync.
 * @param {object} build  - Objek dari sync-status.php: { status, info, dist_path }
 * @param {boolean} isDark
 */
function renderBuildBadge(build, isDark) {
  const status   = build?.status || 'none';
  const info     = build?.info   || '';
  const distPath = build?.dist_path || '';

  const cfgMap = {
    frontend: {
      dot:   'bg-emerald-400',
      badge: isDark
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700',
      label: '⚡ Frontend Build',
      tip:   `dist/frontend/ — hanya portal siswa (optimal untuk bundle)`,
    },
    legacy: {
      dot:   'bg-amber-400 animate-pulse',
      badge: isDark
        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        : 'bg-amber-50 border-amber-200 text-amber-700',
      label: '⚠ Build Lengkap (legacy)',
      tip:   `dist/ — mengandung semua halaman termasuk dashboard. Jalankan npm run build:frontend`,
    },
    none: {
      dot:   'bg-rose-500 animate-pulse',
      badge: isDark
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : 'bg-rose-50 border-rose-200 text-rose-700',
      label: '✗ Belum Ada Build',
      tip:   'Jalankan npm run build:frontend sebelum membuat bundle.',
    },
  };

  const c = cfgMap[status] || cfgMap.none;
  const metaText = info
    ? `<span class="opacity-60 font-normal">${escHtml(info)}</span>`
    : '';
  const pathText = distPath
    ? `<code class="font-mono text-[9px] opacity-50 ml-1">${escHtml(distPath)}</code>`
    : '';

  return `
    <div class="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border ${c.badge} text-[10px] font-bold" title="${escHtml(c.tip)}">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}"></span>
      <span>Build Frontend:</span>
      <span class="font-black">${c.label}</span>
      ${metaText}
      ${pathText}
    </div>`;
}

async function loadSyncStatus() {
  const body = $('sync-status-body');
  const dot  = $('sync-status-dot');
  if (!body) return;

  if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-500 animate-pulse';
  body.innerHTML = `
    <div class="flex items-center gap-3 text-slate-500 text-sm animate-pulse">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Memeriksa status sinkronisasi...
    </div>`;

  try {
    const res = await fetch(`/api/sync-status.php?t=${Date.now()}`);
    const d   = await res.json();
    if (!d.success) throw new Error(d.error || 'Gagal');
    renderSyncStatus(d);
  } catch(e) {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-500';
    body.innerHTML = `<p class="text-rose-400 text-sm">Gagal memeriksa status: ${escHtml(e.message)}</p>`;
  }
}

function renderSyncStatus(d) {
  const body = $('sync-status-body');
  const dot  = $('sync-status-dot');
  if (!body) return;

  // ── Deteksi dark/light mode ──
  const isDark = document.documentElement.classList.contains('dark');

  // ── Color palette berdasarkan mode ──
  const C = {
    cardBg:      isDark ? 'bg-[#0F1523]'         : 'bg-slate-50',
    cardBorder:  isDark ? 'border-slate-800'      : 'border-slate-200',
    totalText:   isDark ? 'text-white'            : 'text-slate-900',
    subText:     isDark ? 'text-slate-500'        : 'text-slate-500',
    labelText:   isDark ? 'text-slate-300'        : 'text-slate-700',
    dimText:     isDark ? 'text-slate-600'        : 'text-slate-400',
    sizeText:    isDark ? 'text-slate-500'        : 'text-slate-500',
    missingText: isDark ? 'text-slate-700'        : 'text-slate-400',
    barTrack:    isDark ? 'bg-slate-800'          : 'bg-slate-200',
    sectionBg:   isDark ? 'bg-[#0F1523]'         : 'bg-slate-50',
    sectionBdr:  isDark ? 'border-slate-800'      : 'border-slate-200',
    hdrBg:       isDark ? 'bg-[#0F1523]'         : 'bg-slate-100',
    rowNoneBg:   isDark ? 'bg-slate-800/30 border-slate-700/30' : 'bg-slate-100 border-slate-200',
    genInfo:     isDark ? 'text-slate-600'        : 'text-slate-500',
    genInfoVal:  isDark ? 'text-slate-400'        : 'text-slate-600',
    codeInlineBg: isDark ? 'background:#1e2435;color:#a5b4fc;padding:1px 5px;border-radius:4px;font-size:0.8em'
                         : 'background:#ede9fe;color:#5b21b6;padding:1px 5px;border-radius:4px;font-size:0.8em',
    codeGreenBg:  isDark ? 'background:#1e2435;color:#6ee7b7;padding:1px 5px;border-radius:4px;font-size:0.8em'
                         : 'background:#d1fae5;color:#065f46;padding:1px 5px;border-radius:4px;font-size:0.8em',
    codeAmberBg:  isDark ? 'background:#2d2210;color:#fcd34d;padding:1px 5px;border-radius:4px;font-size:0.8em'
                         : 'background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;font-size:0.8em',
  };

  const status = d.sync_status;

  const dotColor = {
    in_sync:    'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    out_of_sync:'w-2 h-2 rounded-full bg-amber-400  shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse',
    no_json:    'w-2 h-2 rounded-full bg-rose-500   shadow-[0_0_8px_rgba(239,68,68,0.7)]  animate-pulse',
  };
  if (dot) dot.className = dotColor[status] || dotColor.no_json;

  const bannerCfg = {
    in_sync: {
      bg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      iconColor: 'text-emerald-500',
      titleColor: isDark ? 'text-emerald-400' : 'text-emerald-700',
      descColor: isDark ? 'text-slate-400' : 'text-slate-600',
      title: 'Data & Aset Tersinkronisasi',
      desc: `Database dan <code style="${C.codeGreenBg}">data.json</code> sudah sinkron penuh — data siswa dan semua aset visual cocok.`,
    },
    out_of_sync: {
      bg: isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>`,
      iconColor: 'text-amber-500',
      titleColor: isDark ? 'text-amber-400' : 'text-amber-700',
      descColor: isDark ? 'text-slate-400' : 'text-slate-600',
      title: 'Ada Perubahan yang Belum Di-Generate',
      desc: `Terdapat perbedaan antara database dan <code style="${C.codeAmberBg}">data.json</code>. Klik <strong>Generate</strong> untuk memperbarui.`,
    },
    no_json: {
      bg: isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
      iconColor: 'text-rose-500',
      titleColor: isDark ? 'text-rose-400' : 'text-rose-700',
      descColor: isDark ? 'text-slate-400' : 'text-slate-600',
      title: 'File JSON Belum Ada',
      desc: `File <code style="${C.codeGreenBg}">data.json</code> belum pernah digenerate.`,
    },
  };
  const cfg = bannerCfg[status] || bannerCfg.no_json;

  const db = d.db, json = d.json;
  const dbPct   = db.total   ? Math.round(db.lulus   / db.total   * 100) : 0;
  const jsonPct = json.total ? Math.round(json.lulus / json.total * 100) : 0;

  // ── Asset status config (mode-aware) ──
  const assetStatusCfg = {
    match:        { icon: '✓', color: 'text-emerald-600', bg: isDark ? 'bg-emerald-500/5  border-emerald-500/20' : 'bg-emerald-50  border-emerald-200',  label: 'Sinkron' },
    none:         { icon: '○', color: isDark ? 'text-slate-500' : 'text-slate-400', bg: C.rowNoneBg, label: 'Tidak Ada' },
    missing_json: { icon: '↑', color: 'text-amber-600',   bg: isDark ? 'bg-amber-500/10   border-amber-500/30'  : 'bg-amber-50   border-amber-200',   label: 'Belum di JSON' },
    extra_json:   { icon: '↓', color: 'text-orange-600',  bg: isDark ? 'bg-orange-500/10  border-orange-500/30' : 'bg-orange-50  border-orange-200',  label: 'Dihapus dari DB' },
    changed:      { icon: '~', color: 'text-indigo-600',  bg: isDark ? 'bg-indigo-500/10  border-indigo-500/30' : 'bg-indigo-50  border-indigo-200',  label: 'Berubah' },
  };

  const assetKeys = ['logo', 'stempel', 'ttd', 'kop_surat'];
  const assetIcons = {
    logo:      `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>`,
    stempel:   `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>`,
    ttd:       `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>`,
    kop_surat: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
  };

  const dbDotColor   = isDark ? 'bg-indigo-400'  : 'bg-indigo-500';
  const jsonDotColor = isDark ? 'bg-emerald-400' : 'bg-emerald-500';
  const emptyDot     = isDark ? 'bg-slate-700'   : 'bg-slate-300';

  const assets = d.assets || {};
  const assetRows = assetKeys.map(key => {
    const a   = assets[key] || { status:'none', label:key, db_exists:false, json_exists:false, db_size_kb:0, json_size_kb:0 };
    const sc  = assetStatusCfg[a.status] || assetStatusCfg.none;
    const dbSz   = a.db_exists   ? `<span class="${C.sizeText} text-[10px]">${a.db_size_kb}KB</span>` : `<span class="${C.missingText} text-[10px]">—</span>`;
    const jsonSz = a.json_exists ? `<span class="${C.sizeText} text-[10px]">${a.json_size_kb}KB</span>` : `<span class="${C.missingText} text-[10px]">—</span>`;
    const dbDot  = `<span class="w-2 h-2 rounded-full flex-shrink-0 ${a.db_exists ? dbDotColor : emptyDot}"></span>`;
    const jDot   = `<span class="w-2 h-2 rounded-full flex-shrink-0 ${a.json_exists ? jsonDotColor : emptyDot}"></span>`;

    return `
      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border ${sc.bg}">
        <svg class="w-4 h-4 ${C.dimText} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${assetIcons[key]}</svg>
        <span class="text-xs font-bold ${C.labelText} flex-1 min-w-0">${escHtml(a.label)}</span>
        <div class="flex items-center gap-1.5">${dbDot}${dbSz}</div>
        <svg class="w-3 h-3 ${C.missingText} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
        <div class="flex items-center gap-1.5">${jDot}${jsonSz}</div>
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${sc.color} border ${sc.bg} flex-shrink-0">${sc.icon} ${sc.label}</span>
      </div>`;
  }).join('');

  // ── Perubahan data siswa ──
  let changesHtml = '';
  if (d.changes_count > 0) {
    const icons = {
      added:   ['text-emerald-600', '+', 'Baru di DB'],
      removed: ['text-rose-600',    '−', 'Dihapus dari DB'],
      changed: ['text-amber-600',   '~', 'Status berubah'],
    };
    const typeCount = {};
    d.changes.forEach(c => { typeCount[c.type] = (typeCount[c.type] || 0) + 1; });
    const pills = Object.entries(typeCount).map(([type, n]) => {
      const [color, sym, label] = icons[type] || ['text-slate-500', '?', type];
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${C.rowNoneBg} ${color}">
        <span class="text-sm font-black">${sym}</span> ${n} ${label}
      </span>`;
    }).join('');
    changesHtml = `
      <div class="pt-3 border-t ${C.cardBorder}">
        <p class="text-[10px] font-bold ${C.dimText} uppercase tracking-widest mb-2">Perubahan Data Siswa (${d.changes_count})</p>
        <div class="flex flex-wrap gap-2">${pills}</div>
      </div>`;
  }

  // ── Color states untuk card JSON ──
  const jsonBorder = status==='in_sync' ? (isDark?'border-emerald-500/20':'border-emerald-300')
                   : status==='out_of_sync' ? (isDark?'border-amber-500/20':'border-amber-300')
                   : (isDark?'border-rose-500/20':'border-rose-300');
  const jsonHeaderColor = status==='in_sync' ? (isDark?'text-emerald-400':'text-emerald-700')
                        : status==='out_of_sync' ? (isDark?'text-amber-400':'text-amber-700')
                        : (isDark?'text-rose-400':'text-rose-700');

  const genInfo = json.generated_at
    ? `<span class="${C.genInfo} text-[10px]">JSON dibuat: <span class="${C.genInfoVal}">${escHtml(json.generated_ago || json.generated_at)}</span> &nbsp;·&nbsp; ${json.file_size_kb} KB</span>`
    : `<span class="${C.genInfo} text-[10px] italic">Belum ada file JSON</span>`;

  const assetHeaderColor = d.asset_out_of_sync
    ? (isDark?'text-amber-400':'text-amber-700')
    : (isDark?'text-slate-400':'text-slate-500');
  const assetHeaderIcon  = d.asset_out_of_sync
    ? (isDark?'text-amber-400':'text-amber-500')
    : (isDark?'text-emerald-400':'text-emerald-500');

  body.innerHTML = `
    <!-- Banner Status -->
    <div class="flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} mb-4">
      <svg class="w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${cfg.icon}</svg>
      <div>
        <p class="font-bold text-sm ${cfg.titleColor}">${cfg.title}</p>
        <p class="text-xs ${cfg.descColor} mt-0.5 leading-relaxed">${cfg.desc}</p>
      </div>
    </div>

    <!-- Grid Data Siswa -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <!-- Database -->
      <div class="${C.cardBg} border ${C.cardBorder} rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
          <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest">DB (Sumber)</p>
        </div>
        <p class="text-3xl font-black ${C.totalText} mb-1">${db.total}</p>
        <p class="text-[10px] ${C.subText} mb-3">Total Siswa</p>
        <div class="space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-xs ${C.labelText}">✓ Lulus</span>
            <span class="text-xs font-bold text-emerald-600">${db.lulus} <span class="${C.dimText}">(${dbPct}%)</span></span>
          </div>
          <div class="h-1.5 ${C.barTrack} rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" style="width:${dbPct}%"></div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs ${C.labelText}">✗ Tidak Lulus</span>
            <span class="text-xs font-bold text-rose-600">${db.tidak_lulus}</span>
          </div>
        </div>
      </div>

      <!-- JSON Aktif -->
      <div class="${C.cardBg} border ${jsonBorder} rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 ${jsonHeaderColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-xs font-bold ${jsonHeaderColor} uppercase tracking-widest">data.json</p>
        </div>
        ${json.exists ? `
          <p class="text-3xl font-black ${C.totalText} mb-1">${json.total}</p>
          <p class="text-[10px] ${C.subText} mb-3">Total Siswa</p>
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <span class="text-xs ${C.labelText}">✓ Lulus</span>
              <span class="text-xs font-bold text-emerald-600">${json.lulus} <span class="${C.dimText}">(${jsonPct}%)</span></span>
            </div>
            <div class="h-1.5 ${C.barTrack} rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" style="width:${jsonPct}%"></div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs ${C.labelText}">✗ Tidak Lulus</span>
              <span class="text-xs font-bold text-rose-600">${json.tidak_lulus}</span>
            </div>
          </div>
        ` : `
          <p class="text-3xl font-black text-rose-400 opacity-40 mb-1">—</p>
          <p class="text-xs text-rose-500 opacity-60 italic">Belum ada file</p>
        `}
      </div>
    </div>

    <!-- Aset Visual Section -->
    <div class="border ${C.sectionBdr} rounded-xl overflow-hidden">
      <div class="px-4 py-2.5 ${C.hdrBg} border-b ${C.sectionBdr} flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-3.5 h-3.5 ${assetHeaderIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="text-[10px] font-bold uppercase tracking-widest ${assetHeaderColor}">
            Aset Visual &nbsp;
            ${d.asset_out_of_sync
              ? `<span class="${isDark?'text-amber-400':'text-amber-600'}">⚠ Ada perbedaan</span>`
              : `<span class="${isDark?'text-emerald-400/70':'text-emerald-600'}">✓ Sinkron</span>`}
          </span>
        </div>
        <div class="flex items-center gap-3 text-[10px] ${C.dimText}">
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${dbDotColor}"></span> DB</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${jsonDotColor}"></span> JSON</span>
        </div>
      </div>
      <div class="p-3 space-y-2 ${C.cardBg}">
        ${assetRows}
      </div>
    </div>

    <!-- Footer: timestamp + action -->
    <div class="mt-3 flex items-center justify-between flex-wrap gap-2">
      ${genInfo}
      ${status === 'out_of_sync' ? `
        <button onclick="document.getElementById('input-sync-password').focus(); document.getElementById('input-sync-password').scrollIntoView({behavior:'smooth',block:'center'});"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark?'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20':'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100'} text-xs font-bold transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Generate Sekarang
        </button>` : ''}
    </div>

    <!-- Build Status Badge -->
    ${renderBuildBadge(d.build, isDark)}

    ${changesHtml}`;
}

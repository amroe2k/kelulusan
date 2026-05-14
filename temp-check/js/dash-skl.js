// ═══════════════════════════════════════════════════════════════════════════════
// dash-skl.js — Modul SKL Preview Modal (Self-contained)
// File ini tidak bergantung pada DOMContentLoaded di dash-init.js.
// Di-load setelah dash-util.js (butuh: $, buildSklPreviewHtml, modalOpen, dll)
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let _sklCurrentType = 'skl1';
  let _sklCurrentSiswa = null;
  let _sklCurrentNilai = null;

  // ── Modal HTML (inline, tidak bergantung pada Astro template) ─────────────
  const MODAL_HTML = `
    <div style="background:#111827;border-radius:1rem;border:1px solid #334155;box-shadow:0 25px 60px rgba(0,0,0,.8);width:100%;max-width:64rem;max-height:95vh;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #1e293b;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:2.25rem;height:2.25rem;border-radius:.75rem;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);display:flex;align-items:center;justify-content:center;">
            <svg style="width:1.25rem;height:1.25rem;color:#818cf8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <h3 style="font-weight:700;color:#fff;font-size:.875rem;">Preview Surat Keterangan Lulus</h3>
            <p style="font-size:.625rem;color:#64748b;margin-top:1px;">Tampilan SKL sesuai data lembaga aktif</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
          <button id="skl-tab-1" style="padding:.375rem .875rem;border-radius:.5rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#059669;color:#fff;border:1px solid #059669;cursor:pointer;">Tanpa Nilai</button>
          <button id="skl-tab-2" style="padding:.375rem .875rem;border-radius:.5rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:transparent;color:#64748b;border:1px solid #1e293b;cursor:pointer;">Dengan Nilai</button>
          <span style="color:#334155;margin:0 .25rem;">|</span>
          <span style="font-size:.625rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Skala</span>
          <input id="skl-scale" type="range" min="40" max="100" value="65" step="5" style="width:7rem;accent-color:#6366f1;cursor:pointer;">
          <span id="skl-scale-val" style="font-size:.75rem;font-weight:700;color:#818cf8;width:2.25rem;">65%</span>
          <span style="color:#334155;margin:0 .25rem;">|</span>
          <button id="modal-skl-print" style="display:flex;align-items:center;gap:.5rem;padding:.375rem .875rem;background:#059669;color:#fff;border:none;border-radius:.5rem;font-size:.625rem;font-weight:700;cursor:pointer;">
            <svg style="width:.875rem;height:.875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Cetak / PDF
          </button>
          <button id="modal-skl-close" style="padding:.5rem;color:#64748b;background:transparent;border:none;border-radius:.75rem;cursor:pointer;transition:all .2s;" onmouseenter="this.style.color='#fff';this.style.background='rgba(100,116,139,.4)'" onmouseleave="this.style.color='#64748b';this.style.background='transparent'">
            <svg style="width:1rem;height:1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div style="flex:1;overflow:auto;padding:1.5rem;background:#070c18;min-height:0;">
        <div id="skl-preview-wrap" style="margin:0 auto;transform-origin:top center;transition:transform .2s ease;width:794px;">
          <iframe id="skl-iframe" style="width:794px;height:1247px;border:none;border-radius:6px;box-shadow:0 25px 60px rgba(0,0,0,0.6);display:block;" title="Preview SKL"></iframe>
        </div>
      </div>
    </div>`;

  // ── Ensure modal element exists ───────────────────────────────────────────
  function ensureModal() {
    let el = document.getElementById('modal-skl-preview');
    if (el) {
      // Pindahkan ke body jika belum langsung di body
      if (el.parentElement !== document.body) document.body.appendChild(el);
      return el;
    }
    // Buat baru
    el = document.createElement('div');
    el.id = 'modal-skl-preview';
    el.style.cssText = 'position:fixed;inset:0;z-index:990;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);';
    el.innerHTML = MODAL_HTML;
    document.body.appendChild(el);
    return el;
  }

  // ── Loading spinner for iframe ────────────────────────────────────────────
  function showLoading() {
    const iframe = document.getElementById('skl-iframe');
    if (!iframe) return;
    iframe.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}.s{width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:r .8s linear infinite}@keyframes r{to{transform:rotate(360deg)}}p{color:#64748b;font-size:14px;font-weight:600}</style></head><body><div class="s"></div><p>Memuat data SKL...</p></body></html>';
  }

  // ── Tab style updater ─────────────────────────────────────────────────────
  function updateTabs(type) {
    const t1 = document.getElementById('skl-tab-1');
    const t2 = document.getElementById('skl-tab-2');
    const active = 'padding:.375rem .875rem;border-radius:.5rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;';
    if (t1) t1.style.cssText = active + (type === 'skl1' ? 'background:#059669;color:#fff;border:1px solid #059669;' : 'background:rgba(99,102,241,.2);color:#818cf8;border:1px solid rgba(99,102,241,.4);');
    if (t2) t2.style.cssText = active + (type === 'skl2' ? 'background:#4f46e5;color:#fff;border:1px solid #4f46e5;' : 'background:transparent;color:#64748b;border:1px solid #1e293b;');
  }

  // ── Render SKL content into iframe ────────────────────────────────────────
  function renderSklIframe(type) {
    _sklCurrentType = type || _sklCurrentType;
    // allData is a global from dash-init.js / dash-util.js
    var meta = (typeof allData !== 'undefined' && allData && allData._meta) ? allData._meta : {};
    var html = (typeof buildSklPreviewHtml === 'function')
      ? buildSklPreviewHtml(meta, _sklCurrentSiswa, _sklCurrentNilai, _sklCurrentType)
      : '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><p>buildSklPreviewHtml not loaded</p></body></html>';
    var iframe = document.getElementById('skl-iframe');
    if (iframe) iframe.srcdoc = html;
    updateTabs(_sklCurrentType);
  }

  // ── Open SKL modal ────────────────────────────────────────────────────────
  function openSklModal(siswaData, nilaiData, initialType) {
    var modal = ensureModal();
    _sklCurrentSiswa = siswaData || null;
    _sklCurrentNilai = nilaiData || null;
    _sklCurrentType  = initialType || 'skl1';

    // Tampilkan modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Set scale
    var sv = parseInt((document.getElementById('skl-scale') || {}).value || 65);
    var wrap = document.getElementById('skl-preview-wrap');
    if (wrap) wrap.style.transform = 'scale(' + (sv / 100) + ')';
    var svl = document.getElementById('skl-scale-val');
    if (svl) svl.textContent = sv + '%';

    // Cek apakah allData tersedia
    if (typeof allData === 'undefined' || !allData || !allData._meta) {
      showLoading();
      fetch('/api/data.php?t=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && !d.error) { allData = d; }
          renderSklIframe(_sklCurrentType);
        })
        .catch(function () { renderSklIframe(_sklCurrentType); });
    } else {
      renderSklIframe(_sklCurrentType);
    }
  }

  // ── Bind events (dijalankan saat DOM ready) ───────────────────────────────
  function bindEvents() {
    // Tab switches
    document.getElementById('skl-tab-1')?.addEventListener('click', function () { renderSklIframe('skl1'); });
    document.getElementById('skl-tab-2')?.addEventListener('click', function () { renderSklIframe('skl2'); });

    // Close button
    document.getElementById('modal-skl-close')?.addEventListener('click', function () {
      var m = document.getElementById('modal-skl-preview');
      if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
    });

    // Backdrop click to close
    var modal = document.getElementById('modal-skl-preview');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
      });
    }

    // Print
    document.getElementById('modal-skl-print')?.addEventListener('click', function () {
      var iframe = document.getElementById('skl-iframe');
      if (iframe && iframe.contentWindow) {
        var orig = document.title;
        document.title = _sklCurrentSiswa
          ? 'SKL - ' + _sklCurrentSiswa.nama + ' - ' + (_sklCurrentSiswa.nisn || '0000000000')
          : 'SKL - Preview';
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(function () { document.title = orig; }, 1000);
      }
    });

    // Scale slider
    document.getElementById('skl-scale')?.addEventListener('input', function (e) {
      var v = parseInt(e.target.value);
      var svl = document.getElementById('skl-scale-val');
      if (svl) svl.textContent = v + '%';
      var wrap = document.getElementById('skl-preview-wrap');
      if (wrap) wrap.style.transform = 'scale(' + (v / 100) + ')';
    });

    // Preview button pada halaman Identitas
    document.getElementById('btn-preview-skl')?.addEventListener('click', function () {
      openSklModal(null, null, 'skl1');
    });
  }

  // ── Expose ke window (langsung, tanpa menunggu DOMContentLoaded) ──────────
  window._openSklModal = openSklModal;
  window._renderSklIframe = renderSklIframe;

  // ── Init saat DOM ready ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureModal();
      bindEvents();
    });
  } else {
    // DOM sudah ready (script dimuat late/defer)
    ensureModal();
    bindEvents();
  }

})();

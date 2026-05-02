// ── Profile View ─────────────────────────────────────────────────────────────

function renderProfile() {
  if (!auth) return;
  // Populate display
  const $name    = $('profile-display-name');
  const $role    = $('profile-display-role');
  const $uname   = $('profile-display-username');
  const $initials= $('profile-avatar-initials');
  const $inpNama = $('profile-nama');
  const $inpUser = $('profile-username');
  const $sbAvatar= $('sb-avatar');

  if ($name)    $name.textContent    = auth.nama || 'Administrator';
  if ($role){   $role.textContent    = auth.role || 'admin'; $role.className = `role-badge ${auth.role||'admin'}`; }
  if ($uname)   $uname.textContent   = '@' + (auth.username || '');
  if ($initials) $initials.textContent= (auth.nama||'A').charAt(0).toUpperCase();
  if ($inpNama)  $inpNama.value      = auth.nama || '';
  if ($inpUser)  $inpUser.value      = auth.username || '';

  // Load saved avatar from localStorage
  const savedAvatar = localStorage.getItem(`avatar_${auth.id || auth.username}`);
  if (savedAvatar) applyAvatar(savedAvatar);
}

function applyAvatar(dataUrl) {
  const img      = $('profile-avatar-img');
  const initials = $('profile-avatar-initials');
  const sbAvatar = $('sb-avatar');

  if (img) { img.src = dataUrl; img.classList.remove('hidden'); }
  if (initials) initials.classList.add('hidden');

  // Update sidebar avatar too
  if (sbAvatar) {
    sbAvatar.style.backgroundImage = `url('${dataUrl}')`;
    sbAvatar.style.backgroundSize  = 'cover';
    sbAvatar.style.backgroundPosition = 'center';
    sbAvatar.textContent = '';
  }
}

function clearAvatar() {
  const img      = $('profile-avatar-img');
  const initials = $('profile-avatar-initials');
  const sbAvatar = $('sb-avatar');

  if (img) { img.src = ''; img.classList.add('hidden'); }
  if (initials) { initials.classList.remove('hidden'); initials.textContent = (auth?.nama||'A').charAt(0).toUpperCase(); }
  if (sbAvatar) {
    sbAvatar.style.backgroundImage = '';
    sbAvatar.style.backgroundSize  = '';
    sbAvatar.textContent = (auth?.nama||'A').charAt(0).toUpperCase();
  }
  localStorage.removeItem(`avatar_${auth?.id || auth?.username}`);
}

function processAvatarFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('File harus berupa gambar (JPG/PNG/WebP)', 'error'); return;
  }
  if (file.size > 3 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 3MB', 'error'); return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    // Resize to max 256x256 using canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size   = Math.min(img.width, img.height, 256);
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Center-crop
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      applyAvatar(dataUrl);
      localStorage.setItem(`avatar_${auth?.id || auth?.username}`, dataUrl);
      showToast('Foto profil berhasil diperbarui!', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Password strength ─────────────────────────────────────────────────────────
function checkPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: 'Sangat Lemah', color: '#ef4444', width: '15%' },
    { label: 'Lemah',        color: '#f97316', width: '30%' },
    { label: 'Cukup',        color: '#eab308', width: '55%' },
    { label: 'Kuat',         color: '#22c55e', width: '75%' },
    { label: 'Sangat Kuat',  color: '#10b981', width: '100%' },
  ];
  return levels[Math.max(0, Math.min(score - 1, 4))];
}

// ── Init Profile Events ───────────────────────────────────────────────────────
function initProfileEvents() {
  const zone       = $('profile-avatar-zone');
  const fileInput  = $('profile-avatar-input');
  const overlay    = $('profile-dragover-overlay');
  const dropHint   = $('profile-drop-hint');

  // Click to upload
  if (zone) zone.addEventListener('click', () => fileInput?.click());
  if (fileInput) fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processAvatarFile(e.target.files[0]);
    e.target.value = '';
  });

  // Drag & Drop on the whole page when on profile view
  let dragCounter = 0;
  document.addEventListener('dragenter', (e) => {
    if (currentView !== 'profile') return;
    e.preventDefault(); dragCounter++;
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
    if (dropHint) dropHint.classList.remove('hidden');
  });
  document.addEventListener('dragleave', (e) => {
    if (currentView !== 'profile') return;
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
      if (dropHint) dropHint.classList.add('hidden');
    }
  });
  document.addEventListener('dragover', (e) => {
    if (currentView !== 'profile') return;
    e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    if (currentView !== 'profile') return;
    e.preventDefault(); dragCounter = 0;
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
    if (dropHint) dropHint.classList.add('hidden');
    const file = e.dataTransfer?.files[0];
    if (file) processAvatarFile(file);
  });

  // Password strength meter
  $('profile-pw-new')?.addEventListener('input', (e) => {
    const pw   = e.target.value;
    const wrap = $('pw-strength-wrap');
    const bar  = $('pw-strength-bar');
    const lbl  = $('pw-strength-label');
    if (!wrap) return;
    if (!pw) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    const s = checkPasswordStrength(pw);
    if (bar) { bar.style.width = s.width; bar.style.background = s.color; }
    if (lbl) { lbl.textContent = s.label; lbl.style.color = s.color; }
  });

  // Save profile name
  $('form-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = $('profile-nama')?.value?.trim();
    if (!nama) { showToast('Nama tidak boleh kosong', 'warning'); return; }

    const btn = $('btn-save-profile');
    const orig = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<span class="animate-pulse">Menyimpan...</span>'; btn.disabled = true; }

    try {
      const res = await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_self', nama })
      });
      const data = await res.json();
      if (data.success) {
        auth.nama = nama;
        sessionStorage.setItem('auth', JSON.stringify(auth));
        // Update sidebar
        if ($('sb-nama')) $('sb-nama').textContent = nama;
        if ($('sb-avatar') && !localStorage.getItem(`avatar_${auth.id || auth.username}`)) {
          $('sb-avatar').textContent = nama.charAt(0).toUpperCase();
        }
        if ($('profile-display-name')) $('profile-display-name').textContent = nama;
        if ($('profile-avatar-initials')) $('profile-avatar-initials').textContent = nama.charAt(0).toUpperCase();
        showToast('Profil berhasil disimpan!', 'success');
      } else {
        showToast(data.error || 'Gagal menyimpan profil', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    }
  });

  // Change password
  $('form-profile-password')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPw  = $('profile-pw-old')?.value;
    const newPw  = $('profile-pw-new')?.value;
    const confPw = $('profile-pw-confirm')?.value;

    if (!oldPw || !newPw || !confPw) { showToast('Semua field password wajib diisi', 'warning'); return; }
    if (newPw !== confPw)             { showToast('Konfirmasi password tidak cocok', 'error');   return; }
    if (newPw.length < 8)             { showToast('Password baru minimal 8 karakter', 'warning'); return; }

    const btn  = e.target.querySelector('[type="submit"]');
    const orig = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<span class="animate-pulse">Memperbarui...</span>'; btn.disabled = true; }

    try {
      const res = await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', old_password: oldPw, new_password: newPw })
      });
      const data = await res.json();
      if (data.success) {
        e.target.reset();
        if ($('pw-strength-wrap')) $('pw-strength-wrap').classList.add('hidden');
        showToast('Password berhasil diperbarui!', 'success');
      } else {
        showToast(data.error || 'Gagal memperbarui password', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    }
  });

  // Profile logout button
  $('profile-btn-logout')?.addEventListener('click', () => showConfirm(
    'Keluar Sistem', 'Yakin ingin mengakhiri sesi aktif?',
    async () => {
      try { await fetch('/api/logout.php'); } catch (e) {}
      sessionStorage.removeItem('auth');
      window.location.href = '/login';
    }
  ));
}

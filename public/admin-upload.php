<?php
/**
 * admin-upload.php
 * Halaman admin KHUSUS HOSTING untuk upload data.json
 * Letakkan file ini di: public_html/admin-upload.php
 * Akses via: https://namadomain.com/admin-upload.php
 */

// ─── KONFIGURASI ─────────────────────────────────────────────
define('UPLOAD_PASSWORD', 'admin123');   // Ganti dengan password Anda
define('DATA_JSON_PATH',  __DIR__ . '/data.json');
define('MAX_FILE_SIZE',   5 * 1024 * 1024); // 5 MB
// ─────────────────────────────────────────────────────────────

session_start();

$message = '';
$messageType = '';
$jsonInfo = null;

// Cek file data.json yang ada
$currentTgl = '';
$currentTgl2 = '';
if (file_exists(DATA_JSON_PATH)) {
    $existing = json_decode(file_get_contents(DATA_JSON_PATH), true);
    if ($existing) {
        $tglRaw  = $existing['_meta']['tanggal_pengumuman'] ?? '';
        $tgl2Raw = $existing['_meta']['tanggal_skl2'] ?? '';
        $jsonInfo = [
            'sekolah'  => $existing['_meta']['sekolah'] ?? '-',
            'tapel'    => $existing['_meta']['tahun_ajaran'] ?? '-',
            'total'    => isset($existing['siswa']) ? count($existing['siswa']) : 0,
            'modified' => date('d M Y, H:i', filemtime(DATA_JSON_PATH)),
            // Gunakan field _display jika tersedia, fallback ke raw
            'tgl'      => $existing['_meta']['tanggal_pengumuman_display'] ?? $tglRaw,
            'tgl2'     => $existing['_meta']['tanggal_skl2_display'] ?? $tgl2Raw,
        ];
        $bulan = ['januari'=>1,'februari'=>2,'maret'=>3,'april'=>4,'mei'=>5,'juni'=>6,
                  'juli'=>7,'agustus'=>8,'september'=>9,'oktober'=>10,'november'=>11,'desember'=>12];
        // Parse tanggal_pengumuman → YYYY-MM-DD untuk input[type=date]
        if ($tglRaw) {
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', trim($tglRaw), $isoM)) {
                $currentTgl = $isoM[1]; // handles YYYY-MM-DD and YYYY-MM-DDTHH:...
            } elseif (preg_match('/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i', trim($tglRaw), $m)) {
                $mon = $bulan[strtolower($m[2])] ?? 0;
                if ($mon) $currentTgl = sprintf('%04d-%02d-%02d', $m[3], $mon, $m[1]);
            }
        }
        // Parse tanggal_skl2 → YYYY-MM-DD untuk input[type=date]
        // Handles: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS.sssZ, "dd Bulan YYYY"
        if ($tgl2Raw) {
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', trim($tgl2Raw), $isoM)) {
                $currentTgl2 = $isoM[1]; // ISO timestamp → ambil bagian tanggal saja
            } elseif (preg_match('/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i', trim($tgl2Raw), $m)) {
                $mon = $bulan[strtolower($m[2])] ?? 0;
                if ($mon) $currentTgl2 = sprintf('%04d-%02d-%02d', $m[3], $mon, $m[1]);
            }
        }
    }
}
// Deteksi otomatis SKL aktif berdasarkan tanggal
$effectiveSkl = 'skl1';
if ($currentTgl2) {
    $skl2Date = DateTime::createFromFormat('Y-m-d', $currentTgl2);
    if ($skl2Date && new DateTime() >= $skl2Date) $effectiveSkl = 'skl2';
}

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'login') {
        if ($_POST['password'] === UPLOAD_PASSWORD) {
            $_SESSION['upload_auth'] = true;
        } else {
            $message = 'Password salah. Coba lagi.';
            $messageType = 'error';
        }
    }

    if ($_POST['action'] === 'logout') {
        session_destroy();
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }

    // Handle update tanggal pengumuman
    if ($_POST['action'] === 'update_tgl' && !empty($_SESSION['upload_auth'])) {
        $newTgl  = trim($_POST['tanggal_pengumuman'] ?? '');
        $newTgl2 = trim($_POST['tanggal_skl2'] ?? '');
        if (!$newTgl) {
            $message = 'Tanggal SKL1 (Pengumuman) tidak boleh kosong.';
            $messageType = 'error';
        } elseif (!file_exists(DATA_JSON_PATH)) {
            $message = 'data.json belum ada. Upload file JSON terlebih dahulu.';
            $messageType = 'error';
        } else {
            $json = json_decode(file_get_contents(DATA_JSON_PATH), true);
            if (!$json) {
                $message = 'Gagal membaca data.json.';
                $messageType = 'error';
            } else {
                $bulanId = ['Januari','Februari','Maret','April','Mei','Juni',
                            'Juli','Agustus','September','Oktober','November','Desember'];
                $dt1 = DateTime::createFromFormat('Y-m-d', $newTgl);
                $tglDisplay1 = $dt1 ? $dt1->format('j') . ' ' . $bulanId[(int)$dt1->format('n') - 1] . ' ' . $dt1->format('Y') : $newTgl;
                $dt2 = $newTgl2 ? DateTime::createFromFormat('Y-m-d', $newTgl2) : null;
                $tglDisplay2 = $dt2 ? $dt2->format('j') . ' ' . $bulanId[(int)$dt2->format('n') - 1] . ' ' . $dt2->format('Y') : $newTgl2;

                $json['_meta']['tanggal_pengumuman'] = $newTgl;
                $json['_meta']['tanggal_pengumuman_display'] = $tglDisplay1;
                $json['_meta']['tanggal_skl2'] = $newTgl2;
                $json['_meta']['tanggal_skl2_display'] = $tglDisplay2;
                file_put_contents(DATA_JSON_PATH, json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

                $currentTgl  = $newTgl;
                $currentTgl2 = $newTgl2;
                // Refresh effective SKL
                $effectiveSkl = ($newTgl2 && new DateTime() >= (DateTime::createFromFormat('Y-m-d',$newTgl2) ?: new DateTime('2099-12-31'))) ? 'skl2' : 'skl1';
                $jsonInfo['tgl']  = $tglDisplay1;
                $jsonInfo['tgl2'] = $tglDisplay2;
                $message = '✓ Pengaturan tanggal berhasil diperbarui!';
                $messageType = 'success';
            }
        }
    }

    // Handle upload
    if ($_POST['action'] === 'upload' && !empty($_SESSION['upload_auth'])) {
        if (!isset($_FILES['json_file']) || $_FILES['json_file']['error'] !== UPLOAD_ERR_OK) {
            $message = 'File tidak valid atau upload gagal.';
            $messageType = 'error';
        } elseif ($_FILES['json_file']['size'] > MAX_FILE_SIZE) {
            $message = 'File terlalu besar. Maksimum 5MB.';
            $messageType = 'error';
        } else {
            $content = file_get_contents($_FILES['json_file']['tmp_name']);
            $parsed = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $message = 'File bukan JSON valid: ' . json_last_error_msg();
                $messageType = 'error';
            } elseif (!isset($parsed['siswa']) || !isset($parsed['_meta'])) {
                $message = 'Struktur JSON tidak valid. Pastikan file berasal dari sistem Generate JSON.';
                $messageType = 'error';
            } else {
                // Backup file lama
                if (file_exists(DATA_JSON_PATH)) {
                    copy(DATA_JSON_PATH, DATA_JSON_PATH . '.bak');
                }
                file_put_contents(DATA_JSON_PATH, $content);
                $total = count($parsed['siswa']);
                $sekolah = $parsed['_meta']['sekolah'] ?? '-';
                $message = "✓ data.json berhasil diperbarui! Memuat {$total} siswa dari {$sekolah}.";
                $messageType = 'success';
                // Refresh info
                $jsonInfo = [
                    'sekolah'   => $parsed['_meta']['sekolah'] ?? '-',
                    'tapel'     => $parsed['_meta']['tahun_ajaran'] ?? '-',
                    'total'     => $total,
                    'modified'  => date('d M Y, H:i'),
                ];
            }
        }
    }
}

$isAuth = !empty($_SESSION['upload_auth']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Upload — Portal Kelulusan</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0B0F19;
    --card: #111827;
    --card2: #0F1523;
    --border: #1e293b;
    --indigo: #6366f1;
    --violet: #8b5cf6;
    --emerald: #10b981;
    --rose: #f43f5e;
    --amber: #f59e0b;
    --text: #e2e8f0;
    --muted: #94a3b8;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background-image: radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 60%);
  }
  .wrap { width: 100%; max-width: 520px; }
  .brand {
    text-align: center;
    margin-bottom: 2rem;
  }
  .brand-icon {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, var(--indigo), var(--violet));
    border-radius: 16px;
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 1rem;
    box-shadow: 0 8px 32px rgba(99,102,241,0.3);
  }
  .brand h1 { font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 900; color: #fff; }
  .brand p { color: var(--muted); font-size: 0.75rem; margin-top: 0.25rem; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.4);
  }
  .card-header {
    padding: 1.25rem 1.5rem;
    background: var(--card2);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .card-header h2 { font-size: 0.875rem; font-weight: 700; color: #fff; }
  .card-body { padding: 1.5rem; }
  label { display: block; font-size: 0.65rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
  input[type="password"], input[type="file"] {
    width: 100%; background: var(--card2); border: 1px solid var(--border);
    border-radius: 12px; padding: 0.75rem 1rem; color: #fff; font-size: 0.875rem;
    outline: none; transition: border-color 0.2s;
  }
  input[type="password"]:focus { border-color: var(--indigo); }
  input[type="file"] { cursor: pointer; }
  input[type="file"]::file-selector-button {
    background: var(--indigo); color: #fff; border: none;
    padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer;
    font-size: 0.75rem; font-weight: 700; margin-right: 0.75rem;
  }
  .btn {
    width: 100%; padding: 0.875rem; border: none; border-radius: 12px;
    font-size: 0.875rem; font-weight: 700; cursor: pointer;
    transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .btn-primary { background: var(--indigo); color: #fff; }
  .btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.35); }
  .btn-danger { background: rgba(244,63,94,0.1); color: var(--rose); border: 1px solid rgba(244,63,94,0.2); }
  .btn-danger:hover { background: rgba(244,63,94,0.2); }
  .space-y > * + * { margin-top: 1rem; }
  .alert {
    padding: 0.875rem 1rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;
    display: flex; align-items: flex-start; gap: 0.5rem;
  }
  .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #34d399; }
  .alert-error { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.25); color: #fb7185; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
  .info-item {
    background: var(--card2); border: 1px solid var(--border);
    border-radius: 12px; padding: 0.875rem;
  }
  .info-item .label { font-size: 0.6rem; color: var(--muted); margin-bottom: 0.25rem; }
  .info-item .value { font-size: 0.875rem; font-weight: 700; color: #fff; }
  .info-item .value.highlight { color: var(--indigo); font-size: 1.25rem; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 1.25rem 0; }
  .upload-zone {
    border: 2px dashed var(--border); border-radius: 12px; padding: 1.5rem;
    text-align: center; transition: all 0.2s ease; cursor: pointer;
    position: relative; user-select: none;
  }
  .upload-zone:hover { border-color: var(--indigo); background: rgba(99,102,241,0.04); }
  .upload-zone input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 1; width: 100%; height: 100%;
  }
  .upload-zone .icon { color: var(--muted); margin-bottom: 0.5rem; }
  .upload-zone p { font-size: 0.75rem; color: var(--muted); }
  .upload-zone strong { color: var(--text); }
  .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge-emerald { background: rgba(16,185,129,0.1); color: var(--emerald); border: 1px solid rgba(16,185,129,0.25); }
  .footer { text-align: center; margin-top: 1.5rem; font-size: 0.65rem; color: var(--muted); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--emerald); display: inline-block; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
</style>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <div class="brand-icon">
      <svg width="28" height="28" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
    </div>
    <h1>Portal Kelulusan</h1>
    <p>Admin Upload — Data Siswa</p>
  </div>

  <?php if ($message): ?>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: '<?= $messageType === "success" ? "success" : ($messageType === "error" ? "error" : "info") ?>',
        title: <?= json_encode($message) ?>
      });
    });
  </script>
  <?php endif; ?>

  <?php if (!$isAuth): ?>
  <!-- LOGIN FORM -->
  <div class="card">
    <div class="card-header">
      <svg width="16" height="16" fill="none" stroke="#8b5cf6" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      <h2>Autentikasi Admin</h2>
    </div>
    <div class="card-body">
      <form method="POST" class="space-y">
        <input type="hidden" name="action" value="login">
        <div>
          <label>Password Admin</label>
          <input type="password" name="password" placeholder="Masukkan password..." required autofocus>
        </div>
        <button type="submit" class="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
          Masuk
        </button>
      </form>
    </div>
  </div>

  <?php else: ?>
  <!-- UPLOAD DASHBOARD -->
  <div class="card">
    <div class="card-header">
      <span class="dot"></span>
      <h2>Admin Panel — Upload data.json</h2>
      <form method="POST" style="margin-left:auto;">
        <input type="hidden" name="action" value="logout">
        <button type="submit" class="btn btn-danger" style="width:auto;padding:0.3rem 0.75rem;font-size:0.7rem;">Keluar</button>
      </form>
    </div>
    <div class="card-body">

      <!-- Info JSON aktif -->
      <?php if ($jsonInfo): ?>
      <p style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:.75rem;">Data Aktif di Hosting</p>
      <div class="info-grid">
        <div class="info-item" style="grid-column:span 2;">
          <div class="label">Sekolah</div>
          <div class="value"><?= htmlspecialchars($jsonInfo['sekolah']) ?></div>
        </div>
        <div class="info-item">
          <div class="label">Tahun Ajaran</div>
          <div class="value"><?= htmlspecialchars($jsonInfo['tapel']) ?></div>
        </div>
        <div class="info-item">
          <div class="label">Total Siswa</div>
          <div class="value highlight"><?= $jsonInfo['total'] ?></div>
        </div>
        <div class="info-item">
          <div class="label">SKL Aktif (Otomatis)</div>
          <div class="value" style="color:<?= $effectiveSkl === 'skl2' ? 'var(--emerald)' : 'var(--amber)' ?>">
            <?= $effectiveSkl === 'skl2' ? 'SKL 2 — Dengan Nilai' : 'SKL 1 — Tanpa Nilai' ?>
          </div>
        </div>
        <div class="info-item" style="grid-column:span 2;">
          <div class="label">Tanggal SKL1 (Pengumuman)</div>
          <div class="value" style="color:var(--violet);"><?= htmlspecialchars($jsonInfo['tgl'] ?? '-') ?></div>
        </div>
        <div class="info-item" style="grid-column:span 2;">
          <div class="label">Tanggal SKL2 (Dengan Nilai)</div>
          <div class="value" style="color:var(--violet);"><?= htmlspecialchars($jsonInfo['tgl2'] ?? '-') ?></div>
        </div>
        <div class="info-item" style="grid-column:span 2;">
          <div class="label">Terakhir Diperbarui</div>
          <div class="value" style="font-size:.75rem;color:var(--muted);"><?= $jsonInfo['modified'] ?></div>
        </div>
      </div>
      <hr class="divider">
      <?php else: ?>
      <div class="alert alert-error" style="margin-bottom:1.25rem;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        data.json belum ada. Upload sekarang untuk mengaktifkan portal.
      </div>
      <?php endif; ?>
      <?php if ($jsonInfo): ?>
      <p style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:.75rem;">Edit Pengaturan SKL</p>
      <form method="POST" class="space-y" style="margin-bottom:1.25rem;" id="form-pengaturan">
        <input type="hidden" name="action" value="update_tgl">
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:.75rem 1rem;font-size:.72rem;color:#6ee7b7;display:flex;gap:.5rem;align-items:flex-start;">
          <svg style="flex-shrink:0;margin-top:.1rem;" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span><strong>SKL otomatis</strong> — Sebelum Tanggal SKL2 tampil SKL1 (tanpa nilai), setelah Tanggal SKL2 tampil SKL2 (dengan nilai). Tidak perlu pilih manual.</span>
        </div>
        <div>
          <label>Tanggal SKL1 (Pengumuman)</label>
          <input type="date" name="tanggal_pengumuman" value="<?= htmlspecialchars($currentTgl) ?>" required
            style="width:100%;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:0.75rem 1rem;color:#fff;font-size:0.875rem;outline:none;transition:border-color 0.2s;color-scheme:dark;">
        </div>
        <div>
          <label>Tanggal SKL2 (Dengan Nilai)</label>
          <input type="date" name="tanggal_skl2" value="<?= htmlspecialchars($currentTgl2) ?>"
            style="width:100%;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:0.75rem 1rem;color:#fff;font-size:0.875rem;outline:none;transition:border-color 0.2s;color-scheme:dark;">
        </div>
        <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:10px;padding:.75rem 1rem;font-size:.72rem;color:#c4b5fd;display:flex;gap:.5rem;align-items:flex-start;">
          <svg style="flex-shrink:0;margin-top:.1rem;" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Portal publik hanya menampilkan hasil kelulusan <strong>setelah</strong> tanggal pengumuman yang sesuai.</span>
        </div>
        <button type="submit" class="btn btn-primary" style="background:var(--violet);">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Simpan Pengaturan
        </button>
      </form>
      <hr class="divider">
      <?php endif; ?>

      <!-- Upload Form -->
      <p style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:.75rem;">Upload data.json Baru</p>
      <form method="POST" enctype="multipart/form-data" class="space-y" id="form-upload">
        <input type="hidden" name="action" value="upload">
        <div class="upload-zone" id="dropzone">
          <input type="file" name="json_file" accept=".json,application/json" required id="fileInput">
          <div class="icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
          </div>
          <p><strong>Klik atau seret file ke sini</strong></p>
          <p style="margin-top:.25rem;">Format: <code style="color:var(--indigo);">.json</code> — Maks. 5MB</p>
          <p id="file-name" style="margin-top:.5rem;color:var(--indigo);font-weight:700;font-size:.75rem;"></p>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:.75rem 1rem;font-size:.72rem;color:#fbbf24;display:flex;gap:.5rem;align-items:flex-start;">
          <svg style="flex-shrink:0;margin-top:.1rem;" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>File lama akan di-backup sebagai <code>data.json.bak</code>. Pastikan file berasal dari menu <strong>Generate JSON</strong> di Dashboard Admin lokal.</span>
        </div>
        <button type="submit" class="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Upload & Perbarui data.json
        </button>
      </form>
    </div>
  </div>
  <?php endif; ?>

  <p class="footer">Portal Kelulusan &bull; Admin Upload Panel &bull; Akses terbatas</p>
</div>

<script>
(function() {
  const zone = document.getElementById('dropzone');
  const fi   = document.getElementById('fileInput');
  const fn   = document.getElementById('file-name');

  if (!zone || !fi) return;

  // Tampilkan nama file saat dipilih via klik
  fi.addEventListener('change', () => setFile(fi.files[0]));

  function setFile(file) {
    if (!file) { fn.textContent = ''; return; }
    // Validasi ekstensi
    if (!file.name.toLowerCase().endsWith('.json')) {
      fn.style.color = '#f43f5e';
      fn.textContent = '⚠️ Hanya file .json yang diterima!';
      fi.value = '';
      return;
    }
    fn.style.color = '#6366f1';
    fn.textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    zone.style.borderColor = '#6366f1';
    zone.style.background  = 'rgba(99,102,241,0.06)';
  }

  // Drag events
  ['dragenter','dragover'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = '#6366f1';
      zone.style.background  = 'rgba(99,102,241,0.10)';
      zone.style.transform   = 'scale(1.02)';
    });
  });

  ['dragleave','dragend'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = '';
      zone.style.background  = '';
      zone.style.transform   = '';
    });
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    zone.style.transform = '';

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Transfer file ke input agar form bisa submit
    const dt = new DataTransfer();
    dt.items.add(files[0]);
    fi.files = dt.files;

    setFile(files[0]);
  });

  // Konfirmasi Form dengan SweetAlert2
  const formPengaturan = document.getElementById('form-pengaturan');
  if (formPengaturan) {
    formPengaturan.addEventListener('submit', function(e) {
      e.preventDefault();
      Swal.fire({
        title: 'Simpan Pengaturan?',
        text: 'Tanggal pengumuman SKL1 dan SKL2 akan diperbarui. Tipe SKL ditentukan otomatis berdasarkan tanggal.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8b5cf6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Simpan',
        cancelButtonText: 'Batal',
        background: '#111827',
        color: '#fff'
      }).then((result) => {
        if (result.isConfirmed) this.submit();
      });
    });
  }

  const formUpload = document.getElementById('form-upload');
  if (formUpload) {
    formUpload.addEventListener('submit', function(e) {
      e.preventDefault();
      const fileCount = fi.files.length;
      if (fileCount === 0) {
        Swal.fire({
          title: 'Tidak ada file',
          text: 'Harap pilih file data.json terlebih dahulu.',
          icon: 'warning',
          background: '#111827',
          color: '#fff'
        });
        return;
      }
      Swal.fire({
        title: 'Perbarui data.json?',
        text: 'File data lama akan dibackup. Lanjutkan upload?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Upload',
        cancelButtonText: 'Batal',
        background: '#111827',
        color: '#fff'
      }).then((result) => {
        if (result.isConfirmed) this.submit();
      });
    });
  }
})();
</script>
</body>
</html>

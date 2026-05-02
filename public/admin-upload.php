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
            $message = 'Selamat Datang di Panel Admin!';
            $messageType = 'success';
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
                $message = 'Pengaturan tanggal berhasil diperbarui!';
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
                $message = "data.json berhasil diperbarui! Memuat {$total} siswa dari {$sekolah}.";
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
  :root {
    --bg: #060910;
    --surface: rgba(17, 24, 39, 0.7);
    --surface-hover: rgba(31, 41, 55, 0.8);
    --border: rgba(255, 255, 255, 0.08);
    --border-bright: rgba(255, 255, 255, 0.15);
    --primary: #6366f1;
    --primary-rgb: 99, 102, 241;
    --primary-glow: rgba(99, 102, 241, 0.4);
    --secondary: #a855f7;
    --accent: #0ea5e9;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --rose: #f43f5e;
    --emerald: #10b981;
    --amber: #f59e0b;
    --mesh-1: rgba(99, 102, 241, 0.15);
    --mesh-2: rgba(168, 85, 247, 0.12);
    --mesh-3: rgba(14, 165, 233, 0.1);
  }

  [data-theme="light"] {
    --bg: #f1f5f9;
    --surface: #ffffff;
    --surface-hover: #ffffff;
    --border: #e2e8f0;
    --border-bright: #cbd5e1;
    --primary: #4f46e5;
    --primary-rgb: 79, 70, 229;
    --primary-glow: rgba(79, 70, 229, 0.1);
    --secondary: #9333ea;
    --accent: #0284c7;
    --text: #1e293b;
    --text-muted: #475569;
    --mesh-1: rgba(99, 102, 241, 0.08);
    --mesh-2: rgba(168, 85, 247, 0.06);
    --mesh-3: rgba(14, 165, 233, 0.04);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes mesh {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(10%, -10%) scale(1.1); }
    66% { transform: translate(-10%, 15%) scale(0.9); }
    100% { transform: translate(0, 0) scale(1); }
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
    overflow-x: hidden;
    position: relative;
  }

  /* Animated Mesh Gradient Background */
  body::before {
    content: '';
    position: fixed;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle at 30% 30%, var(--mesh-1) 0%, transparent 40%),
                radial-gradient(circle at 70% 70%, var(--mesh-2) 0%, transparent 40%),
                radial-gradient(circle at 50% 20%, var(--mesh-3) 0%, transparent 30%);
    z-index: -1;
    animation: mesh 20s ease-in-out infinite alternate;
  }

  .wrap { width: 100%; max-width: 1000px; position: relative; z-index: 10; }

  .brand {
    text-align: center;
    margin-bottom: 3rem;
    animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 2 Column Layout */
  .dash-container {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 900px) {
    .dash-container { grid-template-columns: 1fr; }
    .wrap { max-width: 560px; }
  }

  .brand-icon {
    width: 72px; height: 72px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 22px;
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
    box-shadow: 0 12px 40px var(--primary-glow);
    border: 1px solid rgba(255,255,255,0.2);
    transition: transform 0.3s ease;
    position: relative;
  }

  /* Theme Toggle Button */
  .theme-toggle {
    position: absolute;
    top: 1.5rem; right: 1.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--text);
    transition: all 0.3s ease;
    z-index: 100;
  }
  .theme-toggle:hover { background: var(--surface-hover); border-color: var(--primary); transform: rotate(15deg); }
  
  [data-theme="light"] .sun-icon { display: none; }
  [data-theme="dark"] .moon-icon { display: none; }

  .brand-icon:hover { opacity: 0.95; }

  .brand h1 { 
    font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 900; 
    background: linear-gradient(to right, var(--text), var(--text-muted));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -0.02em;
  }
  .brand p { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }

  .card {
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 28px;
    overflow: hidden;
    height: 100%;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-theme="dark"] .card { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
  .card:hover { border-color: var(--border-bright); }

  .card-header {
    padding: 1.25rem 1.75rem;
    background: rgba(var(--primary-rgb, 99, 102, 241), 0.03);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0.875rem;
  }
  .card-header h2 { font-size: 0.95rem; font-weight: 700; color: var(--text); font-family: 'Outfit', sans-serif; letter-spacing: 0.01em; }

  .card-body { padding: 1.75rem; }

  label { 
    display: block; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); 
    text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.65rem; 
    transition: color 0.3s ease;
  }

  .input-wrapper { position: relative; margin-bottom: 1.25rem; }
  
  input[type="password"], input[type="date"], input[type="file"], input[type="text"] {
    width: 100%; background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 14px; padding: 0.875rem 1.125rem; color: var(--text); font-size: 0.95rem;
    outline: none; transition: all 0.3s ease; font-family: 'Poppins', sans-serif;
  }
  input:focus { border-color: var(--primary); background: var(--surface); box-shadow: 0 0 0 4px var(--primary-glow); }

  .password-group { position: relative; }
  .password-toggle {
    position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    padding: 0.5rem; display: flex; align-items: center; justify-content: center;
    transition: color 0.3s ease;
  }
  .password-toggle:hover { color: var(--primary); }

  /* Top Right Actions */
  .top-actions {
    position: absolute; top: 1.5rem; right: 1.5rem;
    display: flex; gap: 0.75rem; z-index: 1000;
  }
  .action-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    width: 46px; height: 46px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--text);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }
  .action-btn::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at center, var(--primary-glow), transparent 70%);
    opacity: 0; transition: opacity 0.3s ease;
  }
  .action-btn:hover { 
    background: var(--surface-hover); 
    border-color: var(--primary); 
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 10px 25px -5px var(--primary-glow);
  }
  .action-btn:hover::after { opacity: 1; }
  
  /* Theme Hover Animation */
  #theme-toggle:hover svg { transform: rotate(45deg); }
  
  /* Logout Hover Animation */
  .logout-btn { color: var(--rose); }
  .logout-btn:hover { 
    border-color: var(--rose); 
    color: #fff;
    background: var(--rose);
    box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.5);
  }
  .logout-btn:hover svg { transform: translateX(3px); }
  .logout-btn svg { transition: transform 0.3s ease; }
  #theme-toggle svg { transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

  .btn {
    width: 100%; padding: 1rem; border: none; border-radius: 14px;
    font-size: 0.95rem; font-weight: 700; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    display: flex; align-items: center; justify-content: center; gap: 0.65rem;
    font-family: 'Outfit', sans-serif;
  }

  .btn-primary { 
    background: linear-gradient(135deg, var(--primary), var(--secondary)); 
    color: #fff; 
    box-shadow: 0 10px 20px -5px var(--primary-glow);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px var(--primary-glow); filter: brightness(1.1); }
  .btn-primary:active { transform: translateY(0); }

  .btn-danger { background: rgba(244, 63, 94, 0.15); color: var(--rose); border: 1.5px solid rgba(244, 63, 94, 0.2); }
  .btn-danger:hover { background: var(--rose); color: #fff; transform: translateY(-1px); }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
  .info-item {
    background: rgba(var(--primary-rgb, 99, 102, 241), 0.03); 
    border: 1px solid var(--border);
    border-radius: 18px; padding: 1.25rem; transition: all 0.3s ease;
  }
  .info-item:hover { border-color: var(--border-bright); }
  .info-item .label { font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-item .value { font-size: 1rem; font-weight: 600; color: var(--text); font-family: 'Outfit', sans-serif; }
  .info-item .value.highlight { color: var(--primary); font-size: 1.5rem; font-weight: 900; }

  .divider { border: none; height: 1px; background: linear-gradient(to right, transparent, var(--border), transparent); margin: 2rem 0; }

  .upload-zone {
    border: 2px dashed var(--border); border-radius: 20px; padding: 2.5rem 2rem;
    text-align: center; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    cursor: pointer; position: relative; overflow: hidden;
  }
  .upload-zone:hover { border-color: var(--primary); border-style: solid; background: rgba(99, 102, 241, 0.06); }
  .upload-zone input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 10; width: 100%; height: 100%;
  }
  .upload-zone .icon { 
    width: 64px; height: 64px; background: rgba(var(--primary-rgb, 99, 102, 241), 0.05); 
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.25rem; color: var(--primary); transition: all 0.3s ease;
  }
  .upload-zone:hover .icon { transform: translateY(-5px); background: var(--primary); color: #fff; }
  .upload-zone p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; }
  .upload-zone strong { color: var(--text); font-weight: 600; }

  .alert-box {
    display: flex; gap: 1rem; padding: 1.25rem; border-radius: 18px; font-size: 0.875rem; line-height: 1.5;
    margin-bottom: 1.5rem; border: 1px solid transparent;
  }
  .alert-box.info { background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
  .alert-box.success { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
  .alert-box.warning { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: #fcd34d; }

  .footer { text-align: center; margin-top: 2rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
  
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--emerald); box-shadow: 0 0 15px var(--emerald); animation: pulse 2s infinite; }

  @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

  ::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
  ::-webkit-calendar-picker-indicator:hover { opacity: 1; }

  .swal2-popup { border-radius: 24px !important; background: var(--surface) !important; backdrop-filter: blur(20px) !important; border: 1px solid var(--border) !important; font-family: 'Outfit', sans-serif !important; color: var(--text) !important; padding-bottom: 2rem !important; }
  .btn-swal-confirm { background: var(--primary) !important; color: white !important; padding: 0.8rem 2rem !important; border-radius: 12px !important; font-weight: 600 !important; font-family: 'Outfit', sans-serif !important; margin: 0.5rem !important; cursor: pointer !important; border: none !important; transition: transform 0.2s !important; }
  .btn-swal-cancel { background: var(--surface-hover) !important; color: var(--text) !important; padding: 0.8rem 2rem !important; border-radius: 12px !important; font-weight: 600 !important; font-family: 'Outfit', sans-serif !important; margin: 0.5rem !important; cursor: pointer !important; border: 1px solid var(--border) !important; transition: transform 0.2s !important; }
  .btn-swal-confirm:hover, .btn-swal-cancel:hover { transform: scale(1.05); }
  .swal2-icon { border-width: 2px !important; }
  .swal2-title { font-weight: 800 !important; color: var(--text) !important; font-size: 1.5rem !important; }
  .swal2-html-container { color: var(--text-muted) !important; font-weight: 500 !important; }

  /* Compact Toast Style */
  .swal2-toast {
    padding: 0.75rem 1rem !important;
    border-radius: 16px !important;
  }
  .swal2-toast .swal2-title {
    font-family: 'Poppins', sans-serif !important;
    font-size: 0.875rem !important;
    font-weight: 600 !important;
    margin: 0 0.5rem !important;
  }
</style>
<script>
  // Pre-apply theme to prevent flash
  (function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<div class="top-actions">
  <button class="action-btn" id="theme-toggle" title="Ganti Tema">
    <svg class="sun-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
    <svg class="moon-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
  </button>
  
  <?php if ($isAuth): ?>
  <form method="POST" id="form-logout" style="margin:0;">
    <input type="hidden" name="action" value="logout">
    <button type="button" class="action-btn logout-btn" onclick="confirmLogout()" title="Keluar Panel">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
    </button>
  </form>
  <?php endif; ?>
</div>
<div class="wrap">
  <div class="brand">
    <div class="brand-icon">
      <!-- Premium Graduation Cloud Logo -->
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 10L12 5L2 10L12 15L22 10Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 12V17C6 17 9 19 12 19C15 19 18 17 18 17V12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 13V21M12 13L9 16M12 13L15 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
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
  <div style="max-width: 420px; margin: 0 auto; width: 100%;">
    <div class="card">
      <div class="card-header" style="flex-direction: column; text-align: center; padding: 2.5rem 2rem 1.5rem;">
        <div class="brand-icon" style="margin: 0 auto 1.5rem; width: 64px; height: 64px;">
          <!-- Premium Graduation Cloud Logo -->
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 10L12 5L2 10L12 15L22 10Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 12V17C6 17 9 19 12 19C15 19 18 17 18 17V12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 13V21M12 13L9 16M12 13L15 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Selamat Datang</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Silakan masukkan password akses untuk mengelola portal kelulusan.</p>
      </div>
      <div class="card-body" style="padding: 0 2rem 2.5rem;">
        <form method="POST" class="space-y">
          <input type="hidden" name="action" value="login">
          <div class="input-wrapper">
            <label>Password Akses</label>
            <div class="password-group">
              <input type="password" name="password" id="login-pass" placeholder="••••••••" required autofocus>
              <button type="button" class="password-toggle" onclick="togglePass('login-pass', this)">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
            Masuk ke Panel
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center;">
          <a href="/" style="
            display: inline-flex; align-items: center; gap: 0.5rem;
            font-size: 0.85rem; font-weight: 600; color: var(--text-muted);
            text-decoration: none; padding: 0.6rem 1.25rem;
            border: 1px solid var(--border); border-radius: 12px;
            background: transparent;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          "
          onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)'; this.style.background='var(--primary-glow)'; this.style.transform='translateY(-2px)';"
          onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)'; this.style.background='transparent'; this.style.transform='translateY(0)';">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Kembali ke Beranda
          </a>
        </div>

      </div>
    </div>
  </div>

  <?php else: ?>
  <!-- UPLOAD DASHBOARD -->
  <div class="dash-container">
    
    <!-- KOLOM KIRI: STATUS & PENGATURAN -->
    <div class="space-y" style="display:flex; flex-direction:column; gap:1.5rem;">
      <div class="card">
        <div class="card-header">
          <span class="dot"></span>
          <h2>Informasi Data & Jadwal</h2>
        </div>
        <div class="card-body">
          <!-- Info JSON aktif -->
          <?php if ($jsonInfo): ?>
          <p style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Status Data Aktif
          </p>
          <div class="info-grid">
            <div class="info-item" style="grid-column:span 2;">
              <div class="label">Nama Lembaga / Sekolah</div>
              <div class="value" style="color:var(--primary); font-size:1.1rem;"><?= htmlspecialchars($jsonInfo['sekolah']) ?></div>
            </div>
            <div class="info-item">
              <div class="label">Tahun Pelajaran</div>
              <div class="value"><?= htmlspecialchars($jsonInfo['tapel']) ?></div>
            </div>
            <div class="info-item">
              <div class="label">Total Database Siswa</div>
              <div class="value highlight"><?= $jsonInfo['total'] ?></div>
            </div>
            <div class="info-item" style="grid-column:span 2; display:flex; align-items:center; justify-content:space-between; border-color:<?= $effectiveSkl === 'skl2' ? 'var(--emerald)' : 'var(--amber)' ?>; background:<?= $effectiveSkl === 'skl2' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)' ?>;">
              <div>
                <div class="label">Status Output SKL Saat Ini</div>
                <div class="value" style="color:<?= $effectiveSkl === 'skl2' ? 'var(--emerald)' : 'var(--amber)' ?>; font-weight: 800;">
                  <?= $effectiveSkl === 'skl2' ? 'SKL 2 — Transkrip Nilai Lengkap' : 'SKL 1 — Pengumuman Kelulusan' ?>
                </div>
              </div>
              <div style="text-align:right;">
                 <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 2px;">LIVE STATUS</span>
                 <svg width="24" height="24" fill="none" stroke="<?= $effectiveSkl === 'skl2' ? 'var(--emerald)' : 'var(--amber)' ?>" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>
          </div>
          
          <div class="divider"></div>

          <p style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
            Konfigurasi Jadwal
          </p>
          <form method="POST" class="space-y" id="form-pengaturan">
            <input type="hidden" name="action" value="update_tgl">
            <div class="info-grid">
              <div class="input-wrapper" style="margin-bottom: 0;">
                <label>Tanggal SKL 1</label>
                <input type="date" name="tanggal_pengumuman" value="<?= htmlspecialchars($currentTgl) ?>" required>
              </div>
              <div class="input-wrapper" style="margin-bottom: 0;">
                <label>Tanggal SKL 2</label>
                <input type="date" name="tanggal_skl2" value="<?= htmlspecialchars($currentTgl2) ?>">
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:1rem; background:linear-gradient(135deg, var(--secondary), var(--accent));">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Simpan Jadwal
            </button>
          </form>
          <?php else: ?>
          <div class="alert-box warning">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div>
              <strong>Data Belum Tersedia</strong><br>
              Portal belum aktif. Silakan upload file <code>data.json</code> di kolom sebelah kanan.
            </div>
          </div>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- KOLOM KANAN: SINKRONISASI / UPLOAD -->
    <div class="card">
      <div class="card-header">
        <div class="brand-icon" style="width:34px; height:34px; margin-right: 10px;">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 10L12 5L2 10L12 15L22 10Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 12V17C6 17 9 19 12 19C15 19 18 17 18 17V12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 13V21M12 13L9 16M12 13L15 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2>Sinkronisasi Data Hosting</h2>
      </div>
      <div class="card-body">
        <p style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:1.25rem;">
          Pembaruan data.json
        </p>
        <form method="POST" enctype="multipart/form-data" class="space-y" id="form-upload">
          <input type="hidden" name="action" value="upload">
          <div class="upload-zone" id="dropzone">
            <input type="file" name="json_file" accept=".json,application/json" id="fileInput">
            <div class="icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            </div>
            <p><strong>Klik atau Seret File</strong></p>
            <p style="margin-top:.5rem; font-size: 0.75rem; color:var(--text-muted);">Pilih file <code>data.json</code> hasil generate dari dashboard lokal.</p>
            <p id="file-name" style="margin-top:.75rem;color:var(--primary);font-weight:700;font-size:.85rem;"></p>
          </div>
          
          <div class="alert-box info" style="margin: 1.5rem 0;">
            <svg style="flex-shrink:0;" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span style="font-size:0.8rem;">File <code>data.json.bak</code> akan dibuat otomatis untuk keamanan data sebelum proses update.</span>
          </div>

          <button type="submit" class="btn btn-primary">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Upload & Sinkronisasi
          </button>
        </form>

        <?php if ($jsonInfo): ?>
        <div style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid var(--border);">
          <div class="info-item">
            <div class="label">Sinkronisasi Terakhir</div>
            <div class="value" style="font-size:.85rem; color:var(--text-muted);"><?= $jsonInfo['modified'] ?></div>
          </div>
        </div>
        <?php endif; ?>
      </div>
    </div>

  </div>

  <?php endif; ?>

  <p class="footer">Portal Kelulusan &bull; Admin Upload Panel &bull; Akses terbatas</p>
</div>

<script>
(function() {
  // Theme Toggle Logic
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  // Password Toggle Logic
  window.togglePass = function(id, btn) {
    const input = document.getElementById(id);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.style.color = isPass ? 'var(--primary)' : 'var(--text-muted)';
  };

  // Konfigurasi SweetAlert Modern
  const ModernSwal = Swal.mixin({
    customClass: {
      confirmButton: 'btn-swal-confirm',
      cancelButton: 'btn-swal-cancel',
      popup: 'swal-modern-popup'
    },
    buttonsStyling: false,
    showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
    hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
  });

  const AppToast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  // DOM Elements for Upload
  const fi = document.getElementById('fileInput');
  const fn = document.getElementById('file-name');
  const zone = document.getElementById('dropzone');

  window.confirmLogout = function() {
    ModernSwal.fire({
      title: 'Keluar Panel?',
      text: "Sesi admin Anda akan berakhir.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      confirmButtonColor: 'var(--rose)'
    }).then((result) => {
      if (result.isConfirmed) document.getElementById('form-logout').submit();
    });
  };

  const formPengaturan = document.getElementById('form-pengaturan');
  if (formPengaturan) {
    formPengaturan.addEventListener('submit', function(e) {
      e.preventDefault();
      ModernSwal.fire({
        title: 'Simpan Jadwal?',
        text: "Perubahan tanggal akan langsung aktif di portal siswa.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) formPengaturan.submit();
      });
    });
  }

  const formUpload = document.getElementById('form-upload');
  if (formUpload) {
    formUpload.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!fi.files.length) {
        AppToast.fire({ icon: 'error', title: 'Pilih file JSON terlebih dahulu!' });
        return;
      }
      ModernSwal.fire({
        title: 'Sinkronkan Data?',
        text: "File data.json lama akan diganti dengan yang baru.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Sinkronkan',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          ModernSwal.fire({
            title: 'Memproses Data...',
            html: 'Mohon tunggu sejenak.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });
          formUpload.submit();
        }
      });
    });
  }

  // File Input & Drag/Drop
  if (fi && zone) {
    fi.addEventListener('change', () => setFile(fi.files[0]));

    function setFile(file) {
      if (!file) { fn.textContent = ''; return; }
      if (!file.name.toLowerCase().endsWith('.json')) {
        AppToast.fire({ icon: 'error', title: 'Hanya file .json yang diterima!' });
        fn.textContent = '';
        fi.value = '';
        return;
      }
      fn.style.color = 'var(--primary)';
      fn.textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      zone.style.borderColor = 'var(--primary)';
      zone.style.background  = 'rgba(var(--primary-rgb), 0.06)';
    }

    ['dragenter','dragover'].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        zone.style.borderColor = 'var(--primary)';
        zone.style.background  = 'rgba(var(--primary-rgb), 0.10)';
        zone.style.transform   = 'scale(1.02)';
      });
    });

    ['dragleave','dragend'].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        zone.style.borderColor = ''; zone.style.background = ''; zone.style.transform = '';
      });
    });

    zone.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      zone.style.transform = '';
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fi.files = dt.files;
      setFile(files[0]);
    });
  }
})();
</script>
</body>
</html>

/**
 * build-split.mjs
 * ----------------
 * Script untuk membangun Frontend dan Dashboard Admin secara terpisah.
 *
 * Output:
 *   dist/frontend/   → Hanya halaman publik (index, 404) — login TIDAK disertakan
 *   dist/dashboard/  → Hanya halaman admin dashboard (termasuk login)
 *
 * Cara pakai:
 *   node scripts/build-split.mjs --target=frontend
 *   node scripts/build-split.mjs --target=dashboard
 *   node scripts/build-split.mjs --target=all
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_PAGES = path.join(ROOT, 'src', 'pages');

// Baca argumen CLI
const args = process.argv.slice(2);
const targetArg = args.find(a => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'all';

// ─── Warna terminal ───────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(color, msg) {
  console.log(`${color}${msg}${c.reset}`);
}

function banner(title, color = c.cyan) {
  const line = '─'.repeat(50);
  console.log(`\n${color}${c.bold}${line}`);
  console.log(`  ${title}`);
  console.log(`${line}${c.reset}\n`);
}

// ─── Helper: jalankan command dengan env khusus ──────────────────────────────
function run(cmd, label = '', env = {}) {
  if (label) log(c.dim, `  ▸ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
}

// ─── Helper: Buat folder public sementara tanpa bundles/ ─────────────────────
/**
 * Membuat folder .tmp-public-build/ yang berisi hard links ke semua file
 * di public/, dengan filter berbeda per target build:
 *
 *  - FRONTEND : hanya salin file statis publik (favicon, data.json, admin-upload.php).
 *               Exclude: bundles/, js/ (dashboard scripts), api/, exports/, pdf/, previews/,
 *                        users.json, sync-data.php, bundle-config.js.
 *  - DASHBOARD: salin semua KECUALI bundles/ (file ZIP besar yang bisa terkunci).
 *
 * Hard links tidak menyalin data — hanya referensi ke inode yang sama.
 */
const TMP_PUBLIC = path.join(ROOT, '.tmp-public-build');
const REAL_PUBLIC = path.join(ROOT, 'public');

// File/folder yang selalu di-skip untuk SEMUA target
const SKIP_ALWAYS = new Set(['bundles']);

// File/folder yang di-skip khusus saat build FRONTEND publik
// (berisi file sensitif atau besar yang tidak dibutuhkan halaman portal siswa)
const SKIP_FRONTEND = new Set([
  'bundles',      // ZIP bundle besar
  'api',          // Endpoint PHP backend admin
  'exports',      // File JSON/Excel export history
  'pdf',          // File PDF SKL yang sudah digenerate
  'previews',     // Gambar preview
  'users.json',   // Data pengguna/password — SENSITIF
  'sync-data.php',     // PHP sync admin
  'bundle-config.js',  // Konfigurasi bundle admin
]);

function createFilteredPublicDir(src, dest, skipSet = SKIP_ALWAYS) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (skipSet.has(entry)) continue;
    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      // Subdirektori mewarisi skipSet yang sama
      createFilteredPublicDir(srcPath, destPath, skipSet);
    } else {
      try {
        fs.linkSync(srcPath, destPath); // Hard link — instan, tanpa copy data
      } catch {
        fs.copyFileSync(srcPath, destPath); // Fallback ke copy jika hard link gagal
      }
    }
  }
}

function cleanFilteredPublicDir() {
  if (fs.existsSync(TMP_PUBLIC)) {
    fs.rmSync(TMP_PUBLIC, { recursive: true, force: true });
  }
}

// ─── Helper: rename sementara file/folder pages ──────────────────────────────
/**
 * Menyembunyikan file/folder dengan prefix _ sehingga Astro tidak meng-crawl-nya.
 * Astro secara konvensi mengabaikan file yang diawali dengan _ (underscore).
 */
const globalHiddenRegistry = new Set();

function hidePages(targets) {
  const hidden = [];
  for (const rel of targets) {
    const original = path.join(SRC_PAGES, rel);
    const hidden_path = path.join(SRC_PAGES, '_' + rel.replace(/\//g, '_hidden_'));
    if (fs.existsSync(original)) {
      fs.renameSync(original, hidden_path);
      const entry = { original, hidden: hidden_path };
      hidden.push(entry);
      globalHiddenRegistry.add(entry);
      log(c.dim, `  → Hidden: ${rel}`);
    }
  }
  return hidden;
}

function restorePages(hiddenList) {
  for (const entry of hiddenList) {
    if (fs.existsSync(entry.hidden)) {
      try {
        fs.renameSync(entry.hidden, entry.original);
        globalHiddenRegistry.delete(entry);
      } catch (e) {
        // Abaikan error jika file tidak bisa di-rename
      }
    }
  }
}

// ─── Safety Net: Pastikan restore saat process exit paksa (Ctrl+C) ────────────
function emergencyRestore() {
  if (globalHiddenRegistry.size > 0) {
    console.log(`\n${c.yellow}Memulihkan file yang disembunyikan sebelum keluar...${c.reset}`);
    restorePages(Array.from(globalHiddenRegistry));
  }
}

process.on('SIGINT', () => {
  emergencyRestore();
  process.exit(1);
});
process.on('SIGTERM', () => {
  emergencyRestore();
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error(`\n${c.red}Error tidak terduga: ${err.message}${c.reset}`);
  emergencyRestore();
  process.exit(1);
});
process.on('exit', emergencyRestore);

// ─── Definisi halaman per target ─────────────────────────────────────────────
const PAGE_GROUPS = {
  // Halaman yang DISEMBUNYIKAN saat build frontend (hanya tampilkan publik)
  frontend: {
    label: 'Frontend Publik',
    outDir: 'dist/frontend',
    hideOnBuild: ['dashboard', 'login.astro'],   // sembunyikan folder dashboard & halaman login admin
    config: 'astro.config.frontend.mjs',
    // Folder yang dihapus paksa dari output setelah build (safety net)
    cleanAfterBuild: ['login', 'dashboard'],
  },
  // Halaman yang DISEMBUNYIKAN saat build dashboard
  dashboard: {
    label: 'Admin Dashboard',
    outDir: 'dist/dashboard',
    hideOnBuild: ['index.astro', '404.astro'],  // sembunyikan halaman publik
    config: 'astro.config.dashboard.mjs',
    cleanAfterBuild: [],
  },
};

// ─── Build function ───────────────────────────────────────────────────────────
async function buildTarget(name) {
  const group = PAGE_GROUPS[name];
  banner(`Building: ${group.label}  →  ${group.outDir}`, c.blue);

  // Bersihkan tmp dari run sebelumnya jika ada
  cleanFilteredPublicDir();

  // Buat folder public sementara dengan filter sesuai target build
  const skipSet = (name === 'frontend') ? SKIP_FRONTEND : SKIP_ALWAYS;
  const skipList = [...skipSet].join(', ');
  log(c.dim, `  → Mempersiapkan public/ sementara (melewati: ${skipList})...`);
  createFilteredPublicDir(REAL_PUBLIC, TMP_PUBLIC, skipSet);

  let hiddenList = [];
  try {
    // 1. Sembunyikan halaman yang tidak relevan
    log(c.yellow, `Menyembunyikan halaman yang tidak termasuk...`);
    hiddenList = hidePages(group.hideOnBuild);

    // 2. Jalankan astro build — BUILD_PUBLIC_DIR mengarahkan ke folder sementara
    log(c.green, `\nMemulai Astro build...`);
    run(
      `npx astro build --config ${group.config}`,
      `astro build --config ${group.config}`,
      { BUILD_PUBLIC_DIR: TMP_PUBLIC }
    );

    log(c.green, `\n✓ Build ${group.label} selesai → ${group.outDir}`);
  } catch (err) {
    log(c.red, `\n✗ Build gagal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // 3. Hapus folder public sementara (selalu, bahkan jika build gagal)
    cleanFilteredPublicDir();
    log(c.dim, `  ✓ Folder public sementara dihapus.`);

    // 4. Hapus folder yang tidak boleh ada di output (safety net)
    const outPath = path.join(ROOT, group.outDir);
    if (group.cleanAfterBuild?.length) {
      for (const dir of group.cleanAfterBuild) {
        const target = path.join(outPath, dir);
        if (fs.existsSync(target)) {
          fs.rmSync(target, { recursive: true, force: true });
          log(c.dim, `  🧹 Cleaned: ${group.outDir}/${dir}`);
        }
      }
    }

    // 5. Kembalikan file halaman yang disembunyikan
    if (hiddenList.length) {
      log(c.yellow, `\nMengembalikan file halaman...`);
      restorePages(hiddenList);
      log(c.dim, `  ✓ File dikembalikan.`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  banner(`Kelulusan Build System — target: ${target}`, c.cyan);

  if (target === 'all') {
    await buildTarget('frontend');
    await buildTarget('dashboard');
    banner('Semua build selesai!', c.green);
    log(c.green, `  📁 dist/frontend/  → Deploy ke shared hosting (frontend)\n  📁 dist/dashboard/ → Deploy ke VPS/subdomain admin\n`);
  } else if (PAGE_GROUPS[target]) {
    await buildTarget(target);
  } else {
    log(c.red, `Target tidak dikenal: "${target}". Gunakan: --target=frontend | --target=dashboard | --target=all`);
    process.exit(1);
  }
}

main();

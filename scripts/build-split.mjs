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

// ─── Helper: jalankan command dengan output live ──────────────────────────────
function run(cmd, label = '') {
  if (label) log(c.dim, `  ▸ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

// ─── Helper: rename sementara file/folder pages ──────────────────────────────
/**
 * Menyembunyikan file/folder dengan prefix _ sehingga Astro tidak meng-crawl-nya.
 * Astro secara konvensi mengabaikan file yang diawali dengan _ (underscore).
 */
function hidePages(targets) {
  const hidden = [];
  for (const rel of targets) {
    const original = path.join(SRC_PAGES, rel);
    const hidden_path = path.join(SRC_PAGES, '_' + rel.replace(/\//g, '_hidden_'));
    if (fs.existsSync(original)) {
      fs.renameSync(original, hidden_path);
      hidden.push({ original, hidden: hidden_path });
      log(c.dim, `  → Hidden: ${rel}`);
    }
  }
  return hidden;
}

function restorePages(hiddenList) {
  for (const { original, hidden } of hiddenList) {
    if (fs.existsSync(hidden)) {
      fs.renameSync(hidden, original);
    }
  }
}

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
    hideOnBuild: ['index.astro', 'login.astro', '404.astro'],  // sembunyikan halaman publik
    config: 'astro.config.dashboard.mjs',
    cleanAfterBuild: [],
  },
};

// ─── Build function ───────────────────────────────────────────────────────────
async function buildTarget(name) {
  const group = PAGE_GROUPS[name];
  banner(`Building: ${group.label}  →  ${group.outDir}`, c.blue);

  let hiddenList = [];
  try {
    // 1. Sembunyikan halaman yang tidak relevan
    log(c.yellow, `Menyembunyikan halaman yang tidak termasuk...`);
    hiddenList = hidePages(group.hideOnBuild);

    // 2. Jalankan astro build dengan config khusus
    // Gunakan npx untuk kompatibilitas Windows/Linux
    log(c.green, `\nMemulai Astro build...`);
    run(`npx astro build --config ${group.config}`, `astro build --config ${group.config}`);

    log(c.green, `\n✓ Build ${group.label} selesai → ${group.outDir}`);
  } catch (err) {
    log(c.red, `\n✗ Build gagal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // 3. Hapus folder yang tidak boleh ada di output (safety net)
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

    // 4. Kembalikan file yang disembunyikan
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

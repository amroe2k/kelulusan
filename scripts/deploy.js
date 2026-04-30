import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 MEMULAI PROSES DEPLOYMENT...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  // 1. Export Data ke JSON
  console.log('⏳ [1/3] Mengenerate Data Database ke JSON...');
  execSync('node scripts/export-data.js', { stdio: 'inherit' });
  execSync('node scripts/export-users.js', { stdio: 'inherit' });
  console.log('✓ Data berhasil digenerate ke public/data.json & public/users.json\n');

  // 2. Build Astro
  console.log('⏳ [2/3] Build Production (Astro SSG)...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✓ Build selesai di folder /dist\n');

  // 3. Membuat file ZIP
  console.log('⏳ [3/3] Membuat file ZIP untuk upload ke hosting...');
  const distPath = path.resolve('dist');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('Folder dist/ tidak ditemukan. Build gagal?');
  }

  const zip = new AdmZip();
  zip.addLocalFolder(distPath);
  
  const zipFileName = 'deploy-hosting.zip';
  zip.writeZip(zipFileName);

  console.log(`✓ Berhasil membuat file ${zipFileName}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 DEPLOYMENT SELESAI!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Silahkan upload file ${zipFileName} ke cPanel / Hosting Anda.`);
  console.log('Ekstrak file tersebut di dalam folder public_html.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
  console.error('\n❌ ERROR SAAT DEPLOY:', error.message);
  process.exit(1);
}

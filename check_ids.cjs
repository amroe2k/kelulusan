const fs = require('fs');
const content = fs.readFileSync('src/pages/form-lembaga.astro', 'utf8');
const ids = [
    'input-sekolah', 'input-npsn', 'input-nss', 'input-jenjang', 'input-kurikulum',
    'input-konsentrasi', 'input-tapel', 'input-alamat', 'input-provinsi', 'input-kota',
    'input-kepsek', 'input-jabatan', 'input-nip', 'input-nuptk', 'input-tgl',
    'input-tgl-skl2', 'input-nomor-surat', 'input-nomor-surat-statis', 'input-telepon',
    'input-email', 'input-domain', 'input-pengumuman'
];

const missing = ids.filter(id => !content.includes('id="' + id + '"'));
console.log('MISSING:', missing);

const fetch = require('node-fetch');

const payload = {
    sekolah: "SMA Negeri 1",
    npsn: "12345678",
    nss: "123",
    jenjang: "SMA",
    kurikulum: "Kurikulum Merdeka",
    kompetensi_keahlian: "",
    tahun_ajaran: "2023/2024",
    alamat: "Jl. Pendidikan",
    provinsi: "SUMATERA UTARA",
    kota: "TANJUNGBALAI",
    kepala_sekolah: "Budi",
    jabatan_kepsek: "Kepala Sekolah",
    nip_kepsek: "19800101",
    nuptk_kepsek: "",
    id_kepsek_mode: "nip",
    tanggal_pengumuman: "2024-05-06",
    tanggal_skl2: null,
    nomor_surat_mode: "auto",
    nomor_surat_suffix: "001",
    nomor_surat_statis: "001/SMA/2024",
    telepon: "08123456789",
    email: "sma@example.com",
    domain: "kelulusan.disdiktanjungbalai.id",
    pengumuman: ""
};

async function test() {
    try {
        const res = await fetch('https://kelulusan.disdiktanjungbalai.id/api/form-lembaga.php?token=b8086f3d00c2138b257d527afbe344ac3fa5559cf8547e1fbfc6ab793c054e73', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch(e) {
        console.error(e);
    }
}
test();

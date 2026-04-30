$file = 'd:\Local-Server\www\kelulusan\src\pages\dashboard\[view].astro'
$content = [System.IO.File]::ReadAllText($file)

$newSection = @"
        <!-- ── VIEW: IDENTITAS ── -->
        <section id="view-identitas" class="hidden space-y-8 max-w-5xl animate-fade-in mx-auto">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-3xl font-black font-outfit text-slate-800 dark:text-white tracking-tight">Profil Institusi</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola data resmi sekolah untuk kop surat dan pengumuman kelulusan.</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="btn-preview-skl" class="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#111827] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Preview SKL
                    </button>
                    <button id="btn-edit-identitas" class="hidden admin-only group relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/25">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Edit Data
                    </button>
                </div>
            </div>

            <!-- View Mode -->
            <div id="identitas-view" class="space-y-6">
                <!-- Data Utama -->
                <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                    <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        Informasi Utama
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
                        <div class="lg:col-span-2">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Nama Lembaga</p>
                            <p id="id-sekolah" class="font-black text-2xl text-slate-800 dark:text-white font-outfit">-</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Jenjang Sekolah</p>
                            <span id="id-jenjang" class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">-</span>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Tahun Pelajaran</p>
                            <p id="id-tapel" class="font-bold text-lg text-slate-700 dark:text-slate-200 font-outfit">-</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">NPSN / NSS</p>
                            <p class="text-slate-600 dark:text-slate-300 font-medium"><span id="id-npsn" class="text-indigo-600 dark:text-indigo-400">-</span> / <span id="id-nss">-</span></p>
                        </div>
                        <div class="lg:col-span-3">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Alamat Lengkap</p>
                            <p id="id-alamat" class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-3xl">-</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Pengaturan Surat -->
                    <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                        <h4 class="text-xs font-bold text-violet-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Pengaturan Dokumen
                        </h4>
                        <div class="space-y-6">
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1"><span class="text-emerald-500">●</span> Tanggal SKL 1 (Tanpa Nilai)</p>
                                <p id="id-tgl" class="font-bold text-slate-800 dark:text-white">-</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1"><span class="text-indigo-500">●</span> Tanggal SKL 2 (Dengan Nilai)</p>
                                <p id="id-tgl-skl2" class="font-bold text-slate-800 dark:text-white">-</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Format Nomor Surat</p>
                                <p id="id-nomor-surat" class="text-violet-600 dark:text-violet-400 font-mono text-sm font-medium bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 rounded-lg inline-block">-</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Domain Hosting</p>
                                <p id="id-domain" class="text-slate-600 dark:text-slate-400 font-mono text-xs font-medium">-</p>
                            </div>
                        </div>
                    </div>

                    <!-- Kontak & Kepsek -->
                    <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                Kontak & Penandatangan
                            </h4>
                            <div class="space-y-6">
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Kepala Sekolah</p>
                                    <p id="id-kepsek" class="text-lg font-bold text-slate-800 dark:text-white">-</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5" id="id-nip">NIP. -</p>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Telepon</p>
                                        <p id="id-telepon" class="text-sm font-medium text-slate-700 dark:text-slate-300">-</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Email</p>
                                        <p id="id-email" class="text-sm font-medium text-slate-700 dark:text-slate-300">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aset Visual (view mode preview) -->
                <div id="view-assets" class="hidden bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                    <h4 class="text-xs font-bold text-pink-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Aset Visual Cetak
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <!-- Logo -->
                        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1523] border border-slate-100 dark:border-slate-800 relative group" id="card-asset-logo">
                            <div class="w-full flex justify-between items-center">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Logo</span>
                                <label class="relative inline-flex items-center cursor-pointer" title="Tampilkan/Sembunyikan Logo">
                                    <input type="checkbox" id="toggle-logo" class="sr-only peer" checked>
                                    <div class="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-checked:bg-emerald-500 rounded-full transition-colors relative after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"></div>
                                </label>
                            </div>
                            <img id="view-logo" class="h-20 w-auto object-contain hidden" />
                            <p id="no-logo" class="text-[10px] text-slate-400 italic">Belum diupload</p>
                            <button id="btn-del-logo" data-field="logo" class="asset-del-btn hidden opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 p-1.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/40 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                        <!-- Stempel -->
                        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1523] border border-slate-100 dark:border-slate-800 relative group" id="card-asset-stempel">
                            <div class="w-full flex justify-between items-center">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Stempel</span>
                                <label class="relative inline-flex items-center cursor-pointer" title="Tampilkan/Sembunyikan Stempel">
                                    <input type="checkbox" id="toggle-stempel" class="sr-only peer" checked>
                                    <div class="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-checked:bg-emerald-500 rounded-full transition-colors relative after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"></div>
                                </label>
                            </div>
                            <img id="view-stempel" class="h-20 w-auto object-contain hidden" />
                            <p id="no-stempel" class="text-[10px] text-slate-400 italic">Belum diupload</p>
                            <button id="btn-del-stempel" data-field="stempel" class="asset-del-btn hidden opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 p-1.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/40 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                        <!-- TTD -->
                        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1523] border border-slate-100 dark:border-slate-800 relative group" id="card-asset-ttd">
                            <div class="w-full flex justify-between items-center">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tanda Tangan</span>
                                <label class="relative inline-flex items-center cursor-pointer" title="Tampilkan/Sembunyikan TTD">
                                    <input type="checkbox" id="toggle-ttd" class="sr-only peer" checked>
                                    <div class="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-checked:bg-emerald-500 rounded-full transition-colors relative after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"></div>
                                </label>
                            </div>
                            <img id="view-ttd" class="h-20 w-auto object-contain hidden" />
                            <p id="no-ttd" class="text-[10px] text-slate-400 italic">Belum diupload</p>
                            <button id="btn-del-ttd" data-field="ttd" class="asset-del-btn hidden opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 p-1.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/40 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Edit Mode -->
            <div id="identitas-edit" class="hidden">
                <form id="form-identitas" class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-indigo-500/5">
                    <div class="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-5">
                        <h4 class="text-xl font-bold font-outfit text-slate-800 dark:text-white flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </div>
                            Edit Profil Institusi
                        </h4>
                    </div>
                    
                    <div class="space-y-8">
                        <!-- Group 1 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nama Lembaga <span class="text-rose-500">*</span></label>
                                <input type="text" id="input-sekolah" required class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Tahun Pelajaran <span class="text-rose-500">*</span></label>
                                <input type="text" id="input-tapel" required placeholder="2025/2026" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Jenjang Sekolah <span class="text-rose-500">*</span></label>
                                <select id="input-jenjang" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer">
                                    <option value="SMP">SMP</option><option value="SMA">SMA</option><option value="SMK">SMK</option><option value="MA">MA</option><option value="MTs">MTs</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">NPSN <span class="text-rose-500">*</span></label>
                                <input type="text" id="input-npsn" required class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">NSS <span class="text-rose-500">*</span></label>
                                <input type="text" id="input-nss" required class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-800">

                        <!-- Group 2 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><span class="text-emerald-500">●</span> Tanggal Pengumuman SKL 1 <span class="text-rose-500">*</span></label>
                                <input type="date" id="input-tgl" required class="date-input w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                                <p class="text-[10px] text-slate-500 mt-1.5">Portal publik aktif & SKL (tanpa nilai) dirilis setelah tanggal ini.</p>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><span class="text-indigo-500">●</span> Tanggal SKL 2 (Dengan Nilai)</label>
                                <input type="date" id="input-tgl-skl2" class="date-input w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                                <p class="text-[10px] text-slate-500 mt-1.5">SKL lengkap dengan rincian nilai tersedia.</p>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Sufiks Nomor Surat</label>
                                <div class="flex items-center bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-[#0B0F19] focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                    <span class="px-4 text-slate-400 text-xs font-mono border-r border-slate-200 dark:border-slate-700 py-3 bg-slate-100 dark:bg-slate-800/50">XXX</span>
                                    <input type="text" id="input-nomor-surat" placeholder="/SMKBU/OU/IV/2026" class="flex-1 bg-transparent py-3 px-3 text-sm text-slate-800 dark:text-white outline-none font-mono">
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1.5">Nomor urut (XXX) dibuat otomatis per siswa.</p>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Domain Hosting Portal</label>
                                <div class="flex items-center bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-[#0B0F19] focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                    <span class="px-3 text-slate-400 text-sm font-mono border-r border-slate-200 dark:border-slate-700 py-3 bg-slate-100 dark:bg-slate-800/50">https://</span>
                                    <input type="text" id="input-domain" placeholder="namadomain.com" class="flex-1 bg-transparent py-3 px-3 text-sm text-slate-800 dark:text-white outline-none font-mono">
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1.5">Untuk URL halaman upload data siswa (tanpa <code class="text-indigo-400">https://</code>).</p>
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-800">

                        <!-- Group 3 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Telepon</label>
                                <input type="text" id="input-telepon" placeholder="(021) 123456" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Email</label>
                                <input type="email" id="input-email" placeholder="contoh@sekolah.sch.id" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Kepala Sekolah <span class="text-rose-500">*</span></label>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input type="text" id="input-kepsek" required placeholder="Nama Lengkap & Gelar" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                                    <input type="text" id="input-nip" placeholder="NIP (Opsional)" class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Alamat Lengkap <span class="text-rose-500">*</span></label>
                                <textarea id="input-alamat" rows="2" required class="w-full bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>

                        <!-- Image Uploads -->
                        <div class="pt-4">
                            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Aset Visual SKL (Opsional)</label>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <!-- Logo -->
                                <div class="img-zone relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1523] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer group min-h-[140px]" data-input="input-logo" data-preview="preview-logo" data-hint="hint-logo" data-clear="clear-logo" data-changed="false">
                                    <img id="preview-logo" class="h-20 w-auto object-contain hidden rounded shadow-sm" />
                                    <div id="hint-logo" class="flex flex-col items-center gap-1.5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                                        <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                        <p class="text-[10px] text-slate-600 dark:text-slate-400 text-center font-medium">Logo Sekolah<br>JPG/PNG</p>
                                    </div>
                                    <button id="clear-logo" type="button" class="hidden absolute top-2 right-2 p-1.5 bg-white dark:bg-[#111827] text-rose-500 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all z-10" data-clear-btn><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                    <input type="file" id="input-logo" accept="image/*" class="hidden" />
                                </div>
                                <!-- Stempel -->
                                <div class="img-zone relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1523] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer group min-h-[140px]" data-input="input-stempel" data-preview="preview-stempel" data-hint="hint-stempel" data-clear="clear-stempel" data-changed="false">
                                    <img id="preview-stempel" class="h-20 w-auto object-contain hidden rounded shadow-sm" />
                                    <div id="hint-stempel" class="flex flex-col items-center gap-1.5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                                        <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                                        <p class="text-[10px] text-slate-600 dark:text-slate-400 text-center font-medium">Stempel<br>PNG Transparan</p>
                                    </div>
                                    <button id="clear-stempel" type="button" class="hidden absolute top-2 right-2 p-1.5 bg-white dark:bg-[#111827] text-rose-500 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all z-10" data-clear-btn><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                    <input type="file" id="input-stempel" accept="image/png" class="hidden" />
                                </div>
                                <!-- TTD -->
                                <div class="img-zone relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1523] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer group min-h-[140px]" data-input="input-ttd" data-preview="preview-ttd" data-hint="hint-ttd" data-clear="clear-ttd" data-changed="false">
                                    <img id="preview-ttd" class="h-20 w-auto object-contain hidden rounded shadow-sm" />
                                    <div id="hint-ttd" class="flex flex-col items-center gap-1.5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                                        <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                        <p class="text-[10px] text-slate-600 dark:text-slate-400 text-center font-medium">Tanda Tangan<br>PNG Transparan</p>
                                    </div>
                                    <button id="clear-ttd" type="button" class="hidden absolute top-2 right-2 p-1.5 bg-white dark:bg-[#111827] text-rose-500 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all z-10" data-clear-btn><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                    <input type="file" id="input-ttd" accept="image/png" class="hidden" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button type="button" id="btn-cancel-identitas" class="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Batal</button>
                        <button type="submit" class="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all">Simpan Profil</button>
                    </div>
                </form>
            </div>
        </section>
"@

# Regex matching between <!-- ── VIEW: IDENTITAS ── --> and </section> right before <!-- ── VIEW: SISWA-DATA ── -->
$startMarker = "<!-- ── VIEW: IDENTITAS ── -->"
$endMarker = "<!-- ── VIEW: SISWA-DATA ── -->"

$startIdx = -1
$endIdx = -1

$lines = $content -split "`r`n"
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match $startMarker) {
        $startIdx = $i
    }
    if ($lines[$i] -match $endMarker -and $startIdx -ne -1) {
        $endIdx = $i
        break
    }
}

if ($startIdx -ne -1 -and $endIdx -ne -1) {
    # Keep up to $startIdx - 1
    $newLines = $lines[0..($startIdx - 1)]
    # Add new section
    $newLines += $newSection -split "`n"
    # Keep from $endIdx
    $newLines += $lines[$endIdx..($lines.Length - 1)]
    
    [System.IO.File]::WriteAllLines($file, $newLines)
    Write-Host "Berhasil mengganti Identitas."
} else {
    Write-Host "Marker tidak ditemukan."
}

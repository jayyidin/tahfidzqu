import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dbSave, exportFullDatabase, importFullDatabase } from '../../services/firebase';

export const MasterDataView = () => {
  const {
    adminLvl,
    schLogo, setSchLogo,
    schSub, setSchSub,
    showAlert
  } = useApp();

  const [subInput, setSubInput] = useState(schSub || '');
  const isSuper = adminLvl === 1;

  const handleLogoUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 102400) {
      showAlert('Ukuran file terlalu besar! (Maksimal 100KB)');
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const res = ev.target.result;
        setSchLogo(res);
        localStorage.setItem('tahfidzqu_logo', res);
        dbSave('settings', 'app', { logo: res, subtitle: schSub });
        showAlert('Logo berhasil diperbarui.');
      } catch (err) {
        showAlert('Gagal menyimpan logo.');
      }
    };
    r.readAsDataURL(f);
  };

  const removeLogo = () => {
    setSchLogo('');
    try { localStorage.removeItem('tahfidzqu_logo'); } catch (e) {}
    dbSave('settings', 'app', { logo: '', subtitle: schSub });
    showAlert('Logo dihapus.');
  };

  const saveSubtitle = () => {
    setSchSub(subInput.trim());
    try { localStorage.setItem('tahfidzqu_subtitle', subInput.trim()); } catch (e) {}
    dbSave('settings', 'app', { logo: schLogo, subtitle: subInput.trim() });
    showAlert('Sub-judul sekolah berhasil disimpan.');
  };

  if (!isSuper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#0a120f]">
        <i className="ph-fill ph-lock-key text-5xl text-slate-300 dark:text-slate-700 mb-4"></i>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Akses Ditolak</h2>
        <p className="text-xs text-slate-500 mt-2">Hanya Admin Utama yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div id="master-scroll" className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0a120f]">
      <div className="max-w-md mx-auto w-full p-4 md:p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="mb-8 text-center pt-4">
          <div className="w-16 h-16 bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-slate-200 dark:shadow-none">
            <i className="ph-fill ph-gear-six text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-1">Pengaturan</h1>
          <p className="text-[11px] text-slate-500 font-medium">Sesuaikan tampilan dan data aplikasi.</p>
        </div>

        {/* Section: Identitas */}
        <div className="mb-6">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Identitas Aplikasi</h2>
          <div className="bg-white dark:bg-[#15241e] border border-slate-200/60 dark:border-[#1a2e26] rounded-3xl overflow-hidden shadow-sm">
            
            {/* Logo Item */}
            <div className="p-4 border-b border-slate-100 dark:border-[#1a2e26]/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#0f1915] flex items-center justify-center shrink-0">
                  {schLogo ? (
                    <img src={schLogo} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <i className="ph-fill ph-image text-slate-400 text-lg"></i>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Logo Sekolah</p>
                  <p className="text-[10px] text-slate-500">Maksimal 100KB</p>
                </div>
              </div>
              <input type="file" id="aup" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="flex items-center gap-2">
                {schLogo && (
                  <button onClick={removeLogo} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition">
                    <i className="ph-bold ph-trash"></i>
                  </button>
                )}
                <button onClick={() => document.getElementById('aup').click()} className="px-4 py-2 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold hover:scale-105 transition-transform shadow-md">
                  Ubah
                </button>
              </div>
            </div>

            {/* Subtitle Item */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-text-t text-lg"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Sub-Judul Aplikasi</p>
                  <p className="text-[10px] text-slate-500">Tampil di halaman utama</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0f1915] border border-transparent focus:border-blue-400 dark:focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-gray-200 transition-colors outline-none"
                  placeholder="Contoh: SDIT Tahfidz..."
                />
                <button onClick={saveSubtitle} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 shrink-0">
                  Simpan
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Section: Sistem */}
        <div className="mb-6">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Sistem</h2>
          <div className="bg-white dark:bg-[#15241e] border border-slate-200/60 dark:border-[#1a2e26] rounded-3xl overflow-hidden shadow-sm">
            
            {/* Database Item */}
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-database text-lg"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Database Lokal</p>
                  <p className="text-[10px] text-slate-500">Cadangkan atau pulihkan data aplikasi</p>
                </div>
              </div>
              <input type="file" id="db-up" accept=".json" className="hidden" onChange={importFullDatabase} />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={exportFullDatabase}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1915] border border-slate-200 dark:border-[#1a2e26] text-slate-700 dark:text-gray-300 text-xs font-bold hover:border-orange-300 transition-colors"
                >
                  <i className="ph-bold ph-export"></i> Export
                </button>
                <button
                  onClick={() => document.getElementById('db-up').click()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
                >
                  <i className="ph-bold ph-import"></i> Import
                </button>
              </div>
            </div>

          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 mt-8 font-medium">TahfidzQur App Version 2.0</p>
        
      </div>
    </div>
  );
};

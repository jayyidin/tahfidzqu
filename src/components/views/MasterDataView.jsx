import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dbSave, dbDelete, exportFullDatabase, importFullDatabase } from '../../services/firebase';
import { exportHalaqohPDF } from '../../services/pdf';
import { esc } from '../../utils/helpers';

export const MasterDataView = () => {
  const {
    ustadz, halaqohs, siswas, surahs, segs, subs,
    hierSel, setHierSel,
    adminLvl,
    schLogo, setSchLogo,
    schSub, setSchSub,
    setModal, setModalData,
    showAlert, showConfirm
  } = useApp();

  const [subInput, setSubInput] = useState(schSub || '');
  const [searchSiswa, setSearchSiswa] = useState('');

  const isSuper = adminLvl === 1;

  // Filter lists based on hierarchy selection
  const uList = ustadz;
  const hList = hierSel.u ? halaqohs.filter(h => h.ustadzId == hierSel.u) : halaqohs;
  let sList = siswas;
  if (hierSel.h) {
    sList = sList.filter(s => s.halaqohId == hierSel.h);
  } else if (hierSel.u) {
    const hIds = hList.map(x => x.id);
    sList = sList.filter(s => hIds.includes(s.halaqohId));
  }

  if (searchSiswa) {
    const q = searchSiswa.toLowerCase();
    sList = sList.filter(s => s.name.toLowerCase().includes(q) || (s.kelas && s.kelas.toLowerCase().includes(q)));
  }

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
    showAlert('Nama / Subtitle sekolah berhasil disimpan.');
  };

  const approveUstadz = (uId) => {
    const u = ustadz.find(x => x.id === uId);
    if (u) {
      u.status = 'approved';
      dbSave('ustadz', uId, u);
      showAlert(`Akun Ustadz/ah "${u.name}" telah disetujui.`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 min-h-0 bg-slate-50/50 dark:bg-[#0a120f]/50">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 lg:mb-8 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-purple-600 dark:text-purple-500 mb-1 md:mb-2 flex items-center gap-2">
              <i className="ph-fill ph-database text-3xl"></i> Data Master
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400">
              Atur hierarki aplikasi, kelola data pengguna, halaqoh, dan santri.
            </p>
          </div>
        </div>

        {/* Superadmin Settings Cards */}
        {isSuper && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8 shrink-0">
            {/* Logo Card */}
            <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl p-4 flex flex-row items-center gap-4 shadow-sm">
              {schLogo ? (
                <img src={schLogo} alt="Logo" className="h-12 w-12 rounded-xl object-contain bg-white dark:bg-[#0a120f] p-1 shadow-sm" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-image text-2xl"></i>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-bold text-emerald-600 mb-1.5 uppercase tracking-widest">Logo Sekolah</p>
                <input type="file" id="aup" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('aup').click()}
                    className="flex-1 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl dark:bg-[#0a120f] dark:border-[#1a2e26] dark:text-gray-300 transition shadow-sm truncate"
                  >
                    Upload
                  </button>
                  {schLogo && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 px-3 py-2 rounded-xl dark:bg-red-900/20 transition truncate"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Subtitle Card */}
            <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl p-4 flex flex-row items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <i className="ph-bold ph-text-t text-2xl"></i>
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <p className="text-[10px] font-bold text-blue-600 mb-1.5 uppercase tracking-widest">Nama Sekolah / Subtitle</p>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    className="input-std !bg-slate-50 dark:!bg-[#0a120f] !border-transparent !py-2 !px-3 !rounded-xl text-xs font-medium flex-1 min-w-0"
                    placeholder="Contoh: SDIT Tahfidz..."
                  />
                  <button
                    type="button"
                    onClick={saveSubtitle}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl shadow-md shrink-0 text-xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* Database Migration Card */}
            <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl p-4 flex flex-row items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 flex items-center justify-center shrink-0">
                <i className="ph-bold ph-database text-2xl"></i>
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <p className="text-[10px] font-bold text-orange-600 mb-1.5 uppercase tracking-widest">Migrasi Database</p>
                <input type="file" id="db-up" accept=".json" className="hidden" onChange={importFullDatabase} />
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={exportFullDatabase}
                    className="flex-1 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl dark:bg-[#0a120f] dark:border-[#1a2e26] dark:text-gray-300 transition shadow-sm truncate"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('db-up').click()}
                    className="flex-1 text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-xl transition truncate dark:bg-orange-900/20"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3 Columns Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-1 pb-10">
          {/* Column 1: USTADZ */}
          <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-[2rem] flex flex-col h-[500px] lg:h-[700px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-[#1a2e26] flex justify-between items-center bg-slate-50 dark:bg-[#0a120f] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
                  <i className="ph-fill ph-chalkboard-teacher text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Ustadz/ah</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{uList.length} Data</p>
                </div>
              </div>
              {isSuper && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setModal('ustadz'); setModalData(null); }}
                    className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition shadow-md shadow-purple-500/30 active:scale-95"
                  >
                    <i className="ph-bold ph-plus text-lg"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {uList.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-200 rounded-2xl">
                  Belum ada data Ustadz/ah.
                </div>
              ) : (
                uList.map((u) => {
                  const isPending = u.status === 'pending';
                  const isAct = hierSel.u === u.id;
                  const actCls = isAct
                    ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30 scale-[1.02]'
                    : isPending
                    ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10'
                    : 'bg-white hover:bg-slate-50 dark:bg-[#0a120f] border-slate-100 dark:border-[#1a2e26] hover:border-purple-300 text-slate-800 dark:text-white';

                  const uGraded = subs.filter(sb => sb.ustadzId === u.id && sb.status === 'graded').length;

                  return (
                    <div
                      key={u.id}
                      onClick={() => setHierSel({ u: u.id, h: null, s: null })}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${actCls}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 dark:bg-[#15241e]'}`}>
                          <i className="ph-fill ph-user text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold truncate block">{u.name}</span>
                            {isPending && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-bold rounded uppercase">
                                Menunggu
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono mt-0.5 flex items-center gap-1.5 ${isAct ? 'text-purple-100' : 'text-slate-400'}`}>
                            <i className="ph-fill ph-identification-card"></i> {u.username} &bull; <i className="ph-fill ph-check-circle text-emerald-500"></i> {uGraded} Lulus
                          </span>
                        </div>
                      </div>

                      {isSuper && (
                        <div className={`flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isAct ? 'opacity-100' : ''}`} onClick={e => e.stopPropagation()}>
                          {isPending && (
                            <button
                              onClick={() => approveUstadz(u.id)}
                              className="p-1.5 rounded-xl text-emerald-500 hover:bg-emerald-50 transition-colors bg-white dark:bg-[#15241e]"
                              title="Setujui Akun"
                            >
                              <i className="ph-fill ph-check-circle text-lg"></i>
                            </button>
                          )}
                          <button
                            onClick={() => { setModal('ustadz'); setModalData(u.id); }}
                            className="p-1.5 rounded-xl hover:text-blue-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                          >
                            <i className="ph-fill ph-pencil-simple text-sm"></i>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); showConfirm('Hapus ustadz ini?', () => dbDelete('ustadz', u.id)); }}
                            className="p-1.5 rounded-xl hover:text-red-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                          >
                            <i className="ph-fill ph-trash text-sm"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: HALAQOH */}
          <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-[2rem] flex flex-col h-[500px] lg:h-[700px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-[#1a2e26] flex justify-between items-center bg-slate-50 dark:bg-[#0a120f] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <i className="ph-fill ph-users-three text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Halaqoh</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{hList.length} Data</p>
                </div>
              </div>
              {hierSel.u && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setModal('halaqoh'); setModalData(null); }}
                    className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition shadow-md shadow-blue-500/30 active:scale-95"
                  >
                    <i className="ph-bold ph-plus text-lg"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {!hierSel.u ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <i className="ph-fill ph-chalkboard-teacher text-5xl mb-4 text-slate-400"></i>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Pilih Ustadz/ah<br/>terlebih dahulu</p>
                </div>
              ) : hList.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-200 rounded-2xl">
                  Belum ada halaqoh.
                </div>
              ) : (
                hList.map((h) => {
                  const isAct = hierSel.h === h.id;
                  const actCls = isAct
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 dark:bg-[#0a120f] border-slate-100 dark:border-[#1a2e26] hover:border-blue-300 text-slate-800 dark:text-white';

                  const hSws = siswas.filter(s => s.halaqohId === h.id).map(s => s.id);
                  const hGraded = subs.filter(sb => hSws.includes(sb.siswaId) && sb.status === 'graded').length;

                  return (
                    <div
                      key={h.id}
                      onClick={() => setHierSel(prev => ({ ...prev, h: h.id, s: null }))}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${actCls}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 dark:bg-[#15241e]'}`}>
                          <i className="ph-fill ph-users-three text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold block truncate">{h.name}</span>
                          <span className={`text-[10px] font-bold block mt-0.5 ${isAct ? 'text-blue-100' : 'text-blue-500'}`}>
                            <i className="ph-fill ph-check-circle"></i> {hGraded} Hafalan Lulus
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isAct ? 'opacity-100' : ''}`} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => exportHalaqohPDF(h.id, { halaqohs, ustadz, siswas, surahs, segs, subs })}
                          className="p-1.5 rounded-xl hover:text-emerald-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                          title="Cetak PDF Mingguan"
                        >
                          <i className="ph-bold ph-file-pdf text-sm"></i>
                        </button>
                        <button
                          onClick={() => { setModal('halaqoh'); setModalData(h.id); }}
                          className="p-1.5 rounded-xl hover:text-purple-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                        >
                          <i className="ph-fill ph-pencil-simple text-sm"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); showConfirm('Hapus halaqoh ini?', () => dbDelete('halaqohs', h.id)); }}
                          className="p-1.5 rounded-xl hover:text-red-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                        >
                          <i className="ph-fill ph-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: SISWA */}
          <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-[2rem] flex flex-col h-[500px] lg:h-[700px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-[#1a2e26] flex flex-col gap-3 bg-slate-50 dark:bg-[#0a120f] shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
                    <i className="ph-fill ph-user-circle text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Siswa</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{sList.length} Data</p>
                  </div>
                </div>
                {hierSel.h && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setModal('siswa'); setModalData(null); }}
                      className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition shadow-md shadow-emerald-500/30 active:scale-95"
                    >
                      <i className="ph-bold ph-plus text-lg"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Local Search for Siswa */}
              <div className="relative">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Cari nama atau kelas..."
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  className="w-full bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors shadow-sm text-slate-700 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {!hierSel.h ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <i className="ph-fill ph-users-three text-5xl mb-4 text-slate-400"></i>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Pilih Halaqoh<br/>terlebih dahulu</p>
                </div>
              ) : sList.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-200 rounded-2xl">
                  Belum ada siswa di halaqoh ini.
                </div>
              ) : (
                sList.map((s) => {
                  const sGraded = subs.filter(sb => sb.siswaId === s.id && sb.status === 'graded').length;
                  const totSegs = segs.length;
                  const prog = totSegs > 0 ? Math.round((sGraded / totSegs) * 100) : 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => { setModal('rekap_siswa'); setModalData(s.id); }}
                      className="group bg-white hover:bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] hover:border-emerald-400 p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#15241e] text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <i className="ph-fill ph-user text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-800 dark:text-white block truncate">{s.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-[#15241e] text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded">
                              Kelas {s.kelas}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">
                              {sGraded} Hafalan ({prog}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { setModal('siswa'); setModalData(s.id); }}
                          className="p-1.5 rounded-xl hover:text-blue-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                        >
                          <i className="ph-fill ph-pencil-simple text-sm"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); showConfirm('Hapus siswa ini?', () => dbDelete('siswas', s.id)); }}
                          className="p-1.5 rounded-xl hover:text-red-500 bg-white dark:bg-[#15241e] text-slate-400 shadow-sm"
                        >
                          <i className="ph-fill ph-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

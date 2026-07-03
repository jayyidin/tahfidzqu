import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioPlayer } from '../common/AudioPlayer';
import { esc } from '../../utils/helpers';

export const HubView = () => {
  const {
    subs, surahs, segs, levels, ustadz, halaqohs, siswas,
    filter, setFilter,
    search,
    adminLvl, loggedInUstadzId,
    setActSurahId, setActSegId,
    setSyahadahData,
    switchView
  } = useApp();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (adminLvl === 2 && loggedInUstadzId) {
      setFilter(prev => ({ ...prev, u: loggedInUstadzId }));
    }
  }, [adminLvl, loggedInUstadzId]);

  // Filter lists for dropdowns
  const uList = adminLvl === 2 ? ustadz.filter(x => x.id == loggedInUstadzId) : ustadz;
  const hList = filter.u !== 'all' ? halaqohs.filter(h => h.ustadzId == filter.u) : halaqohs;
  let sList = siswas;
  if (filter.h !== 'all') {
    sList = sList.filter(s => s.halaqohId == filter.h);
  } else if (filter.u !== 'all') {
    const hIds = hList.map(x => x.id);
    sList = sList.filter(s => hIds.includes(s.halaqohId));
  }

  // Filter submissions
  let filteredSubs = subs;

  // Apply ustadz filter if logged in as Ustadz
  if (adminLvl === 2 && loggedInUstadzId) {
    const uHals = halaqohs.filter(h => h.ustadzId == loggedInUstadzId).map(h => h.id);
    const uSws = siswas.filter(s => uHals.includes(s.halaqohId)).map(s => s.id);
    filteredSubs = filteredSubs.filter(sb => sb.ustadzId == loggedInUstadzId || uSws.includes(sb.siswaId));
  } else if (filter.u !== 'all') {
    const uHals = halaqohs.filter(h => h.ustadzId == filter.u).map(h => h.id);
    const uSws = siswas.filter(s => uHals.includes(s.halaqohId)).map(s => s.id);
    filteredSubs = filteredSubs.filter(sb => sb.ustadzId == filter.u || uSws.includes(sb.siswaId));
  }

  if (filter.h !== 'all') {
    const hSws = siswas.filter(s => s.halaqohId == filter.h).map(s => s.id);
    filteredSubs = filteredSubs.filter(sb => sb.halaqohId == filter.h || hSws.includes(sb.siswaId));
  }

  if (filter.s !== 'all') {
    filteredSubs = filteredSubs.filter(sb => sb.siswaId == filter.s);
  }

  if (search) {
    const q = search.toLowerCase();
    filteredSubs = filteredSubs.filter(sb => {
      const stu = siswas.find(s => s.id === sb.siswaId);
      const sur = surahs.find(s => s.id === sb.surahId);
      return (stu && stu.name.toLowerCase().includes(q)) || (sur && sur.title.toLowerCase().includes(q));
    });
  }

  // Sort descending by id/timestamp
  filteredSubs = [...filteredSubs].sort((a, b) => b.id - a.id);

  // Pagination
  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage) || 1;
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenSyahadah = (sb) => {
    const stu = siswas.find(s => s.id === sb.siswaId);
    const sur = surahs.find(s => s.id === sb.surahId);
    const seg = segs.find(s => s.id === sb.segmentId);
    const hal = halaqohs.find(h => h.id === sb.halaqohId);
    const ust = ustadz.find(u => u.id === sb.ustadzId);

    setSyahadahData({
      ...sb,
      siswaName: stu ? stu.name : '-',
      siswaKelas: stu ? stu.kelas : '-',
      surahTitle: sur ? sur.title : '-',
      segTitle: seg ? seg.title : '-',
      halaqohName: hal ? hal.name : '-',
      ustadzName: ust ? ust.name : '-'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 dark:bg-[#0a120f]/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold dark:text-white flex items-center gap-3 tracking-tight">
            <i className="ph-fill ph-clipboard-text text-emerald-500"></i> Setoran Hub
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Riwayat dan rekaman audio setoran hafalan siswa dari seluruh halaqoh.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#15241e] p-4 md:p-6 rounded-3xl border border-slate-200/80 dark:border-[#1a2e26] shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
            <select
              value={filter.u}
              onChange={(e) => { setFilter({ u: e.target.value, h: 'all', s: 'all' }); setCurrentPage(1); }}
              disabled={adminLvl === 2}
              className="input-std !py-2.5 text-xs !bg-slate-50 dark:!bg-[#0a120f] cursor-pointer font-semibold"
            >
              {adminLvl !== 2 && <option value="all">-- Semua Ustadz/ah --</option>}
              {uList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <select
              value={filter.h}
              onChange={(e) => { setFilter(prev => ({ ...prev, h: e.target.value, s: 'all' })); setCurrentPage(1); }}
              className="input-std !py-2.5 text-xs !bg-slate-50 dark:!bg-[#0a120f] cursor-pointer font-semibold"
            >
              <option value="all">-- Semua Halaqoh --</option>
              {hList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <select
              value={filter.s}
              onChange={(e) => { setFilter(prev => ({ ...prev, s: e.target.value })); setCurrentPage(1); }}
              className="input-std !py-2.5 text-xs !bg-slate-50 dark:!bg-[#0a120f] cursor-pointer font-semibold"
            >
              <option value="all">-- Semua Siswa --</option>
              {sList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Grid Submissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedSubs.length > 0 ? (
            paginatedSubs.map(sb => {
              const stu = siswas.find(s => s.id === sb.siswaId);
              const hal = halaqohs.find(h => h.id === (stu ? stu.halaqohId : sb.halaqohId));
              const ust = ustadz.find(u => u.id === (hal ? hal.ustadzId : sb.ustadzId));
              const sur = surahs.find(s => s.id === sb.surahId);
              const seg = segs.find(s => s.id === sb.segmentId);
              const lvl = levels.find(l => l.id === (seg ? seg.levelId : null)) || levels.find(l => l.surahId === sb.surahId);

              // Status badges & styles
              let statusClass = 'border-slate-200 text-slate-500 bg-slate-50 dark:bg-[#111c18]';
              let statusIcon = 'ph-clock';
              let statusText = 'Menunggu';
              if (sb.status === 'pending') {
                statusClass = 'border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900/50';
                statusIcon = 'ph-hourglass-high animate-spin';
                statusText = 'Menunggu Penilaian';
              } else if (sb.status === 'need-repeat') {
                statusClass = 'border-red-200 text-red-600 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50';
                statusIcon = 'ph-repeat';
                statusText = 'Perlu Diulang';
              } else if (sb.status === 'graded') {
                statusClass = 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50';
                statusIcon = 'ph-check-circle';
                statusText = sb.grade ? `Lulus &bull; ${sb.grade}` : 'Lulus';
              }

              return (
                <div
                  key={sb.id}
                  className="bg-white border border-slate-100 rounded-[2rem] p-5 md:p-6 shadow-sm flex flex-col gap-4 dark:bg-[#0f1915] dark:border-[#1a2e26] hover:shadow-xl transition-all relative overflow-hidden group"
                >
                  {/* Glow accent */}
                  {sb.status === 'pending' && <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>}
                  {sb.status === 'need-repeat' && <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>}
                  {sb.status === 'graded' && <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>}

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-[#15241e] rounded-full flex items-center justify-center text-slate-500 shrink-0 group-hover:scale-105 transition-transform">
                        <i className="ph-fill ph-user text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-base leading-tight">
                          {stu ? stu.name : '-'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {hal ? hal.name : '-'} &bull; {ust ? ust.name : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 dark:bg-[#15241e] px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-[#1a2e26] shrink-0">
                      {sb.date}
                    </div>
                  </div>

                  {/* Surah & Segment info */}
                  <div className="bg-slate-50 dark:bg-[#15241e] rounded-2xl p-4 border border-slate-100 dark:border-[#1a2e26] relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="ph-fill ph-book-open text-emerald-500 text-lg shrink-0"></i>
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-200 truncate">
                          {sur ? sur.title : '-'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold bg-white dark:bg-[#0a120f] px-2 py-1 rounded-md text-emerald-600 border border-slate-100 dark:border-[#1a2e26] uppercase tracking-widest shrink-0 ml-2">
                        {lvl ? lvl.name : '-'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium pl-6">
                      {seg ? seg.title : '-'}
                    </p>
                  </div>

                  {/* Student Audio Player */}
                  <div className="w-full relative z-20">
                    <AudioPlayer id={`hub_stu_${sb.id}`} url={sb.audioUrl} duration={sb.duration || 0} isUstadz={false} />
                  </div>

                  {/* Ustadz Note */}
                  {(sb.note || sb.voiceNote) && (
                    <div className="mt-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <i className="ph-fill ph-chalkboard-teacher text-emerald-600 dark:text-emerald-400 text-base"></i>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                          Catatan Penguji
                        </span>
                      </div>
                      {sb.note && <p className="text-xs text-slate-700 dark:text-gray-200 leading-relaxed mb-3">{sb.note}</p>}
                      {sb.voiceNote && (
                        <AudioPlayer id={`hub_ust_${sb.id}`} url={sb.voiceNote} duration={0} isUstadz={true} />
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-4 mt-auto border-t border-slate-100 dark:border-[#1a2e26] flex items-center justify-between gap-3 relative z-20">
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border ${statusClass}`}>
                      <i className={`ph-bold ${statusIcon} text-base`}></i>
                      <span dangerouslySetInnerHTML={{ __html: statusText }}></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sb.status === 'need-repeat' && adminLvl === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActSurahId(sb.surahId);
                            setActSegId(sb.segmentId);
                            switchView('setoran');
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/30 transition-all"
                        >
                          <i className="ph-bold ph-microphone text-sm"></i> Setor Ulang
                        </button>
                      )}

                      {sb.status === 'graded' && (
                        <button
                          type="button"
                          onClick={() => handleOpenSyahadah(sb)}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-[#15241e] dark:border-[#1a2e26] dark:text-emerald-400 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                        >
                          <i className="ph-bold ph-certificate text-base"></i> Kartu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#15241e] rounded-3xl border border-slate-200/80 dark:border-[#1a2e26] p-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-[#0a120f] text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ph-fill ph-clipboard-text text-3xl"></i>
              </div>
              <h4 className="text-base font-bold text-slate-700 dark:text-white mb-1">Belum ada data setoran</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tidak ada rekaman audio setoran yang cocok dengan filter yang dipilih saat ini.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                currentPage === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-[#15241e] dark:text-gray-600'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-[#15241e] dark:border-[#1a2e26] dark:text-gray-300'
              }`}
            >
              <i className="ph-bold ph-caret-left"></i>
            </button>
            <span className="text-xs font-bold text-slate-600 dark:text-gray-300 px-4">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                currentPage === totalPages
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-[#15241e] dark:text-gray-600'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-[#15241e] dark:border-[#1a2e26] dark:text-gray-300'
              }`}
            >
              <i className="ph-bold ph-caret-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

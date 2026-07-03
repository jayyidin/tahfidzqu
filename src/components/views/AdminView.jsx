import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioPlayer } from '../common/AudioPlayer';
import { dbDelete } from '../../services/firebase';
import { esc } from '../../utils/helpers';

export const AdminView = () => {
  const {
    subs, surahs, segs, levels, ustadz, halaqohs, siswas,
    filter, setFilter,
    search,
    adminLvl, loggedInUstadzId,
    setModal, setModalData,
    setSyahadahData,
    showConfirm
  } = useApp();

  const [sortOrder, setSortOrder] = useState('newest'); // newest | oldest
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const isSuper = adminLvl === 1;

  useEffect(() => {
    if (adminLvl === 2 && loggedInUstadzId) {
      setFilter(prev => ({ ...prev, u: loggedInUstadzId }));
    }
  }, [adminLvl, loggedInUstadzId]);

  // Dropdown options
  const uList = adminLvl === 2 ? ustadz.filter(x => x.id == loggedInUstadzId) : ustadz;
  const hList = filter.u !== 'all' ? halaqohs.filter(h => h.ustadzId == filter.u) : halaqohs;
  let sList = siswas;
  if (filter.h !== 'all') {
    sList = sList.filter(s => s.halaqohId == filter.h);
  } else if (filter.u !== 'all') {
    const hIds = hList.map(x => x.id);
    sList = sList.filter(s => hIds.includes(s.halaqohId));
  }

  // Filter subs
  let filteredSubs = subs;

  // Ustadz filter
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

  if (filter.surah && filter.surah !== 'all') {
    filteredSubs = filteredSubs.filter(sb => sb.surahId == filter.surah);
  }

  if (filter.startDate) {
    const st = new Date(filter.startDate).setHours(0, 0, 0, 0);
    filteredSubs = filteredSubs.filter(sb => sb.id >= st);
  }

  if (filter.endDate) {
    const en = new Date(filter.endDate).setHours(23, 59, 59, 999);
    filteredSubs = filteredSubs.filter(sb => sb.id <= en);
  }

  if (search) {
    const q = search.toLowerCase();
    filteredSubs = filteredSubs.filter(sb => {
      const stu = siswas.find(s => s.id === sb.siswaId);
      const sur = surahs.find(s => s.id === sb.surahId);
      return (stu && stu.name.toLowerCase().includes(q)) || (sur && sur.title.toLowerCase().includes(q));
    });
  }

  // Sort: pending first, then sortOrder
  filteredSubs = [...filteredSubs].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    if (sortOrder === 'newest') return b.id - a.id;
    return a.id - b.id;
  });

  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage) || 1;
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeleteSub = (e, subId) => {
    e.stopPropagation();
    showConfirm('Hapus rekaman setoran ini secara permanen?', () => {
      dbDelete('subs', subId);
    });
  };

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
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50/50 dark:bg-[#0a120f]/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-slate-200 dark:border-[#1a2e26] pb-4 mb-6 gap-4 md:gap-0">
            <div>
              <h1 className="text-2xl md:text-4xl font-serif text-orange-500 dark:text-orange-400 mb-2 flex items-center gap-3 tracking-tight">
                <i className="ph-fill ph-tray"></i> Antrean Setoran
              </h1>
              <p className="text-xs md:text-sm text-slate-500">
                Daftar rekaman hafalan yang menunggu penilaian dan verifikasi.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"
              >
                <i className={`ph-bold ${sortOrder === 'newest' ? 'ph-sort-descending' : 'ph-sort-ascending'} text-base`}></i>
                <span>Urutkan: {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${
                  autoRefresh
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] text-slate-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-500'
                }`}
              >
                <i className={`ph-bold ph-arrow-clockwise text-base ${autoRefresh ? 'animate-spin' : ''}`}></i>
                <span>Auto-Refresh {autoRefresh ? 'Aktif' : 'Nonaktif'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-[#15241e] border border-slate-100 dark:border-[#1a2e26] p-4 md:p-5 rounded-[2rem] shadow-sm mb-4">
          <div className="relative">
            <i className="ph-fill ph-chalkboard-teacher absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
            <select
              value={filter.u}
              onChange={(e) => { setFilter({ ...filter, u: e.target.value, h: 'all', s: 'all' }); setCurrentPage(1); }}
              disabled={adminLvl === 2}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              {adminLvl !== 2 && <option value="all">Semua Ustadz/ah</option>}
              {uList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <i className="ph-fill ph-users-three absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
            <select
              value={filter.h}
              onChange={(e) => { setFilter({ ...filter, h: e.target.value, s: 'all' }); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="all">Semua Halaqoh</option>
              {hList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <i className="ph-fill ph-user-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
            <select
              value={filter.s}
              onChange={(e) => { setFilter({ ...filter, s: e.target.value }); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="all">Semua Siswa</option>
              {sList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <i className="ph-fill ph-book-open absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
            <select
              value={filter.surah || 'all'}
              onChange={(e) => { setFilter({ ...filter, surah: e.target.value }); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="all">Semua Surah</option>
              {surahs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>

        {/* Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#15241e] border border-slate-100 dark:border-[#1a2e26] p-4 rounded-[2rem] shadow-sm mb-8">
          <div className="relative flex items-center">
            <i className="ph-bold ph-calendar-blank absolute left-4 text-slate-400 text-base pointer-events-none"></i>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
              title="Mulai Tanggal"
            />
          </div>
          <div className="relative flex items-center">
            <i className="ph-bold ph-calendar-blank absolute left-4 text-slate-400 text-base pointer-events-none"></i>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        {/* Submissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paginatedSubs.length > 0 ? (
            paginatedSubs.map(sb => {
              const stu = siswas.find(s => s.id === sb.siswaId);
              const hal = halaqohs.find(h => h.id === (stu ? stu.halaqohId : sb.halaqohId));
              const sur = surahs.find(s => s.id === sb.surahId);
              const seg = segs.find(s => s.id === sb.segmentId);
              const lvl = levels.find(l => l.id === (seg ? seg.levelId : null)) || levels.find(l => l.surahId === sb.surahId);

              // Revision badge
              const prevSubsCount = subs.filter(x => x.siswaId === sb.siswaId && x.segmentId === sb.segmentId && x.status === 'need-repeat' && x.id < sb.id).length;

              return (
                <div
                  key={sb.id}
                  className="bg-white border border-slate-100 rounded-[2rem] p-5 md:p-6 shadow-sm flex flex-col gap-4 dark:bg-[#0f1915] dark:border-[#1a2e26] hover:shadow-xl transition-all relative overflow-hidden group"
                >
                  {sb.status === 'pending' && <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>}

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#15241e] rounded-full flex items-center justify-center text-slate-400 shrink-0">
                        <i className="ph-fill ph-user text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-base leading-tight flex items-center gap-1.5">
                          <span>{stu ? stu.name : '-'}</span>
                          {prevSubsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold rounded uppercase">
                              Revisi {prevSubsCount}x
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {hal ? hal.name : '-'} &bull; Kelas {stu ? stu.kelas : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-[#15241e] px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-[#1a2e26] shrink-0">
                      {sb.date}
                    </div>
                  </div>

                  {/* Surah & Segment Info */}
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
                    <AudioPlayer id={`adm_stu_${sb.id}`} url={sb.audioUrl} duration={sb.duration || 0} isUstadz={false} />
                  </div>

                  {/* Note / Voice Note if graded/noted */}
                  {(sb.note || sb.voiceNote) && (
                    <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-2 p-3 bg-slate-50 dark:bg-[#111c18] rounded-xl border border-slate-100 dark:border-[#1a2e26]">
                      {sb.note && <p className="italic mb-2">&quot;{sb.note}&quot;</p>}
                      {sb.voiceNote && <AudioPlayer id={`adm_ust_${sb.id}`} url={sb.voiceNote} duration={0} isUstadz={true} />}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 mt-auto border-t border-slate-100 dark:border-[#1a2e26] flex items-center justify-between gap-3 relative z-20">
                    <div className="flex items-center gap-1.5">
                      {sb.status === 'pending' && (
                        <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <i className="ph-bold ph-hourglass animate-spin"></i> Menunggu
                        </span>
                      )}
                      {sb.status === 'need-repeat' && (
                        <span className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <i className="ph-bold ph-repeat"></i> Diulang
                        </span>
                      )}
                      {sb.status === 'graded' && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <i className="ph-bold ph-check-circle"></i> Lulus ({sb.grade || '-'})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {sb.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => { setModal('grade'); setModalData(sb.id); }}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/30 py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                        >
                          <i className="ph-fill ph-star text-base"></i> Nilai
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setModal('grade'); setModalData(sb.id); }}
                          className="bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 dark:bg-[#15241e] dark:border-[#1a2e26] py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <i className="ph-bold ph-pencil-simple text-sm"></i> Edit
                        </button>
                      )}

                      {sb.status === 'graded' && (
                        <button
                          type="button"
                          onClick={() => handleOpenSyahadah(sb)}
                          className="bg-slate-100 hover:bg-emerald-50 text-emerald-600 border border-slate-200 dark:bg-[#15241e] dark:border-[#1a2e26] py-2 px-3 rounded-xl font-bold text-xs transition-all"
                          title="Kartu Prestasi"
                        >
                          <i className="ph-bold ph-certificate text-base"></i>
                        </button>
                      )}

                      {isSuper && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSub(e, sb.id)}
                          className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-950/30 p-2 rounded-xl transition-colors"
                          title="Hapus Rekaman"
                        >
                          <i className="ph-bold ph-trash text-base"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#15241e] rounded-[2rem] border border-dashed border-slate-200 dark:border-[#1a2e26] p-8">
              <div className="w-20 h-20 bg-slate-50 dark:bg-[#0a120f] rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                <i className="ph-fill ph-check-circle text-4xl"></i>
              </div>
              <p className="text-slate-500 font-medium">Luar biasa! Tidak ada antrean saat ini.</p>
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
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-[#15241e]'
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
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-[#15241e]'
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

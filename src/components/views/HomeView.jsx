import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { dbDelete, dbSave } from '../../services/firebase';
import { Q_SURAHS } from '../../utils/helpers';

// Helper pencocokan data surat dari referensi Q_SURAHS (1-114)
const getMatchedSurah = (sur) => {
  if (!sur) return null;
  if (sur.no && !isNaN(Number(sur.no))) {
    const found = Q_SURAHS.find(q => q.no === Number(sur.no));
    if (found) return found;
  }
  if (sur.id && !isNaN(Number(sur.id)) && Number(sur.id) <= 114) {
    const found = Q_SURAHS.find(q => q.no === Number(sur.id));
    if (found) return found;
  }
  if (sur.title) {
    const cleanTitle = sur.title.toLowerCase().replace(/^surat\s+|^surah\s+/i, '').trim();
    const exact = Q_SURAHS.find(q => q.name.toLowerCase() === cleanTitle);
    if (exact) return exact;
    const norm = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normClean = norm(cleanTitle);
    const foundNorm = Q_SURAHS.find(q => norm(q.name) === normClean);
    if (foundNorm) return foundNorm;
    const foundIncludes = Q_SURAHS.find(q => normClean.includes(norm(q.name)) || norm(q.name).includes(normClean));
    if (foundIncludes) return foundIncludes;
  }
  return null;
};

const getSurahNumber = (sur) => {
  const m = getMatchedSurah(sur);
  if (m) return m.no;
  if (sur.no && !isNaN(Number(sur.no))) return Number(sur.no);
  if (sur.id && !isNaN(Number(sur.id)) && Number(sur.id) <= 114) return Number(sur.id);
  const numMatch = sur.title?.match(/^\d+/);
  if (numMatch) return parseInt(numMatch[0], 10);
  return 999;
};

const getSurahCleanName = (sur) => {
  const m = getMatchedSurah(sur);
  if (m?.name) return m.name;
  return (sur.title || '').replace(/^surat\s+|^surah\s+|\d+\.\s*/i, '').trim();
};

const getSurahAyatCount = (sur) => {
  const m = getMatchedSurah(sur);
  if (m?.ayat) return m.ayat;
  if (sur.totalAyat) return sur.totalAyat;
  return 0;
};

const sortSurahsComparator = (a, b, mode) => {
  if (mode === 'mushaf_asc') {
    return getSurahNumber(a) - getSurahNumber(b);
  }
  if (mode === 'mushaf_desc') {
    return getSurahNumber(b) - getSurahNumber(a);
  }
  if (mode === 'name_asc') {
    return getSurahCleanName(a).localeCompare(getSurahCleanName(b), 'id', { sensitivity: 'base' });
  }
  if (mode === 'name_desc') {
    return getSurahCleanName(b).localeCompare(getSurahCleanName(a), 'id', { sensitivity: 'base' });
  }
  if (mode === 'ayat_asc') {
    return getSurahAyatCount(a) - getSurahAyatCount(b);
  }
  if (mode === 'ayat_desc') {
    return getSurahAyatCount(b) - getSurahAyatCount(a);
  }
  // Default: custom (berdasarkan order tersimpan di database)
  const oA = a.order !== undefined ? a.order : (isNaN(a.id) ? 9999 : Number(a.id));
  const oB = b.order !== undefined ? b.order : (isNaN(b.id) ? 9999 : Number(b.id));
  return oA - oB;
};

export const HomeView = () => {
  const {
    juzs, surahs, levels, segs,
    actJuzId, setActJuzId,
    setActSurahId, setActLevelId, setActSegId,
    search,
    adminLvl,
    setModal, setModalData,
    switchView,
    showConfirm,
    showAlert,
    bookmarks,
    lastPlayed
  } = useApp();

  const isSuper = adminLvl === 1;

  // Filter & Urutkan khusus Admin
  const [adminSort, setAdminSort] = useState('custom');
  const [adminFilter, setAdminFilter] = useState('all');

  useEffect(() => {
    setAdminSort('custom');
  }, [actJuzId]);

  const hiddenLevelIds = React.useMemo(() => {
    return new Set(levels.filter(l => l.isHidden).map(l => l.id));
  }, [levels]);

  // Temukan semua segmen/ayat yang sedang dihafal
  const activeMemorizingSegIds = Object.keys(bookmarks || {}).filter(key => bookmarks[key] === 'memorizing');
  const activeMemorizingList = activeMemorizingSegIds.map(id => {
    const seg = segs.find(s => String(s.id) === String(id));
    if (!seg) return null;
    if (!isSuper && seg.levelId && hiddenLevelIds.has(seg.levelId)) return null;
    const sur = surahs.find(s => s.id === seg.surahId);
    if (!sur) return null;
    return { seg, sur };
  }).filter(Boolean);

  // Temukan semua segmen/ayat yang sudah dihafal
  const memorizedSegIds = Object.keys(bookmarks || {}).filter(key => bookmarks[key] === 'memorized');
  const memorizedList = memorizedSegIds.map(id => {
    const seg = segs.find(s => String(s.id) === String(id));
    if (!seg) return null;
    if (!isSuper && seg.levelId && hiddenLevelIds.has(seg.levelId)) return null;
    const sur = surahs.find(s => s.id === seg.surahId);
    if (!sur) return null;
    return { seg, sur };
  }).filter(Boolean);

  // Terakhir diputar
  const lastPlayedSeg = (lastPlayed && (isSuper || !levels.find(l => l.id === lastPlayed.levelId)?.isHidden)) ? segs.find(s => String(s.id) === String(lastPlayed.segId)) : null;
  const lastPlayedSurah = lastPlayed ? surahs.find(s => s.id === lastPlayed.surahId) : null;
  
  const getJuzId = (s) => {
    let jId = s.juzId;
    if (jId === 'null' || jId === 'undefined' || jId === 'NaN' || jId === '') jId = null;
    
    if (jId) return jId;
    if (s.juz) {
      if (Array.isArray(s.juz)) return s.juz[0];
      return s.juz;
    }
    return 30;
  };

  const handleContinueMemorizing = (seg, sur) => {
    if (seg && sur) {
      setActJuzId(getJuzId(sur));
      setActSurahId(sur.id);
      setActLevelId(seg.levelId);
      setActSegId(seg.id);
      switchView('player');
    }
  };

  // Filter surahs by actJuzId, search query, dan filter/sorting khusus Admin
  const filteredSurahs = useMemo(() => {
    return surahs.filter(s => {
      let sJuzId = getJuzId(s);
      
      // Periksa apakah juzId surat ini valid (Juz 1-30, atau ada di database custom)
      const isValidJuz = (sJuzId >= 1 && sJuzId <= 30) || juzs.some(j => String(j.id) === String(sJuzId));
      
      // Auto-recovery: Jika Juz-nya sudah dihapus admin, kembalikan surat ini ke Juz 30 secara default
      if (sJuzId && !isValidJuz) {
        sJuzId = 30;
      }

      // Filter khusus Admin
      if (isSuper) {
        if (adminFilter === 'visible' && s.isHidden) return false;
        if (adminFilter === 'hidden' && !s.isHidden) return false;
        if (adminFilter === 'video' && !s.videoId) return false;
      } else if (s.isHidden) {
        return false;
      }

      const matchJuz = String(sJuzId) === String(actJuzId) || (!sJuzId && String(actJuzId) === "30");
      if (!search) return matchJuz;
      return s.title.toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => sortSurahsComparator(a, b, isSuper ? adminSort : 'custom'));
  }, [surahs, actJuzId, juzs, isSuper, search, adminFilter, adminSort]);

  const handleMoveSurah = (e, currentIndex, direction) => {
    e.stopPropagation();
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= filteredSurahs.length) return;

    // Lock in current visual order for all items in this tab
    const updates = filteredSurahs.map((s, i) => ({ ...s, order: i * 10 }));
    
    // Swap the order of the two target items
    const tempOrder = updates[currentIndex].order;
    updates[currentIndex].order = updates[targetIndex].order;
    updates[targetIndex].order = tempOrder;

    // Save all to database
    updates.forEach(s => dbSave('surahs', s.id, s));
    setAdminSort('custom');
  };

  const handleSaveSortedOrder = () => {
    if (adminSort === 'custom') return;

    showConfirm(
      'Terapkan dan simpan urutan surat ini ke database untuk semua pengguna?',
      () => {
        // Ambil semua surat pada Juz aktif saat ini
        const currentJuzSurahs = surahs.filter(s => {
          let sJuzId = getJuzId(s);
          const isValidJuz = (sJuzId >= 1 && sJuzId <= 30) || juzs.some(j => String(j.id) === String(sJuzId));
          if (sJuzId && !isValidJuz) sJuzId = 30;
          return String(sJuzId) === String(actJuzId) || (!sJuzId && String(actJuzId) === "30");
        });

        // Urutkan dengan comparator yang dipilih admin
        const sorted = [...currentJuzSurahs].sort((a, b) => sortSurahsComparator(a, b, adminSort));
        
        // Simpan index baru order: idx * 10 ke database
        sorted.forEach((s, idx) => {
          dbSave('surahs', s.id, { ...s, order: idx * 10 });
        });

        setAdminSort('custom');
        showAlert('Urutan surat berhasil disimpan permanen ke database!');
      }
    );
  };

  const handleOpenSurah = (surahId) => {
    const s = surahs.find(x => x.id === surahId);
    if (s) {
      setActJuzId(getJuzId(s));
    }
    setActSurahId(surahId);
    setActSegId(null);
    setActLevelId(null);
    switchView('player');
  };

  const handleDeleteSurah = (e, surahId, title) => {
    e.stopPropagation();
    showConfirm(`Apakah Anda yakin ingin menghapu ${title}? Semua level dan segmen terkait akan tetap ada atau bisa dihapus manual.`, () => {
      dbDelete('surahs', surahId);
    });
  };

  const handleToggleHideSurah = (e, sur) => {
    e.stopPropagation();
    const isHidden = !sur.isHidden;
    dbSave('surahs', sur.id, { ...sur, isHidden });
  };

  useEffect(() => {
    // Auto-recovery: Pastikan actJuzId selalu valid. Jika terjebak di ID/UUID yang sudah dihapus, paksa ke 30.
    const isActValid = (Number(actJuzId) >= 1 && Number(actJuzId) <= 30) || juzs.some(j => String(j.id) === String(actJuzId));
    if (!isActValid) {
      setActJuzId(30);
    }
  }, [juzs, actJuzId, setActJuzId]);

  const handleDeleteJuz = (e, juzId, name) => {
    e.stopPropagation();
    showConfirm(
      juzId === 30
        ? `Sembunyikan ${name}? (Tab akan disembunyikan secara permanen)`
        : `Hapus ${name}? (Tab akan dihapus dari sistem)`,
      () => {
        if (juzId === 30) {
          dbSave('juzs', juzId, { id: juzId, name, isHidden: true });
        } else {
          dbDelete('juzs', juzId);
        }
        if (actJuzId === juzId) setActJuzId(30);
      }
    );
  };

  const combinedJuzsList = React.useMemo(() => {
    const list = [];
    const dbJuzNumbers = [];
    if (juzs && juzs.length > 0) {
      juzs.forEach(j => {
        list.push(j);
        const numMatch = j.name.match(/\d+/);
        if (numMatch) dbJuzNumbers.push(parseInt(numMatch[0]));
      });
    }
    if (!dbJuzNumbers.includes(30)) {
      list.push({ id: 30, name: 'Juz 30', isDefault: true });
    }
    
    list.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;

      const numA = parseInt((a.name.match(/\d+/) || [0])[0]);
      const numB = parseInt((b.name.match(/\d+/) || [0])[0]);
      return numB - numA;
    });
    return list;
  }, [juzs]);

  const handleMoveJuz = (e, index, direction) => {
    e.stopPropagation();
    if (index + direction < 0 || index + direction >= combinedJuzsList.length) return;

    const updates = [...combinedJuzsList];
    let needsSaveAll = false;
    updates.forEach((u, i) => {
      if (typeof u.order !== 'number') {
        u.order = i;
        needsSaveAll = true;
      }
    });

    const current = updates[index];
    const target = updates[index + direction];
    
    const tempOrder = current.order;
    current.order = target.order;
    target.order = tempOrder;

    if (needsSaveAll) {
      updates.forEach(u => dbSave('juzs', u.id, u));
    } else {
      dbSave('juzs', current.id, current);
      dbSave('juzs', target.id, target);
    }
  };

  return (
    <div id="home-scroll" className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-24 bg-slate-50/50 dark:bg-[#0a120f]/50 transition-colors duration-500">
      <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500 fade-in flex flex-col min-h-full">
        
        {/* Terakhir Dibuka */}
        {lastPlayedSeg && lastPlayedSurah && (
          <div 
            onClick={() => handleContinueMemorizing(lastPlayedSeg, lastPlayedSurah)}
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-full text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2e26]/50 hover:text-emerald-600 transition-colors"
          >
            <i className="ph-fill ph-clock-counter-clockwise text-emerald-500"></i>
            <span>Terakhir dibuka: <strong className="text-slate-800 dark:text-white">{lastPlayedSurah.title.replace(/^\d+\.\s*/, '')}</strong> - {lastPlayedSeg.title}</span>
          </div>
        )}

        {/* Banner Lanjutkan Hafalan */}
        {activeMemorizingList.length > 0 && (
          <div className="mb-6 flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {activeMemorizingList.map(({ seg, sur }) => (
              <div 
                key={seg.id}
                onClick={() => handleContinueMemorizing(seg, sur)}
                className={`flex-none ${activeMemorizingList.length > 1 ? 'w-[75%] md:w-[320px]' : 'w-full'} bg-gradient-to-br from-amber-500 to-orange-400 p-2.5 md:p-3 rounded-2xl md:rounded-[1.25rem] shadow-lg shadow-amber-500/20 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 flex items-center justify-between group border border-amber-400/50 snap-center`}
              >
                <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0 pr-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0 shadow-inner group-hover:scale-110 transition-transform border border-white/20">
                    <i className="ph-fill ph-bookmark-simple text-lg md:text-xl text-white drop-shadow-sm"></i>
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-amber-50 dark:text-white/80 flex items-center gap-1 truncate leading-none mb-0.5"><i className="ph-fill ph-clock"></i> Lanjutkan Hafalan</span>
                    <h3 className="text-[11px] md:text-sm font-extrabold leading-tight text-white drop-shadow-sm truncate w-full">{sur.title.replace(/^\d+\.\s*/, '')}</h3>
                    <p className="text-[8px] md:text-[10px] text-amber-100 leading-tight font-medium truncate w-full">{seg.title}</p>
                  </div>
                </div>
                <div className="w-7 h-7 md:w-8 md:h-8 bg-white text-amber-500 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all shrink-0">
                  <i className="ph-bold ph-play text-[10px] md:text-xs ml-0.5"></i>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Banner Sudah Hafal (Koleksi) */}
        {memorizedList.length > 0 && (
          <div 
            onClick={() => { setModal('memorized_collection'); setModalData(memorizedList); }}
            className="mb-6 flex items-center justify-between bg-white dark:bg-[#15241e] border border-emerald-100 dark:border-emerald-900/50 p-3 md:p-4 rounded-2xl md:rounded-[1.25rem] shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 rounded-xl flex items-center justify-center">
                <i className="ph-fill ph-check-circle text-xl md:text-2xl"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">Koleksi Hafalan</span>
                <span className="text-[10px] md:text-xs text-slate-500 font-medium">{memorizedList.length} bagian sudah diselesaikan</span>
              </div>
            </div>
            <div className="text-emerald-500 mr-2 group-hover:translate-x-1 transition-transform">
              <i className="ph-bold ph-caret-right text-lg"></i>
            </div>
          </div>
        )}

        {/* Juz Selection Bar (Sticky) */}
        <div className="sticky -top-4 md:-top-8 pt-2 pb-0 md:pt-4 md:pb-2 z-40 bg-slate-50/90 dark:bg-[#0a120f]/90 backdrop-blur-xl mb-4 -mx-4 px-4 md:-mx-8 md:px-8 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full py-4 px-1 -mx-1">


            {combinedJuzsList.map((j, idx) => {
              if (j.isHidden && !isSuper) return null;

              const isCustom = !j.isDefault;
              const uniqueKey = isCustom ? j.id : `def_${j.id}`;
            
              return (
                  <div
                    key={uniqueKey}
                    onClick={() => setActJuzId(j.id)}
                    className={`group relative shrink-0 px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm cursor-pointer transition-all duration-300 flex items-center gap-2 ${
                      String(actJuzId) === String(j.id)
                        ? 'text-white shadow-lg shadow-emerald-500/30 scale-105 border-transparent ring-2 ring-emerald-500/20 ring-offset-2 dark:ring-offset-[#0a120f]'
                        : 'bg-white dark:bg-[#15241e] text-slate-600 dark:text-gray-300 border border-slate-200/80 dark:border-[#1a2e26] hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-300 dark:hover:border-emerald-500 hover:-translate-y-0.5'
                    } ${j.isHidden ? 'opacity-60 saturate-50' : ''}`}
                  >
                    {String(actJuzId) === String(j.id) && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 z-0 rounded-2xl"></div>}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {String(actJuzId) === String(j.id) && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm"></span>}
                      {j.name}
                      {j.isHidden && isSuper && <i className="ph-fill ph-eye-slash text-slate-400 dark:text-slate-500 ml-1"></i>}
                    </span>
                    
                    {isSuper && (
                      <div className="flex items-center gap-0.5 ml-1 relative z-10 bg-black/10 dark:bg-white/10 rounded-full px-1 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={(e) => handleMoveJuz(e, idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-inherit transition-colors"
                          title="Geser Kiri"
                        >
                          <i className="ph-bold ph-caret-left text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setModal('juz'); setModalData(j.id); }}
                          className="p-1 hover:text-blue-500 transition-colors"
                          title={isCustom ? "Edit Nama Juz" : "Beri Nama Khusus Juz"}
                        >
                          <i className="ph-bold ph-pencil-simple text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteJuz(e, j.id, j.name)}
                          className="p-1 hover:text-red-500 transition-colors"
                          title="Hapus Tab Juz"
                        >
                          <i className="ph-bold ph-trash text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveJuz(e, idx, 1)}
                          disabled={idx === combinedJuzsList.length - 1}
                          className="p-1 hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-inherit transition-colors"
                          title="Geser Kanan"
                        >
                          <i className="ph-bold ph-caret-right text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                );
            })}

            {isSuper && (
              <button
                type="button"
                onClick={() => { setModal('juz'); setModalData(null); }}
                className="shrink-0 px-4 py-2.5 rounded-2xl border-2 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ml-1"
              >
                <i className="ph-bold ph-plus text-sm"></i> Tambah Juz
              </button>
            )}
          </div>
        </div>

        {/* Admin Surah Filter & Sort Toolbar (Khusus Super Admin) */}
        {isSuper && (
          <div className="mb-4 bg-white dark:bg-[#15241e] border border-slate-200/80 dark:border-[#1a2e26] rounded-2xl p-3 md:p-3.5 shadow-sm transition-all animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Sisi Kiri: Badge Admin & Jumlah Surat */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <i className="ph-fill ph-shield-check text-xs"></i> Khusus Admin
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kelola Urutan ({filteredSurahs.length} Surat)
                </span>
              </div>

              {/* Sisi Kanan: Kontrol Filter & Urutkan */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Filter Status */}
                <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#0f1a15] border border-slate-200 dark:border-[#1a2e26] rounded-xl px-2.5 py-1 text-xs">
                  <i className="ph-bold ph-funnel text-slate-400 text-xs"></i>
                  <select
                    value={adminFilter}
                    onChange={(e) => setAdminFilter(e.target.value)}
                    className="bg-transparent text-slate-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer text-xs"
                    title="Filter Tampilan Surat"
                  >
                    <option value="all">Semua Surat</option>
                    <option value="visible">Hanya Ditampilkan</option>
                    <option value="hidden">Hanya Disembunyikan</option>
                    <option value="video">Hanya Ada Video</option>
                  </select>
                </div>

                {/* Urutkan / Sort */}
                <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#0f1a15] border border-slate-200 dark:border-[#1a2e26] rounded-xl px-2.5 py-1 text-xs">
                  <i className="ph-bold ph-arrows-down-up text-slate-400 text-xs"></i>
                  <select
                    value={adminSort}
                    onChange={(e) => setAdminSort(e.target.value)}
                    className="bg-transparent text-slate-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer text-xs"
                    title="Pilih Metode Pengurutan Surat"
                  >
                    <option value="custom">Urutan Tersimpan (Database)</option>
                    <option value="mushaf_asc">Urutan Mushaf (1 → 114)</option>
                    <option value="mushaf_desc">Urutan Terbalik (114 → 1)</option>
                    <option value="name_asc">Nama Surat (A → Z)</option>
                    <option value="name_desc">Nama Surat (Z → A)</option>
                    <option value="ayat_asc">Ayat Tersedikit</option>
                    <option value="ayat_desc">Ayat Terbanyak</option>
                  </select>
                </div>

                {/* Tombol Simpan Urutan ke Database */}
                {adminSort !== 'custom' && (
                  <button
                    type="button"
                    onClick={handleSaveSortedOrder}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    title="Terapkan dan simpan urutan ini ke database agar tampil permanen untuk semua santri"
                  >
                    <i className="ph-bold ph-floppy-disk"></i>
                    <span>Simpan Urutan</span>
                  </button>
                )}

              </div>
            </div>

            {/* Keterangan Pratinjau saat Urutan Non-Custom Dipilih */}
            {adminSort !== 'custom' && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#1a2e26] flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium animate-in fade-in duration-150">
                <span className="flex items-center gap-1">
                  <i className="ph-fill ph-info"></i>
                  Urutan di layar saat ini bersifat pratinjau. Klik <strong>"Simpan Urutan"</strong> untuk menerapkan permanen ke database santri.
                </span>
                <button
                  type="button"
                  onClick={() => setAdminSort('custom')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline ml-2 shrink-0 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Surah Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-5">
          {filteredSurahs.map((sur, idx) => {
            const surahLevels = levels.filter(l => l.surahId === sur.id && (isSuper || !l.isHidden));
            const surahSegs = segs.filter(s => s.surahId === sur.id && (isSuper || !s.levelId || !hiddenLevelIds.has(s.levelId)));
            const memorizedCount = surahSegs.filter(s => bookmarks[s.id] === 'memorized').length;
            const progress = surahSegs.length > 0 ? Math.round((memorizedCount / surahSegs.length) * 100) : 0;

            return (
              <div
                key={sur.id}
                onClick={() => handleOpenSurah(sur.id)}
                className={`group border border-slate-200/80 dark:border-[#1a2e26] rounded-2xl md:rounded-3xl p-2 md:p-5 shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden aspect-[4/5] md:aspect-square ${sur.bgImage ? 'border-transparent shadow-md' : 'bg-white dark:bg-[#15241e]'}`}
              >
                {sur.bgImage && (
                  <>
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${sur.bgImage})` }}></div>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300"></div>
                  </>
                )}

                {!sur.bgImage && (
                  <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
                )}

                {sur.videoId && (
                  <div className="absolute top-2 right-2 md:top-3 md:right-3 w-5 h-5 md:w-6 md:h-6 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center text-[10px] md:text-xs z-10">
                    <i className="ph-fill ph-youtube-logo"></i>
                  </div>
                )}

                <div className={`w-9 h-9 md:w-14 md:h-14 rounded-full md:rounded-2xl font-extrabold flex items-center justify-center text-[11px] md:text-base shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 mb-1.5 md:mb-3 shrink-0 z-10 ${sur.bgImage ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {getSurahNumber(sur)}
                </div>

                <h3 className={`text-[9px] min-[380px]:text-[10.5px] md:text-base font-bold transition-colors tracking-tighter leading-tight line-clamp-2 w-full px-0.5 mb-1 z-10 ${sur.bgImage ? 'text-white drop-shadow-md' : 'text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                  {sur.title.replace(/^Surat\s+|^Surah\s+/i, '')}
                </h3>
                
                <p className={`text-[8px] md:text-[10px] flex flex-col items-center font-medium w-full truncate leading-tight mt-0.5 z-10 ${sur.bgImage ? 'text-white/80' : 'text-slate-400 dark:text-gray-400'}`}>
                  <span>
                    {(() => {
                      const c = getSurahAyatCount(sur);
                      return c ? `${c} Ayat` : '';
                    })()}
                  </span>
                </p>

                {/* Progress Bar (Jika ada segmen) */}
                {surahSegs.length > 0 && (
                  <div className="w-full mt-2 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-center text-[7.5px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                      <span className={progress === 100 ? 'text-emerald-500' : ''}>{progress === 100 ? 'Selesai' : 'Progres'}</span>
                      <span className={progress === 100 ? 'text-emerald-500' : ''}>{progress}%</span>
                    </div>
                    <div className="w-full h-1 md:h-1.5 bg-slate-100 dark:bg-[#0a120f]/80 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}

                {isSuper && (
                  <>
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1.5 z-20" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setModal('surah'); setModalData(sur.id); }}
                        className="w-6 h-6 md:w-7 md:h-7 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-sm border border-slate-200/50 dark:border-[#1a2e26]/50 rounded-full flex items-center justify-center text-blue-500 shadow-sm active:scale-95 transition-transform"
                      >
                        <i className="ph-bold ph-pencil-simple text-[10px] md:text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSurah(e, sur.id, sur.title)}
                        className="w-6 h-6 md:w-7 md:h-7 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-sm border border-slate-200/50 dark:border-[#1a2e26]/50 rounded-full flex items-center justify-center text-red-500 shadow-sm active:scale-95 transition-transform"
                      >
                        <i className="ph-bold ph-trash text-[10px] md:text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleHideSurah(e, sur)}
                        className={`w-6 h-6 md:w-7 md:h-7 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-sm border border-slate-200/50 dark:border-[#1a2e26]/50 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform ${sur.isHidden ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                        title={sur.isHidden ? "Tampilkan Surah" : "Sembunyikan Surah"}
                      >
                        <i className={`ph-bold ${sur.isHidden ? 'ph-eye-slash' : 'ph-eye'} text-[10px] md:text-xs`}></i>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleMoveSurah(e, idx, -1)}
                      disabled={idx === 0}
                      className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 w-5 h-5 md:w-6 md:h-6 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-sm border border-slate-200/50 dark:border-[#1a2e26]/50 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 disabled:opacity-0 disabled:pointer-events-none hover:text-emerald-500 dark:hover:text-emerald-400 transition-all z-20"
                    >
                      <i className="ph-bold ph-caret-left text-[9px] md:text-[10px]"></i>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveSurah(e, idx, 1)}
                      disabled={idx === filteredSurahs.length - 1}
                      className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 w-5 h-5 md:w-6 md:h-6 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-sm border border-slate-200/50 dark:border-[#1a2e26]/50 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 disabled:opacity-0 disabled:pointer-events-none hover:text-emerald-500 dark:hover:text-emerald-400 transition-all z-20"
                    >
                      <i className="ph-bold ph-caret-right text-[9px] md:text-[10px]"></i>
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {isSuper && (
            <div
              onClick={() => { setModal('surah'); setModalData(null); }}
              className="border-2 border-dashed border-slate-200 dark:border-[#1a2e26] rounded-2xl md:rounded-3xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all duration-300 aspect-[4/5] md:aspect-square group"
            >
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full md:rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                <i className="ph-bold ph-plus text-lg md:text-2xl"></i>
              </div>
              <span className="text-[10px] md:text-sm font-bold text-slate-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 leading-tight">
                Tambah Surah
              </span>
            </div>
          )}
        </div>

        {filteredSurahs.length === 0 && !isSuper && (
          <div className="text-center py-16 bg-white dark:bg-[#15241e] rounded-3xl border border-slate-200/80 dark:border-[#1a2e26] p-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#0a120f] text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ph-bold ph-magnifying-glass text-2xl"></i>
            </div>
            <h4 className="text-base font-bold text-slate-700 dark:text-white mb-1">Surah tidak ditemukan</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada surah yang cocok dengan kata kunci pencarian atau juz yang dipilih.
            </p>
          </div>
        )}

        {/* Copyright Footer */}
        <div className="w-full text-center pt-12 mt-auto">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide">
            &copy; 2026 Juman Jayyidin
          </p>
        </div>
      </div>
    </div>
  );
};

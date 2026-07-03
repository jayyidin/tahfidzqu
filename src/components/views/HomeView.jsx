import React from 'react';
import { useApp } from '../../context/AppContext';
import { dbDelete } from '../../services/firebase';

export const HomeView = () => {
  const {
    juzs, surahs, levels, segs,
    actJuzId, setActJuzId,
    setActSurahId, setActLevelId, setActSegId,
    search,
    adminLvl,
    setModal, setModalData,
    switchView,
    showConfirm
  } = useApp();

  const isSuper = adminLvl === 1;

  // Filter surahs by actJuzId and search query
  const filteredSurahs = surahs.filter(s => {
    const matchJuz = s.juz === actJuzId || s.juzId === actJuzId || (!s.juz && !s.juzId && actJuzId === 30);
    if (!search) return matchJuz;
    return s.title.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpenSurah = (surahId) => {
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

  const handleDeleteJuz = (e, juzId, name) => {
    e.stopPropagation();
    showConfirm(`Hapus ${name}?`, () => {
      dbDelete('juzs', juzId);
      if (actJuzId === juzId) setActJuzId(30);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 dark:bg-[#0a120f]/50 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Juz Selection Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-2 w-full">
            {juzs.length > 0 ? (
              juzs.map(j => (
                <div
                  key={j.id}
                  onClick={() => setActJuzId(j.id)}
                  className={`group relative shrink-0 px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm cursor-pointer transition-all duration-300 flex items-center gap-2 ${
                    actJuzId === j.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                      : 'bg-white dark:bg-[#15241e] text-slate-600 dark:text-gray-300 border border-slate-200/80 dark:border-[#1a2e26] hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
                >
                  <span>{j.name || `Juz ${j.id}`}</span>
                  {isSuper && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setModal('juz'); setModalData(j.id); }}
                        className="p-1 hover:text-blue-200"
                        title="Edit Juz"
                      >
                        <i className="ph-bold ph-pencil-simple text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteJuz(e, j.id, j.name)}
                        className="p-1 hover:text-red-200"
                        title="Hapus Juz"
                      >
                        <i className="ph-bold ph-trash text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Default Juz pills if juzs table is empty
              [30, 29, 28, 27, 26, 1].map(jNum => (
                <button
                  key={jNum}
                  type="button"
                  onClick={() => setActJuzId(jNum)}
                  className={`shrink-0 px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm cursor-pointer transition-all duration-300 ${
                    actJuzId === jNum
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                      : 'bg-white dark:bg-[#15241e] text-slate-600 dark:text-gray-300 border border-slate-200/80 dark:border-[#1a2e26] hover:border-emerald-400'
                  }`}
                >
                  Juz {jNum}
                </button>
              ))
            )}

            {isSuper && (
              <button
                type="button"
                onClick={() => { setModal('juz'); setModalData(null); }}
                className="shrink-0 px-4 py-2.5 rounded-2xl border-2 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <i className="ph-bold ph-plus text-sm"></i> Tambah Juz
              </button>
            )}
          </div>
        </div>

        {/* Surah Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredSurahs.map((sur, idx) => {
            const surahLevels = levels.filter(l => l.surahId === sur.id);
            const surahSegs = segs.filter(s => s.surahId === sur.id);

            return (
              <div
                key={sur.id}
                onClick={() => handleOpenSurah(sur.id)}
                className="group bg-white dark:bg-[#15241e] border border-slate-200/80 dark:border-[#1a2e26] rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-sm shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                      {idx + 1}
                    </div>

                    {isSuper ? (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => { setModal('surah'); setModalData(sur.id); }}
                          className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0a120f] transition-colors"
                          title="Edit Surah"
                        >
                          <i className="ph-bold ph-pencil-simple text-base"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSurah(e, sur.id, sur.title)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0a120f] transition-colors"
                          title="Hapus Surah"
                        >
                          <i className="ph-bold ph-trash text-base"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-[#0a120f] text-slate-400 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                        <i className="ph-fill ph-play text-sm ml-0.5"></i>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight leading-snug mb-1">
                    {sur.title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-gray-400 flex items-center gap-2 font-medium">
                    <span><i className="ph ph-stack"></i> {surahLevels.length} Level</span>
                    <span>&bull;</span>
                    <span><i className="ph ph-list-numbers"></i> {surahSegs.length} Ayat/Segmen</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1a2e26]/80 flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Mulai Hafalan <i className="ph-bold ph-arrow-right"></i>
                  </span>
                  {sur.videoId && (
                    <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1">
                      <i className="ph-fill ph-youtube-logo"></i> Video
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {isSuper && (
            <div
              onClick={() => { setModal('surah'); setModalData(null); }}
              className="border-2 border-dashed border-slate-200 dark:border-[#1a2e26] rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all duration-300 min-h-[180px] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="ph-bold ph-plus text-2xl"></i>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Tambah Surah Baru
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">di Juz ini</span>
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
      </div>
    </div>
  );
};

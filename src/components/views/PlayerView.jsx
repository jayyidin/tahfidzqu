import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { fmtT, esc } from '../../utils/helpers';
import { dbDelete } from '../../services/firebase';

export const PlayerView = () => {
  const {
    actSurahId, actSegId, setActSegId,
    actLevelId, setActLevelId,
    surahs, levels, segs,
    repTarget, setRepTarget,
    curRep, setCurRep,
    segOrder, setSegOrder,
    search, setSearch,
    adminLvl,
    setModal, setModalData,
    switchView,
    showAlert, showConfirm
  } = useApp();

  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const repCountRef = useRef(curRep);
  repCountRef.current = curRep;

  const isAdmin = adminLvl > 0;
  const isSuper = adminLvl === 1;

  const surah = surahs.find(s => s.id === actSurahId);
  const surahLevels = levels.filter(l => l.surahId === actSurahId).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get segments
  let surahSegs = segs.filter(s => s.surahId === actSurahId);
  if (segOrder === 'desc') {
    surahSegs = [...surahSegs].sort((a, b) => (b.order || 0) - (a.order || 0));
  } else if (segOrder === 'random') {
    surahSegs = [...surahSegs].sort(() => Math.random() - 0.5);
  } else {
    surahSegs = [...surahSegs].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const filteredSegs = search ? surahSegs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.translation && s.translation.toLowerCase().includes(search.toLowerCase()))
  ) : surahSegs;

  const activeSeg = segs.find(s => s.id === actSegId) || (filteredSegs.length > 0 ? filteredSegs[0] : null);

  // Set initial level & segment
  useEffect(() => {
    if (!actLevelId && surahLevels.length > 0) {
      setActLevelId(surahLevels[0].id);
    }
    if (!actSegId && filteredSegs.length > 0) {
      setActSegId(filteredSegs[0].id);
    }
  }, [actSurahId, surahLevels.length, filteredSegs.length]);

  // Load YouTube Iframe API
  useEffect(() => {
    if (!surah || !surah.videoId) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch (e) {}
      }

      const el = document.getElementById('youtube-iframe-container');
      if (!el) return;
      el.innerHTML = '<div id="yt-player-target" class="w-full h-full"></div>';

      playerRef.current = new window.YT.Player('yt-player-target', {
        host: 'https://www.youtube-nocookie.com',
        videoId: surah.videoId,
        playerVars: { controls: 0, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (e) => {
            e.target.setPlaybackRate(speed);
            setDuration(e.target.getDuration() || 0);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      document.head.appendChild(tag);
    } else {
      initPlayer();
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [actSurahId, surah?.videoId]);

  // Progress monitoring and segment repetition loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlaying) {
        const ct = playerRef.current.getCurrentTime();
        setCurrentTime(ct);

        if (activeSeg && activeSeg.end && ct >= activeSeg.end) {
          // Check repetition
          if (repCountRef.current + 1 < repTarget) {
            setCurRep(prev => prev + 1);
            playerRef.current.seekTo(activeSeg.start || 0, true);
          } else {
            // Move to next segment
            setCurRep(0);
            const idx = filteredSegs.findIndex(x => x.id === activeSeg.id);
            if (idx !== -1 && idx < filteredSegs.length - 1) {
              const nextS = filteredSegs[idx + 1];
              setActSegId(nextS.id);
              playerRef.current.seekTo(nextS.start || 0, true);
            } else {
              playerRef.current.pauseVideo();
              setIsPlaying(false);
            }
          }
        }
      }
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, activeSeg, repTarget, filteredSegs]);

  const togglePlay = () => {
    if (!playerRef.current) {
      if (!surah?.videoId) showAlert('Video YouTube belum ditambahkan di Surah ini.');
      return;
    }
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      if (activeSeg && currentTime < (activeSeg.start || 0)) {
        playerRef.current.seekTo(activeSeg.start || 0, true);
      }
      playerRef.current.playVideo();
    }
  };

  const nextSeg = (dir) => {
    if (!activeSeg || filteredSegs.length === 0) return;
    const idx = filteredSegs.findIndex(x => x.id === activeSeg.id);
    const targetIdx = Math.max(0, Math.min(filteredSegs.length - 1, idx + dir));
    const targetSeg = filteredSegs[targetIdx];
    setActSegId(targetSeg.id);
    setCurRep(0);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSeg.start || 0, true);
      playerRef.current.playVideo();
    }
  };

  const handleUpdateSpeed = (delta) => {
    const next = Math.max(0.25, Math.min(2, speed + delta));
    setSpeed(next);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(next);
    }
  };

  const handleSelectSeg = (seg) => {
    setActSegId(seg.id);
    setCurRep(0);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seg.start || 0, true);
      playerRef.current.playVideo();
    }
  };

  const handleDeleteSeg = (e, segId) => {
    e.stopPropagation();
    showConfirm('Hapus ayat / segmen ini?', () => {
      dbDelete('segs', segId);
      if (actSegId === segId) setActSegId(null);
    });
  };

  const handleMoveSeg = (e, segId, dir) => {
    e.stopPropagation();
    const idx = surahSegs.findIndex(x => x.id === segId);
    if (idx === -1) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= surahSegs.length) return;

    const currentS = surahSegs[idx];
    const targetS = surahSegs[targetIdx];
    const tempOrder = currentS.order || 0;
    currentS.order = targetS.order || 0;
    targetS.order = tempOrder;
    // update in DB
    // ...
  };

  const goToSetoran = () => {
    if (!actSegId && !activeSeg) {
      showAlert('Pilih segmen hafalan terlebih dahulu!');
      return;
    }
    if (activeSeg && !actSegId) setActSegId(activeSeg.id);
    switchView('setoran');
  };

  const displayArabic = activeSeg ? (
    activeSeg.arabic ? (
      surah?.title.toLowerCase().includes('al-fatihah') ? activeSeg.arabic :
      activeSeg.arabic.replace(/^[\u200B-\u200D\uFEFF\u200E\u200F]*بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '').trim()
    ) : ''
  ) : '';

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden bg-slate-50 dark:bg-[#0a120f]">
      {/* Desktop Sidebar: Levels */}
      <div className="hidden lg:flex w-64 bg-white border-r border-slate-200/60 p-6 flex-col shrink-0 dark:bg-[#15241e] dark:border-[#1a2e26] z-10 shadow-sm">
        <button
          onClick={() => switchView('home')}
          className="flex items-center gap-2 text-slate-400 hover:text-emerald-500 font-bold text-sm mb-8 whitespace-nowrap shrink-0 transition-colors"
        >
          <i className="ph-bold ph-arrow-left text-lg"></i> Kembali
        </button>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pilih Level</h3>
          {isSuper && (
            <button
              onClick={() => { setModal('level'); setModalData(null); }}
              className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-50 hover:text-white transition-all"
            >
              <i className="ph-bold ph-plus text-sm"></i>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full overflow-y-auto hide-scrollbar pb-10">
          {surahLevels.map((l, i) => {
            const isAct = actLevelId === l.id;
            return (
              <div
                key={l.id}
                onClick={() => { setActLevelId(l.id); setActSegId(null); }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl shrink-0 transition-all cursor-pointer border w-full ${
                  isAct
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 translate-x-1'
                    : 'bg-white dark:bg-[#0a120f] border-slate-200 dark:border-[#1a2e26] text-slate-600 dark:text-gray-300 hover:border-emerald-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isAct ? 'bg-white/20' : 'bg-slate-100 dark:bg-[#15241e]'}`}>
                  {i + 1}
                </div>
                <span className="text-sm font-bold truncate flex-1 text-left">{l.name}</span>
                {isAdmin && (
                  <div className="flex items-center gap-1 pl-2 border-l border-white/20" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setModal('level'); setModalData(l.id); }} className="p-1 hover:text-blue-200">
                      <i className="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); showConfirm('Hapus level ini?', () => dbDelete('levels', l.id)); }} className="p-1 hover:text-red-200">
                      <i className="ph-bold ph-trash text-sm"></i>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div id="main-scroll" className="flex-1 overflow-y-auto flex flex-col relative w-full bg-slate-50/50 dark:bg-[#111c18]">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#15241e] border-b border-slate-100 dark:border-[#1a2e26] sticky top-0 z-30 shadow-sm shrink-0">
          <button onClick={() => switchView('home')} className="text-slate-500 hover:text-emerald-500 transition-colors p-1 -ml-1">
            <i className="ph-bold ph-arrow-left text-xl"></i>
          </button>
          <h1 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight px-3 flex-1 text-center tracking-tight">
            {surah?.title || ''}
          </h1>
          {isSuper ? (
            <button onClick={() => setModal('video')} className="text-slate-400 hover:text-emerald-500 p-1 -mr-1">
              <i className="ph-bold ph-link text-xl"></i>
            </button>
          ) : (
            <div className="w-7"></div>
          )}
        </div>

        {/* Desktop Title Bar */}
        <div className="hidden lg:block p-8 pb-6 max-w-5xl mx-auto w-full shrink-0">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-3xl lg:text-4xl font-serif font-bold dark:text-white tracking-tight flex items-center gap-3">
                  {surah?.title || ''}
                </h1>
                {isSuper && (
                  <button onClick={() => setModal('video')} className="p-2 bg-white dark:bg-[#15241e] rounded-xl border border-slate-200 dark:border-[#1a2e26] text-slate-400 hover:text-emerald-500 transition-all shadow-sm">
                    <i className="ph-bold ph-link text-lg"></i>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <i className="ph-fill ph-youtube-logo text-red-500 text-base"></i> Materi Media YouTube
              </p>
            </div>
          </div>
        </div>

        {/* YouTube Player Container */}
        <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-8 shrink-0 bg-black lg:bg-transparent z-20">
          <div className="relative lg:rounded-3xl overflow-hidden bg-black aspect-video lg:shadow-xl ring-1 ring-slate-900/5 dark:ring-white/5" id="yt-player-wrapper">
            <div id="youtube-iframe-container" className="absolute inset-0"></div>

            {!surah?.videoId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <i className="ph-fill ph-video-camera-slash text-5xl mb-2"></i>
                <span className="text-sm font-bold text-white mb-1">Video Belum Tersedia</span>
                <span className="text-xs">Silakan tambahkan tautan video YouTube untuk surah ini.</span>
                {isSuper && (
                  <button onClick={() => setModal('video')} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">
                    + Tambah Video
                  </button>
                )}
              </div>
            )}

            {/* Overlay controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 lg:p-6 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] pointer-events-auto transition-all ${
                    isPlaying ? 'scale-95 opacity-0' : 'scale-100 opacity-100 hover:scale-105'
                  }`}
                >
                  <i className="ph-fill ph-play text-3xl lg:text-4xl text-white ml-1.5"></i>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full mb-3 lg:mb-4 relative">
                <div className="h-1.5 bg-gray-600/60 rounded-full overflow-hidden flex relative backdrop-blur-md">
                  {surahSegs.map(s => {
                    const isAct = s.id === activeSeg?.id;
                    const tot = duration || (surahSegs.length ? surahSegs[surahSegs.length - 1].end : 100);
                    const left = ((s.start || 0) / tot) * 100;
                    const width = (((s.end || 0) - (s.start || 0)) / tot) * 100;
                    return (
                      <div
                        key={s.id}
                        className={`absolute h-full border-r border-black/20 ${isAct ? 'bg-emerald-500' : 'bg-gray-400 opacity-30'}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      ></div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center text-white relative">
                <div className="flex gap-6 pointer-events-auto items-center">
                  <button type="button" onClick={() => nextSeg(-1)} className="hover:text-emerald-400 transition-colors">
                    <i className="ph-fill ph-skip-back text-xl"></i>
                  </button>
                  <button type="button" onClick={togglePlay} className="hover:text-emerald-400 transition-colors">
                    <i className={`ph-fill ${isPlaying ? 'ph-pause' : 'ph-play'} text-3xl`}></i>
                  </button>
                  <button type="button" onClick={() => nextSeg(1)} className="hover:text-emerald-400 transition-colors">
                    <i className="ph-fill ph-skip-forward text-xl"></i>
                  </button>
                </div>
                <div className="text-[10px] lg:text-xs font-mono font-medium tracking-wider bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  {fmtT(currentTime)} / {fmtT(duration)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Levels Bar */}
        <div className="lg:hidden w-full bg-white dark:bg-[#15241e] border-b border-slate-100 dark:border-[#1a2e26] p-3 overflow-x-auto hide-scrollbar shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 w-max px-1">
            {surahLevels.map((l, i) => {
              const isAct = actLevelId === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => { setActLevelId(l.id); setActSegId(null); }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl shrink-0 transition-all cursor-pointer border ${
                    isAct
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-white dark:bg-[#0a120f] border-slate-200 dark:border-[#1a2e26] text-slate-600 dark:text-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isAct ? 'bg-white/20' : 'bg-slate-100 dark:bg-[#15241e]'}`}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-bold truncate">{l.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls and Quran Text */}
        <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full flex flex-col gap-4 lg:gap-6 shrink-0 pb-24 lg:pb-10">
          <div className="grid grid-cols-2 gap-3 lg:gap-5">
            {/* Repetition */}
            <div className="bg-white border border-slate-100 shadow-sm dark:bg-[#15241e] dark:border-[#1a2e26] rounded-2xl p-3 lg:p-4 flex flex-col justify-between">
              <span className="text-[9px] lg:text-[10px] text-emerald-600 font-bold tracking-widest uppercase mb-2 block">
                Pengulangan
              </span>
              <div className="flex justify-between items-center">
                <div className="text-lg lg:text-2xl font-bold dark:text-white leading-none">
                  <span>{repTarget}x</span>
                  {curRep > 0 && <span className="text-[9px] lg:text-[10px] text-emerald-500 font-normal ml-1">({curRep}/{repTarget})</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setRepTarget(Math.max(1, repTarget - 1))} className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] text-slate-500 hover:text-emerald-600 font-bold text-base flex items-center justify-center">-</button>
                  <button type="button" onClick={() => setRepTarget(repTarget + 1)} className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] text-slate-500 hover:text-emerald-600 font-bold text-base flex items-center justify-center">+</button>
                </div>
              </div>
            </div>

            {/* Speed */}
            <div className="bg-white border border-slate-100 shadow-sm dark:bg-[#15241e] dark:border-[#1a2e26] rounded-2xl p-3 lg:p-4 flex flex-col justify-between">
              <span className="text-[9px] lg:text-[10px] text-emerald-600 font-bold tracking-widest uppercase mb-2 block">
                Kecepatan (Speed)
              </span>
              <div className="flex justify-between items-center">
                <span className="text-lg lg:text-2xl font-bold dark:text-white leading-none">{speed}x</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleUpdateSpeed(-0.25)} className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] text-slate-500 hover:text-emerald-600 font-bold flex items-center justify-center"><i class="ph-bold ph-minus"></i></button>
                  <button type="button" onClick={() => handleUpdateSpeed(0.25)} className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] text-slate-500 hover:text-emerald-600 font-bold flex items-center justify-center"><i class="ph-bold ph-plus"></i></button>
                </div>
              </div>
            </div>
          </div>

          {/* Quran Text Box */}
          {activeSeg && (
            <div className="bg-white border border-slate-100 shadow-sm dark:bg-[#15241e] dark:border-[#1a2e26] rounded-2xl lg:rounded-3xl p-5 lg:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 dark:bg-emerald-500/5 rounded-bl-full -mr-5 -mt-5 pointer-events-none"></div>
              <h3 className="inline-block bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-[10px] lg:text-[11px] px-3 py-1.5 rounded-lg mb-5 lg:mb-6 uppercase tracking-widest text-left relative z-10">
                {activeSeg.title}
              </h3>
              <p className="font-arabic text-3xl lg:text-4xl dark:text-white mb-6 lg:mb-8 relative z-10 leading-[2.5] lg:leading-[2.5] text-right">
                {displayArabic}
              </p>
              {activeSeg.translation && (
                <div className="border-t border-slate-100 dark:border-[#1a2e26] pt-4 lg:pt-5">
                  <p className="text-[11px] lg:text-sm text-slate-500 dark:text-gray-400 italic text-left leading-relaxed relative z-10">
                    {activeSeg.translation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Segments List Header */}
          <div className="flex justify-between items-center mt-2">
            <h2 className="text-base lg:text-lg font-bold dark:text-white flex items-center gap-2">
              <i className="ph-fill ph-list-numbers text-emerald-500 text-xl"></i> Daftar Ayat ({filteredSegs.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const orders = ['asc', 'desc', 'random'];
                  setSegOrder(orders[(orders.indexOf(segOrder) + 1) % orders.length]);
                }}
                className="text-[10px] bg-slate-100 dark:bg-[#15241e] px-3 py-1.5 rounded-lg text-slate-600 dark:text-gray-300 font-bold uppercase tracking-widest border border-slate-200 dark:border-[#1a2e26] flex items-center gap-1 hover:text-emerald-500"
              >
                <i className={`ph-bold ${segOrder === 'desc' ? 'ph-sort-descending' : segOrder === 'random' ? 'ph-shuffle' : 'ph-sort-ascending'}`}></i>
                {segOrder === 'desc' ? 'Terbalik' : segOrder === 'random' ? 'Acak' : 'Normal'}
              </button>
              {isSuper && (
                <button
                  type="button"
                  onClick={() => { setModal('segment'); setModalData(null); }}
                  className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-emerald-600 font-bold flex items-center gap-1 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <i className="ph-bold ph-plus"></i> Baru
                </button>
              )}
            </div>
          </div>

          {/* Segments List */}
          <div className="space-y-2 lg:space-y-3">
            {filteredSegs.length > 0 ? (
              filteredSegs.map((s) => {
                const isAct = s.id === activeSeg?.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSeg(s)}
                    className={`p-3.5 lg:p-5 rounded-2xl border cursor-pointer transition-all ${
                      isAct
                        ? 'bg-emerald-50 border-emerald-300 dark:bg-[#152b22] dark:border-emerald-500/50 shadow-md'
                        : 'bg-white dark:bg-[#15241e] border-slate-100 dark:border-[#1a2e26] shadow-sm hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className={`font-bold text-xs lg:text-sm ${isAct ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-200'}`}>
                          {s.title}
                        </h4>
                        <p className="text-[9px] lg:text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                          <i className="ph ph-clock"></i> {fmtT(s.start)} - {fmtT(s.end)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {isAdmin && (
                          <div className="flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setModal('segment'); setModalData(s.id); }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-[#0a120f] rounded-lg shadow-sm border border-slate-200 dark:border-[#1a2e26]">
                              <i className="ph-bold ph-pencil-simple text-sm"></i>
                            </button>
                            <button onClick={(e) => handleDeleteSeg(e, s.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-[#0a120f] rounded-lg shadow-sm border border-slate-200 dark:border-[#1a2e26]">
                              <i className="ph-bold ph-trash text-sm"></i>
                            </button>
                          </div>
                        )}
                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-colors ${
                          isAct ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40' : 'bg-slate-50 border border-slate-200 text-slate-400 hover:text-emerald-500 dark:bg-[#0a120f] dark:border-[#1a2e26]'
                        }`}>
                          <i className={`${isAct ? 'ph-fill' : 'ph-bold'} ph-play text-sm lg:text-base ml-0.5`}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 border border-dashed rounded-2xl dark:border-[#1a2e26] text-slate-400 text-xs italic">
                Ayat tidak ditemukan.
              </div>
            )}
          </div>
        </div>

        {/* Sticky Setor Hafalan Button on Mobile */}
        <div className="lg:hidden sticky bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-[#0a120f]/90 backdrop-blur-md border-t border-slate-200/60 dark:border-[#1a2e26] z-40 mt-auto">
          <button
            type="button"
            onClick={goToSetoran}
            className="btn-std w-full shadow-emerald-500/30 flex items-center justify-center gap-2"
          >
            <i className="ph-fill ph-microphone-stage text-xl"></i> Setor Hafalan
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmtT, esc, Q_SURAHS } from '../../utils/helpers';
import { dbDelete, dbSave } from '../../services/firebase';

export const PlayerView = () => {
  const {
    actJuzId, setActJuzId,
    actSurahId, actSegId, setActSegId,
    actLevelId, setActLevelId,
    surahs, levels, segs, subs = [], juzs = [],
    repTarget, setRepTarget,
    curRep, setCurRep,
    segOrder, setSegOrder,
    search, setSearch,
    adminLvl,
    setModal, setModalData,
    switchView,
    showAlert, showConfirm,
    hierSel,
    userAuth, linkedSiswa,
    bookmarks, setBookmarks,
    setLastPlayed
  } = useApp();

  useEffect(() => {
    if (actSegId && actSurahId) {
      setLastPlayed({ segId: actSegId, surahId: actSurahId });
    }
  }, [actSegId, actSurahId, setLastPlayed]);

  const toggleBookmark = (e, segId) => {
    e.stopPropagation();
    setBookmarks(prev => {
      const cur = prev[segId];
      const nextState = cur === 'memorizing' ? 'memorized' : (cur === 'memorized' ? null : 'memorizing');
      const updated = { ...prev };
      if (nextState) updated[segId] = nextState;
      else delete updated[segId];
      return updated;
    });
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const videoRef = useRef(null);

  const isDirectVideo = (id) => id && (id.includes('.mp4') || id.includes('drive.google.com') || id.startsWith('http'));
  const getDirectVideoSrc = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };

  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);

  const forceSpeed = (rate) => {
    const validRate = Number(rate);
    if (!validRate || isNaN(validRate)) return;

    // Use official YouTube IFrame API
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(validRate);
      } catch (err) {}
    }

    // Direct HTML5 Video fallback (for non-cross-origin or local tests)
    try {
      document.querySelectorAll('video').forEach(v => {
        v.playbackRate = validRate;
      });
    } catch (e) {}

    // postMessage hack for WebView/Android where native setPlaybackRate is blocked
    const payloads = [
      JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [validRate] }),
      JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [validRate], channel: 'widget' }),
      JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [validRate], id: 1, channel: 'widget' })
    ];

    const sendToWin = (win) => {
      if (!win) return;
      payloads.forEach(p => {
        try { win.postMessage(p, '*'); } catch (e) {}
      });
    };

    if (playerRef.current && typeof playerRef.current.getIframe === 'function') {
      try {
        const iframe = playerRef.current.getIframe();
        if (iframe && iframe.contentWindow) sendToWin(iframe.contentWindow);
      } catch (e) {}
    }

    try {
      const iframes = document.querySelectorAll('#youtube-iframe-container iframe, #yt-player-wrapper iframe, iframe');
      iframes.forEach(iframe => {
        if (iframe && iframe.contentWindow) sendToWin(iframe.contentWindow);
      });
    } catch (e) {}
  };

  const applySpeedWithRetries = (targetRate) => {
    const validRate = Number(targetRate);
    if (!validRate || isNaN(validRate)) return;
    
    forceSpeed(validRate);
    
    // Clear old timeouts if they exist
    if (window.speedTimeouts) {
      window.speedTimeouts.forEach(clearTimeout);
    }
    
    // Aggressively re-apply speed after play/seek because YouTube often resets it
    window.speedTimeouts = [200, 500, 1000, 2000].map(delay => 
      setTimeout(() => forceSpeed(validRate), delay)
    );
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.5 : speed === 0.5 ? 0.75 : 1;
    setSpeed(next);
    speedRef.current = next;
    applySpeedWithRetries(next);
  };

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompactVideo, setIsCompactVideo] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isAyatFloating, setIsAyatFloating] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    
    // Pastikan saat ditutup, kita secara eksplisit menyetel actJuzId ke juz surat yang sedang dibuka
    const activeSurah = surahs.find(s => String(s.id) === String(actSurahId));
    if (activeSurah) {
      let jId = activeSurah.juzId;
      if (jId === 'null' || jId === 'undefined' || jId === 'NaN' || jId === '') jId = null;
      if (!jId) jId = activeSurah.juz || 30;
      if (Array.isArray(jId)) jId = jId[0];
      
      // Validasi agar ID hantu tidak lolos
      const isValidJuz = (Number(jId) >= 1 && Number(jId) <= 30) || juzs.some(j => String(j.id) === String(jId));
      if (!isValidJuz) jId = 30;
      
      setActJuzId(jId);
    }

    setTimeout(() => {
      setIsClosing(false);
      switchView('home');
    }, 250);
  };

  const intervalRef = useRef(null);
  const repCountRef = useRef(curRep);
  repCountRef.current = curRep;
  const lastSeekTimeRef = useRef(0);
  const remainingRep = Math.max(1, repTarget - curRep);

  const isAdmin = adminLvl > 0;
  const isSuper = adminLvl === 1;

  const surah = surahs.find(s => s.id === actSurahId);
  const matchedSurah = useMemo(() => {
    if (!surah) return null;
    if (surah.no) {
      const byNo = Q_SURAHS.find(q => q.no === Number(surah.no));
      if (byNo) return byNo;
    }
    if (surah.id && !isNaN(Number(surah.id)) && Number(surah.id) <= 114) {
      const byId = Q_SURAHS.find(q => q.no === Number(surah.id));
      if (byId) return byId;
    }
    if (surah.title) {
      const cleanTitle = surah.title.toLowerCase().replace(/^surat\s+|^surah\s+/i, '').trim();
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
  }, [surah]);

  const surahArti = surah?.arti || matchedSurah?.arti || '';
  const surahLevels = useMemo(() => {
    return levels
      .filter(l => l.surahId === actSurahId && (isSuper || !l.isHidden))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [levels, actSurahId, isSuper]);

  const hiddenLevelIds = useMemo(() => {
    return new Set(levels.filter(l => l.surahId === actSurahId && l.isHidden).map(l => l.id));
  }, [levels, actSurahId]);

  const handleToggleHideLevel = (e, lvl) => {
    e.stopPropagation();
    const isHidden = !lvl.isHidden;
    dbSave('levels', lvl.id, { ...lvl, isHidden });
  };

  const isSegSubmitted = (segId) => {
    return subs.some(sub =>
      (sub.segmentId === segId || sub.segId === segId) &&
      (!hierSel?.s || sub.siswaId == hierSel.s)
    );
  };

  const isLevelCompleted = (levelId) => {
    const lvlSegs = segs.filter(s => s.levelId === levelId);
    if (lvlSegs.length === 0) return true;
    return lvlSegs.every(sg => isSegSubmitted(sg.id));
  };

  const surahSegs = useMemo(() => {
    let list = segs.filter(s => {
      if (s.surahId !== actSurahId) return false;
      if (!isSuper && s.levelId && hiddenLevelIds.has(s.levelId)) return false;
      if (actLevelId) return s.levelId === actLevelId;
      return true;
    });
    const getSortVal = (x) => (typeof x.order === 'number') ? x.order : (x.start || 0);
    
    if (segOrder === 'desc') {
      list.sort((a, b) => getSortVal(b) - getSortVal(a));
    } else if (segOrder === 'random') {
      list.sort(() => Math.random() - 0.5);
    } else {
      list.sort((a, b) => getSortVal(a) - getSortVal(b));
    }
    return list;
  }, [segs, actSurahId, actLevelId, segOrder, isSuper, hiddenLevelIds]);

  const filteredSegs = useMemo(() => {
    if (!search) return surahSegs;
    return surahSegs.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.translation && s.translation.toLowerCase().includes(search.toLowerCase()))
    );
  }, [surahSegs, search]);

  const activeSeg = useMemo(() => {
    if (actSegId) return segs.find(s => s.id === actSegId);
    const memSeg = filteredSegs.find(s => bookmarks[s.id] === 'memorizing');
    if (memSeg) return memSeg;
    return filteredSegs.length > 0 ? filteredSegs[0] : null;
  }, [actSegId, segs, filteredSegs, bookmarks]);

  // Set initial level & segment
  useEffect(() => {
    if (surahLevels.length > 0) {
      if (!actLevelId || !surahLevels.some(l => l.id === actLevelId)) {
        setActLevelId(surahLevels[0].id);
      }
    } else {
      if (actLevelId) setActLevelId(null);
    }
    if (!actSegId && filteredSegs.length > 0) {
      const memSeg = filteredSegs.find(s => bookmarks[s.id] === 'memorizing');
      setActSegId(memSeg ? memSeg.id : filteredSegs[0].id);
    }
  }, [actSurahId, surahLevels, filteredSegs.length, actLevelId]);

  // Load YouTube / HTML5 Video API
  useEffect(() => {
    if (!surah || !surah.videoId) return;

    const isDirect = isDirectVideo(surah.videoId);

    if (isDirect) {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch (e) {}
      }

      const vid = videoRef.current;
      if (!vid) return;

      playerRef.current = {
        playVideo: () => { vid.play().catch(e => console.warn(e)); },
        pauseVideo: () => vid.pause(),
        seekTo: (sec) => { vid.currentTime = sec; },
        getCurrentTime: () => vid.currentTime,
        getDuration: () => vid.duration || 0,
        setPlaybackRate: (rate) => { vid.playbackRate = rate; },
        destroy: () => { vid.pause(); vid.removeAttribute('src'); vid.load(); }
      };

      const handleLoadedMetadata = () => {
        setDuration(vid.duration || 0);
        vid.playbackRate = speedRef.current;
      };
      
      const handlePlay = () => { setIsPlaying(true); vid.playbackRate = speedRef.current; };
      const handlePause = () => { setIsPlaying(false); };
      const handleEnded = () => { setIsPlaying(false); };
      const handleTimeUpdate = () => { setCurrentTime(vid.currentTime); };

      vid.addEventListener('loadedmetadata', handleLoadedMetadata);
      vid.addEventListener('play', handlePlay);
      vid.addEventListener('pause', handlePause);
      vid.addEventListener('ended', handleEnded);
      vid.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
        vid.removeEventListener('play', handlePlay);
        vid.removeEventListener('pause', handlePause);
        vid.removeEventListener('ended', handleEnded);
        vid.removeEventListener('timeupdate', handleTimeUpdate);
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try { playerRef.current.destroy(); } catch (e) {}
        }
      };
    } else {
      const initPlayer = () => {
        if (!window.YT || !window.YT.Player || !surah || !surah.videoId) return;
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try { playerRef.current.destroy(); } catch (e) {}
        }

        const el = document.getElementById('youtube-iframe-container');
        if (!el) return;
        el.innerHTML = '<div id="yt-player-target" class="w-full h-full"></div>';

        window.tahfidzPlayer = playerRef.current = new window.YT.Player('yt-player-target', {
          videoId: surah.videoId,
          playerVars: { 
            controls: 1, 
            rel: 0, 
            playsinline: 1, 
            enablejsapi: 1
          },
          events: {
            onReady: (e) => {
              setDuration(e.target.getDuration() || 0);
              applySpeedWithRetries(speedRef.current);
            },
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                applySpeedWithRetries(speedRef.current);
              } else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
            onPlaybackRateChange: (e) => {
              const newRate = typeof e.data === 'number' ? e.data : parseFloat(e.data);
              if (!isNaN(newRate) && newRate > 0 && newRate !== speedRef.current) {
                setSpeed(newRate);
                speedRef.current = newRate;
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
    }
  }, [actSurahId, surah?.videoId]);

  // Progress monitoring and segment repetition loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlaying) {
        
        const ct = playerRef.current.getCurrentTime();
        setCurrentTime(ct);

        if (activeSeg && activeSeg.end && ct >= activeSeg.end) {
          // Prevent duplicate trigger during seek
          if (Date.now() - lastSeekTimeRef.current < 800) return;
          lastSeekTimeRef.current = Date.now();

          // Check repetition
          if (repCountRef.current + 1 < repTarget) {
            setCurRep(prev => prev + 1);
            if (typeof playerRef.current.seekTo === 'function') {
              playerRef.current.seekTo(activeSeg.start || 0, true);
            }
            applySpeedWithRetries(speedRef.current);
          } else {
            // Move to next segment
            setCurRep(0);
            const idx = filteredSegs.findIndex(x => x.id === activeSeg.id);
            if (idx !== -1 && idx < filteredSegs.length - 1) {
              const nextS = filteredSegs[idx + 1];
              setActSegId(nextS.id);
              if (typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(nextS.start || 0, true);
              }
              applySpeedWithRetries(speedRef.current);
            } else {
              if (typeof playerRef.current.pauseVideo === 'function') {
                playerRef.current.pauseVideo();
              }
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
      if (typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } else {
      if (activeSeg && currentTime < (activeSeg.start || 0)) {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(activeSeg.start || 0, true);
        }
      }
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
      applySpeedWithRetries(speedRef.current);
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
      applySpeedWithRetries(speedRef.current);
    }
  };

  const handleSelectSeg = (seg) => {
    setActSegId(seg.id);
    setCurRep(0);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seg.start || 0, true);
      playerRef.current.playVideo();
      applySpeedWithRetries(speedRef.current);
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



  const displayArabic = activeSeg ? (
    activeSeg.arabic ? (
      surah?.title.toLowerCase().includes('al-fatihah') ? activeSeg.arabic :
      activeSeg.arabic.replace(/^[\u200B-\u200D\uFEFF\u200E\u200F]*بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '').trim()
    ) : ''
  ) : '';

  return (
    <div className={`flex flex-col lg:flex-row w-full h-full overflow-hidden bg-slate-50 dark:bg-[#0a120f] ${isClosing ? 'animate-out slide-out-to-bottom-8 fade-out duration-200 ease-in fill-mode-forwards' : 'animate-in slide-in-from-bottom-8 fade-in duration-300 ease-out'}`}>
      {/* Desktop Sidebar: Levels */}
      <div className="hidden lg:flex w-64 bg-white border-r border-slate-200/60 p-6 flex-col shrink-0 dark:bg-[#15241e] dark:border-[#1a2e26] z-10 shadow-sm">
        <button
          onClick={handleClose}
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

        <div className="flex flex-col gap-2.5 w-full overflow-y-auto hide-scrollbar pb-10">
          {surahLevels.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-gray-500 rounded-xl border border-dashed border-slate-200 dark:border-[#1a2e26]">
              {isSuper ? 'Belum ada level' : 'Level belum tersedia'}
            </div>
          )}
          {surahLevels.map((l, i) => {
            const isAct = actLevelId === l.id;
            const lvlSegs = segs.filter(s => s.levelId === l.id);
            const lvlSegsCount = lvlSegs.length;
            const passedSegsCount = lvlSegs.filter(sg => isSegSubmitted(sg.id)).length;
            const isCompleted = lvlSegsCount > 0 && passedSegsCount >= lvlSegsCount;
            const isUnlocked = true;

            return (
              <div
                key={l.id}
                onClick={() => {
                  setActLevelId(isAct ? null : l.id);
                  setActSegId(null);
                }}
                className={`flex flex-col gap-2 p-3.5 rounded-2xl shrink-0 transition-all border w-full ${
                  !isUnlocked
                    ? 'bg-slate-100/60 dark:bg-[#111c18]/60 border-slate-200 dark:border-[#1a2e26] text-slate-400 dark:text-gray-500 cursor-not-allowed opacity-75 border-dashed'
                    : isAct
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 translate-x-1 cursor-pointer'
                    : 'bg-white dark:bg-[#0a120f] border-slate-200/80 dark:border-[#1a2e26] text-slate-700 dark:text-gray-300 hover:border-emerald-400 cursor-pointer'
                } ${l.isHidden ? 'opacity-75 border-dashed border-amber-400/70 bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
                      !isUnlocked
                        ? 'bg-slate-200 dark:bg-[#1a2e26] text-slate-400'
                        : isAct
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-[#15241e] text-slate-600 dark:text-emerald-400'
                    }`}>
                      {!isUnlocked ? '🔒' : isCompleted ? '👑' : i + 1}
                    </div>
                    <span className="text-sm font-bold truncate text-left">{l.name}</span>
                    {l.isHidden && isSuper && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full shrink-0" title="Disembunyikan dari murid">
                        <i className="ph-fill ph-eye-slash"></i> Sembunyi
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 pl-1" onClick={e => e.stopPropagation()}>
                      {isSuper && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleHideLevel(e, l)}
                          className={`p-1.5 rounded transition-colors ${
                            isAct
                              ? 'text-white hover:bg-white/20'
                              : l.isHidden
                              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#1a2e26]'
                          }`}
                          title={l.isHidden ? "Tampilkan Level ke Murid" : "Sembunyikan Level dari Murid"}
                        >
                          <i className={`ph-bold ${l.isHidden ? 'ph-eye-slash' : 'ph-eye'} text-sm`}></i>
                        </button>
                      )}
                      <button onClick={() => { setModal('level'); setModalData(l.id); }} className={`p-1 rounded hover:bg-black/10 ${isAct ? 'text-white' : 'text-slate-400 hover:text-blue-500'}`} title="Edit Level">
                        <i className="ph-bold ph-pencil-simple text-xs"></i>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); showConfirm('Hapus level ini?', () => dbDelete('levels', l.id)); }} className={`p-1 rounded hover:bg-black/10 ${isAct ? 'text-white' : 'text-slate-400 hover:text-red-500'}`} title="Hapus Level">
                        <i className="ph-bold ph-trash text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar under level */}
                <div className="w-full flex items-center gap-2">
                  <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${!isUnlocked ? 'bg-slate-200 dark:bg-[#1a2e26]' : isAct ? 'bg-white/20' : 'bg-slate-100 dark:bg-[#15241e]'}`}>
                    <div
                      className={`h-full transition-all duration-500 ${!isUnlocked ? 'bg-slate-400' : isAct ? 'bg-white' : isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${lvlSegsCount > 0 ? (passedSegsCount / lvlSegsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold shrink-0 ${!isUnlocked ? 'text-slate-400' : isAct ? 'text-white/90' : 'text-slate-400 dark:text-gray-400'}`}>
                    {passedSegsCount}/{lvlSegsCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div id="main-scroll" className="flex-1 overflow-y-auto flex flex-col relative w-full bg-slate-50/50 dark:bg-[#111c18]">
        {/* Sticky Header Group (Video + Title + Levels) */}
        <div className="w-full lg:static sticky top-0 z-30 flex flex-col bg-white dark:bg-[#0a120f] shadow-[0_10px_20px_rgba(0,0,0,0.03)] border-b border-slate-100 dark:border-[#1a2e26]">
          {/* YouTube Player Container */}
          <div className={`w-full shrink-0 bg-black lg:bg-transparent transition-all duration-500 ${
            isCompactVideo
              ? 'lg:max-w-[420px] lg:mx-auto lg:my-2 shadow-xl'
              : 'lg:max-w-5xl lg:mx-auto lg:px-8'
          }`}>
            <div className={`relative overflow-hidden bg-black aspect-video transition-all duration-500 lg:rounded-3xl`} id="yt-player-wrapper">
            {isDirectVideo(surah?.videoId) ? (
              <video
                ref={videoRef}
                src={getDirectVideoSrc(surah.videoId)}
                className="absolute inset-0 w-full h-full object-contain pointer-events-auto"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div id="youtube-iframe-container" className="absolute inset-0 pointer-events-auto"></div>
            )}

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


          </div>
        </div>

        {/* Video Details (Like YouTube Title Area) */}
        <div className="pull-handle w-full px-4 py-2.5 sm:py-3 shrink-0 border-b border-slate-100 dark:border-[#1a2e26] flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] sm:text-[17px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5 sm:mb-1 truncate">
              {surah?.title || ''}
            </h1>
            <div className="text-[clamp(9px,2.4vw,12px)] text-slate-500 dark:text-slate-400 font-medium leading-tight flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
              {surahArti ? (
                <>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">Arti: {surahArti}</span>
                  <span className="opacity-40">&bull;</span>
                  <span>Materi Hafalan</span>
                  <span className="hidden sm:inline"> Video</span>
                  <span className="hidden md:inline"><span className="opacity-40 mr-1.5">&bull;</span>TahfidzQur App</span>
                </>
              ) : (
                <>
                  <span>Materi Video Hafalan</span>
                  <span className="opacity-40">&bull;</span>
                  <span>TahfidzQur App</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {isSuper && (
              <button onClick={() => setModal('video')} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-[#15241e] hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-full transition-colors" title="Ubah Link Video">
                <i className="ph-bold ph-link text-[15px]"></i>
              </button>
            )}
            <button onClick={handleClose} className="lg:hidden w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-[#15241e] hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-full transition-colors" title="Tutup">
              <i className="ph-bold ph-caret-down text-lg"></i>
            </button>
          </div>
        </div>

        {/* Mobile Levels Bar */}
        {(surahLevels.length > 0 || isSuper) && (
          <div className="lg:hidden w-full pt-2 pb-3 px-3 shrink-0">
            <div className="flex items-center gap-1.5 w-full overflow-x-auto hide-scrollbar">
              {surahLevels.map((l, i) => {
                const isAct = actLevelId === l.id;
                const lvlSegs = segs.filter(s => s.levelId === l.id);
                const lvlSegsCount = lvlSegs.length;
                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      setActLevelId(isAct ? null : l.id);
                      setActSegId(null);
                    }}
                    className={`flex-none flex flex-col items-center justify-center gap-0.5 py-1 pl-2.5 ${isSuper ? 'pr-[68px]' : isAdmin ? 'pr-10' : 'pr-2.5'} rounded-lg transition-all duration-300 ease-out active:scale-95 cursor-pointer shadow-sm border overflow-hidden relative ${
                      isAct
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white dark:bg-[#15241e] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#1a2e26] hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#152b22]'
                    } ${l.isHidden ? 'opacity-75 border-dashed border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20' : ''}`}
                  >
                    {isAdmin && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        {isSuper && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleHideLevel(e, l)}
                            className={`p-1 rounded transition-colors ${
                              l.isHidden
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : isAct
                                ? 'bg-black/10 hover:bg-black/20 text-white'
                                : 'bg-slate-100 dark:bg-black/20 hover:bg-slate-200 text-slate-500 dark:text-slate-300'
                            }`}
                            title={l.isHidden ? "Tampilkan Level ke Murid" : "Sembunyikan Level dari Murid"}
                          >
                            <i className={`ph-bold ${l.isHidden ? 'ph-eye-slash' : 'ph-eye'} text-[8px]`}></i>
                          </button>
                        )}
                        <button onClick={() => { setModal('level'); setModalData(l.id); }} className="p-1 rounded bg-black/10 hover:bg-black/20 text-white/90" title="Edit Level">
                          <i className="ph-bold ph-pencil-simple text-[8px]"></i>
                        </button>
                        <button onClick={() => showConfirm('Hapus level ini?', () => dbDelete('levels', l.id))} className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white" title="Hapus Level">
                          <i className="ph-bold ph-trash text-[8px]"></i>
                        </button>
                      </div>
                    )}
                    <span className="text-[9px] min-[380px]:text-[10px] font-bold truncate max-w-full leading-none flex items-center gap-1">
                      {l.name.replace('Level ', 'Lv ')}
                      {l.isHidden && isSuper && (
                        <i className="ph-fill ph-eye-slash text-amber-500 text-[9px] shrink-0" title="Level Disembunyikan"></i>
                      )}
                    </span>
                    <span className={`text-[7px] min-[380px]:text-[8px] tracking-tighter font-mono px-1 py-0.5 whitespace-nowrap rounded leading-none ${isAct ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#0a120f] text-slate-400'}`}>
                      {lvlSegsCount} bagian
                    </span>
                  </div>
                );
              })}
              
              {isSuper && (
                <button
                  type="button"
                  onClick={() => { setModal('level'); setModalData(null); }}
                  className="flex-none px-3 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg border-2 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                >
                  <i className="ph-bold ph-plus text-xs"></i>
                  <span className="text-[8px] font-bold">Tambah</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls and Quran Text */}
      <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full flex flex-col gap-4 lg:gap-6 shrink-0 pb-24 lg:pb-10 pt-6">

          {/* Quran Text Box (Popup Overlay) */}
          {activeSeg && !isAyatFloating && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-out" onClick={() => setIsAyatFloating(true)}>
              <div className="bg-white border border-slate-100 shadow-2xl dark:bg-[#15241e] dark:border-[#1a2e26] rounded-2xl lg:rounded-3xl p-5 lg:p-6 relative overflow-hidden w-full max-w-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/5 rounded-bl-full -mr-5 -mt-5 pointer-events-none"></div>
                
                <div className="flex justify-between items-start relative z-10 mb-4">
                  <h3 className="inline-block bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest text-left">
                    {activeSeg.title}
                  </h3>
                  <button onClick={() => setIsAyatFloating(true)} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-[#0a120f] text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors border border-slate-100 dark:border-[#1a2e26]" title="Tutup Ayat">
                    <i className="ph-bold ph-x"></i>
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto hide-scrollbar pr-1">
                  <p className="font-arabic text-2xl lg:text-3xl dark:text-white mb-4 lg:mb-6 relative z-10 text-right leading-[2.2] lg:leading-[2.5]" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.25rem)' }}>
                    {displayArabic}
                  </p>
                  {activeSeg.translation && (
                    <div className="border-t border-slate-100 dark:border-[#1a2e26] pt-3 lg:pt-4">
                      <p className="text-[10px] lg:text-xs text-slate-500 dark:text-gray-400 italic text-left leading-relaxed relative z-10">
                        {activeSeg.translation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
                  onClick={() => setModal('segment', null)}
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
                const segSub = subs.find(sub => (sub.segmentId === s.id || sub.segId === s.id) && (!hierSel?.s || sub.siswaId == hierSel.s) && sub.grade && !['D', 'E'].includes(sub.grade));
                const isPending = subs.some(sub => (sub.segmentId === s.id || sub.segId === s.id) && (!hierSel?.s || sub.siswaId == hierSel.s) && sub.status === 'pending');
                const hasAnySub = isSegSubmitted(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSeg(s)}
                    className={`p-3.5 lg:p-5 rounded-2xl border cursor-pointer transition-all duration-300 ease-out active:scale-[0.98] group ${
                      isAct
                        ? 'bg-emerald-50 border-emerald-300 dark:bg-[#152b22] dark:border-emerald-500/50 shadow-md'
                        : 'bg-white dark:bg-[#15241e] border-slate-100 dark:border-[#1a2e26] shadow-sm hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-xs lg:text-sm ${isAct ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-200'}`}>
                            {s.title}
                          </h4>
                          {segSub ? (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">👑 Lulus ({segSub.grade})</span>
                          ) : isPending ? (
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20"><i className="ph-fill ph-clock animate-spin"></i> Diperiksa Guru</span>
                          ) : hasAnySub ? (
                            <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-teal-500/20"><i className="ph-fill ph-check-circle"></i> Setoran Selesai</span>
                          ) : null}
                          {bookmarks[s.id] === 'memorizing' && (
                            <span className="text-[9px] bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50 flex items-center gap-1">
                              <i className="ph-fill ph-bookmark-simple"></i> Sedang Dihafal
                            </span>
                          )}
                          {bookmarks[s.id] === 'memorized' && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-700/50 flex items-center gap-1">
                              <i className="ph-fill ph-check-circle"></i> Sudah Hafal
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] lg:text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <i className="ph ph-clock"></i> {fmtT(s.start)} - {fmtT(s.end)}
                          </span>
                          {isAct && repTarget > 1 && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${isPlaying ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 animate-pulse' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                              <i className="ph-fill ph-repeat"></i> Sisa {remainingRep}x
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1.5 items-center shrink-0">
                        <button
                          onClick={(e) => toggleBookmark(e, s.id)}
                          className={`p-1.5 lg:p-2 rounded-xl transition-all duration-300 shadow-sm border ${
                            bookmarks[s.id] === 'memorizing'
                              ? 'bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700 hover:bg-amber-200'
                              : bookmarks[s.id] === 'memorized'
                              ? 'bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700 hover:bg-emerald-200'
                              : 'bg-white text-slate-300 border-slate-100 dark:bg-[#0a120f] dark:text-slate-600 dark:border-[#1a2e26] hover:text-amber-500 hover:border-amber-300 dark:hover:text-amber-400'
                          }`}
                          title={bookmarks[s.id] === 'memorizing' ? 'Tandai: Sudah Hafal' : bookmarks[s.id] === 'memorized' ? 'Hapus Tanda' : 'Tandai: Sedang Dihafal'}
                        >
                          <i className={`${bookmarks[s.id] ? 'ph-fill' : 'ph-bold'} ${bookmarks[s.id] === 'memorized' ? 'ph-check-circle' : 'ph-bookmark-simple'} text-sm lg:text-base`}></i>
                        </button>
                        {isAdmin && (
                          <div className="flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setModal('segment', s.id)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-[#0a120f] rounded-lg shadow-sm border border-slate-200 dark:border-[#1a2e26]">
                              <i className="ph-bold ph-pencil-simple text-sm"></i>
                            </button>
                            <button onClick={(e) => handleDeleteSeg(e, s.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-[#0a120f] rounded-lg shadow-sm border border-slate-200 dark:border-[#1a2e26]">
                              <i className="ph-bold ph-trash text-sm"></i>
                            </button>
                          </div>
                        )}
                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                          isAct ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40' : 'bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 dark:bg-[#0a120f] dark:border-[#1a2e26]'
                        }`}>
                          <i className={`${isAct ? 'ph-fill' : 'ph-bold'} ph-play text-sm lg:text-base ml-0.5 transition-transform duration-300 group-hover:scale-110`}></i>
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

        {/* Universal Sticky Action & Audio Bar */}
        <div className="sticky bottom-0 left-0 w-full p-3.5 lg:p-4 bg-white/95 dark:bg-[#0a120f]/95 backdrop-blur-2xl border-t border-slate-200/70 dark:border-[#1a2e26] z-40 mt-auto shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-all flex flex-col">
          
          {/* Floating Controls Panel */}
          {showControls && (
            <div className="w-full max-w-5xl mx-auto mb-4 animate-in slide-in-from-bottom-4 fade-in duration-300 ease-out">
              {/* Repetition */}
              <div className="bg-slate-50 dark:bg-[#15241e] border border-slate-200/60 dark:border-[#1a2e26] rounded-2xl p-3 flex flex-col justify-center gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5"><i className="ph-fill ph-repeat text-emerald-500"></i> Ulang</span>
                  <div className="flex items-center gap-1.5">
                    {repTarget > 1 && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                        Sisa
                      </span>
                    )}
                    <span className={`text-sm font-bold ${curRep > 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                      {remainingRep}x
                    </span>
                    {repTarget > 1 && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        / {repTarget}x
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] p-1 rounded-xl shadow-sm">
                  <button type="button" onClick={() => { setRepTarget(Math.max(1, repTarget - 1)); setCurRep(0); }} className="flex-1 h-8 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-[#15241e] transition-colors font-bold flex items-center justify-center" title="Kurangi Pengulangan"><i className="ph-bold ph-minus"></i></button>
                  <div className="w-px h-4 bg-slate-200 dark:bg-[#1a2e26]"></div>
                  <button type="button" onClick={() => { setRepTarget(repTarget + 1); setCurRep(0); }} className="flex-1 h-8 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-[#15241e] transition-colors font-bold flex items-center justify-center" title="Tambah Pengulangan"><i className="ph-bold ph-plus"></i></button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                <i className={`ph-fill ${isPlaying ? 'ph-speaker-high animate-pulse text-base sm:text-lg' : 'ph-book-open-text text-sm sm:text-base'}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">
                  {activeSeg ? activeSeg.title : 'Pilih ayat...'}
                </p>
                <div className="text-[clamp(8px,2.2vw,11px)] text-slate-400 font-medium leading-tight mt-0.5">
                  {isPlaying ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span>Sedang memutar</span>
                      {repTarget > 1 && (
                        <span>&bull; Sisa: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{remainingRep}x</strong></span>
                      )}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap flex items-center gap-1">
                      <span className="hidden sm:inline">Tekan putar untuk mulai hafalan</span>
                      <span className="sm:hidden">Mulai hafalan</span>
                      {repTarget > 1 && (
                        <span className="text-slate-500 dark:text-slate-300 font-bold">&bull; Ulang: {repTarget}x</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">

              <button
                type="button"
                onClick={() => setShowControls(!showControls)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ease-out active:scale-90 shadow-sm border ${
                  showControls 
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20 rotate-180' 
                    : 'bg-white dark:bg-[#15241e] text-slate-500 dark:text-gray-400 border-slate-200/50 dark:border-[#1a2e26] hover:bg-slate-50 hover:border-emerald-300'
                }`}
                title="Pengaturan Pemutaran"
              >
                <i className={`ph-bold text-lg ${showControls ? 'ph-caret-down' : 'ph-sliders-horizontal'}`}></i>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-[#15241e] text-slate-700 dark:text-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-[#1f352b] text-xs font-bold flex items-center gap-1.5 transition-all duration-300 ease-out active:scale-90 shadow-sm border border-slate-200/50 dark:border-[#1a2e26]"
                title="Putar/Jeda Audio"
              >
                <i className={`ph-fill ${isPlaying ? 'ph-pause' : 'ph-play'} text-base text-emerald-500`}></i>
                <span className="hidden sm:inline">{isPlaying ? 'Jeda' : 'Putar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Ayat Icon */}
      {isAyatFloating && activeSeg && (
        <button
          onClick={() => setIsAyatFloating(false)}
          className={`fixed right-4 lg:right-8 flex items-center gap-2.5 bg-white dark:bg-[#15241e] text-slate-700 dark:text-white p-1.5 pr-4 rounded-full shadow-xl shadow-black/10 border border-slate-200 dark:border-[#1a2e26] z-50 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 ease-out animate-in slide-in-from-bottom-8 fade-in group ${
            showControls ? 'bottom-56 lg:bottom-60' : 'bottom-24 lg:bottom-28'
          }`}
          title="Tampilkan Teks Ayat"
        >
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <i className="ph-bold ph-book-open-text text-lg"></i>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest leading-none mb-0.5">{activeSeg.title}</span>
            <span className="text-[10px] text-slate-500 font-medium leading-none">Buka Ayat</span>
          </div>
        </button>
      )}
    </div>
  );
};

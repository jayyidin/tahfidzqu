import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ref, onValue, onChildAdded, onChildChanged, onChildRemoved, get } from 'firebase/database';
import { db, safeId, initFirebaseAuth, dbSave, dbSaveCollection, dbDelete } from '../services/firebase';
import { Q_SURAHS } from '../utils/helpers';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('tahfidzqu_theme') || 'light');
  const [adminLvl, setAdminLvl] = useState(0); // 0: public, 1: superadmin, 2: ustadz
  const [loggedInUstadzId, setLoggedInUstadzId] = useState(null);
  const [view, setView] = useState('home');
  const [schLogo, setSchLogo] = useState(() => localStorage.getItem('tahfidzqu_logo') || '');
  const [schSub, setSchSub] = useState(() => localStorage.getItem('tahfidzqu_subtitle') || 'Madrasah Tahfidz Quran');
  
  const [search, setSearch] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [firebaseError, setFirebaseError] = useState('');
  const [isFetchingSubs, setIsFetchingSubs] = useState(true);

  // Collections
  const [juzs, setJuzs] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [levels, setLevels] = useState([]);
  const [segs, setSegs] = useState([]);
  const [ustadz, setUstadz] = useState([]);
  const [halaqohs, setHalaqohs] = useState([]);
  const [siswas, setSiswas] = useState([]);
  const [subs, setSubs] = useState([]);

  // Active player selection
  const [actJuzId, setActJuzId] = useState(30);
  const [actSurahId, setActSurahId] = useState(null);
  const [actLevelId, setActLevelId] = useState(null);
  const [actSegId, setActSegId] = useState(null);
  const [repTarget, setRepTarget] = useState(7);
  const [curRep, setCurRep] = useState(0);
  const [segOrder, setSegOrder] = useState('asc'); // asc, desc, random

  // Filters and sorting
  const [filter, setFilter] = useState({ u: 'all', h: 'all', s: 'all', surah: 'all', startDate: '', endDate: '', status: 'all' });
  const [hierSel, setHierSel] = useState({ u: null, h: null, s: null });
  const [adminSortOrder, setAdminSortOrder] = useState('newest');

  // Modals & Dialogs
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [customDialog, setCustomDialog] = useState({ show: false, type: 'alert', message: '', onConfirm: null });
  const [syahadahData, setSyahadahData] = useState(null);

  // Audio Player State
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [activeAudioDur, setActiveAudioDur] = useState(0);
  const [customAudioSpeed, setCustomAudioSpeed] = useState(1);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tahfidzqu_theme', theme);
  }, [theme]);

  // Audio object setup
  useEffect(() => {
    const a = audioRef.current;
    const handleTimeUpdate = () => {
      const id = activeAudioId;
      if (!id) return;
      const elTime = document.getElementById('audio-time-' + id);
      const elBar = document.getElementById('audio-bar-' + id);
      let ct = a.currentTime;
      if (!ct || isNaN(ct)) ct = 0;
      if (elTime) {
        const m = Math.floor(ct / 60).toString().padStart(2, '0');
        const s = Math.floor(ct % 60).toString().padStart(2, '0');
        elTime.innerText = `${m}:${s}`;
      }
      if (elBar) {
        let d = activeAudioDur || a.duration;
        if (!d || isNaN(d) || d === Infinity || d <= 0) d = Math.max(10, ct + 2);
        const pct = Math.min(100, (ct / d) * 100);
        elBar.style.width = pct + '%';
      }
    };

    const handleEnded = () => {
      const id = activeAudioId;
      if (id) {
        const isUstadz = id.includes('_ust_') || id === 'grade_modal';
        const btn = document.getElementById('audio-btn-' + id);
        const elBar = document.getElementById('audio-bar-' + id);
        const elTime = document.getElementById('audio-time-' + id);
        if (btn) btn.innerHTML = `<i class="ph-fill ph-play ${isUstadz ? 'text-xs' : 'text-sm'}"></i>`;
        if (elBar) elBar.style.width = '0%';
        if (elTime) elTime.innerText = '00:00';
      }
      setActiveAudioId(null);
    };

    const handleError = () => {
      const id = activeAudioId;
      if (id) {
        const isUstadz = id.includes('_ust_') || id === 'grade_modal';
        const btn = document.getElementById('audio-btn-' + id);
        if (btn) btn.innerHTML = `<i class="ph-fill ph-play ${isUstadz ? 'text-xs' : 'text-sm'}"></i>`;
      }
      setActiveAudioId(null);
    };

    a.addEventListener('timeupdate', handleTimeUpdate);
    a.addEventListener('ended', handleEnded);
    a.addEventListener('error', handleError);

    return () => {
      a.removeEventListener('timeupdate', handleTimeUpdate);
      a.removeEventListener('ended', handleEnded);
      a.removeEventListener('error', handleError);
    };
  }, [activeAudioId, activeAudioDur]);

  const playCustomAudio = (id, url, savedDuration) => {
    const a = audioRef.current;
    const isUstadz = id.includes('_ust_') || id === 'grade_modal';
    const getIcon = (state) => `<i class="ph-fill ${state === 'play' ? 'ph-play' : 'ph-pause'} ${isUstadz ? 'text-xs' : 'text-sm'}"></i>`;

    if (activeAudioId === id) {
      if (a.paused) {
        a.play();
        const btn = document.getElementById('audio-btn-' + id);
        if (btn) btn.innerHTML = getIcon('pause');
      } else {
        a.pause();
        const btn = document.getElementById('audio-btn-' + id);
        if (btn) btn.innerHTML = getIcon('play');
      }
      return;
    }

    if (activeAudioId) {
      const oldIsUst = activeAudioId.includes('_ust_') || activeAudioId === 'grade_modal';
      const oldBtn = document.getElementById('audio-btn-' + activeAudioId);
      if (oldBtn) oldBtn.innerHTML = `<i class="ph-fill ph-play ${oldIsUst ? 'text-xs' : 'text-sm'}"></i>`;
      const oldBar = document.getElementById('audio-bar-' + activeAudioId);
      if (oldBar) oldBar.style.width = '0%';
      const oldTime = document.getElementById('audio-time-' + activeAudioId);
      if (oldTime) oldTime.innerText = '00:00';
    }

    setActiveAudioId(id);
    setActiveAudioDur(savedDuration);
    a.src = url;
    a.playbackRate = customAudioSpeed || 1;
    a.play().catch(() => {
      showAlert('Tidak dapat memutar rekaman. Browser membutuhkan interaksi.');
      const btn = document.getElementById('audio-btn-' + id);
      if (btn) btn.innerHTML = getIcon('play');
      setActiveAudioId(null);
    });

    const newBtn = document.getElementById('audio-btn-' + id);
    if (newBtn) newBtn.innerHTML = getIcon('pause');
  };

  const toggleCustomAudioSpeed = (e) => {
    if (e) e.stopPropagation();
    const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
    const next = speeds[(speeds.indexOf(customAudioSpeed) + 1) % speeds.length];
    setCustomAudioSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const showAlert = (message) => {
    setCustomDialog({ show: true, type: 'alert', message, onConfirm: null });
  };

  const showConfirm = (message, onConfirm) => {
    setCustomDialog({ show: true, type: 'confirm', message, onConfirm });
  };

  const switchView = (targetView) => {
    if (isLoading) return;
    setIsLoading(true);
    if (view === 'player' && targetView !== 'player') {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setActiveAudioId(null);
      }
    }
    if (adminLvl === 2 && targetView === 'admin') {
      setHierSel(prev => ({ ...prev, u: loggedInUstadzId }));
      setFilter(prev => ({ ...prev, u: loggedInUstadzId }));
    }
    setSearch('');
    setSearchSiswa('');
    setView(targetView);
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  // Firebase Realtime Database Sync
  useEffect(() => {
    initFirebaseAuth((user) => {
      if (!user) return;

      const syncCollection = (colName, setter) => {
        const colRef = ref(db, `artifacts/${safeId}/public/data/${colName}`);
        onValue(colRef, snap => {
          const obj = snap.val();
          const arr = obj ? Object.keys(obj).map(k => ({ id: isNaN(k) ? k : Number(k), ...obj[k] })) : [];
          setter(arr);
          if (colName === 'subs') setIsFetchingSubs(false);
        }, error => {
          console.error(`Error syncing ${colName}:`, error);
          if (colName === 'subs') setIsFetchingSubs(false);
        });
      };

      syncCollection('juzs', setJuzs);
      syncCollection('surahs', setSurahs);
      syncCollection('levels', setLevels);
      syncCollection('segs', setSegs);
      syncCollection('ustadz', setUstadz);
      syncCollection('halaqohs', setHalaqohs);
      syncCollection('siswas', setSiswas);
      syncCollection('subs', setSubs);

      // App Settings
      onValue(ref(db, `artifacts/${safeId}/public/data/settings/app`), snap => {
        const obj = snap.val();
        if (obj) {
          if (obj.logo !== undefined) {
            setSchLogo(obj.logo);
            localStorage.setItem('tahfidzqu_logo', obj.logo);
          }
          if (obj.subtitle !== undefined) {
            setSchSub(obj.subtitle);
            localStorage.setItem('tahfidzqu_subtitle', obj.subtitle);
          }
        }
      });
    }, (err) => {
      setFirebaseError(err);
      setIsFetchingSubs(false);
    });
  }, []);

  // Set default Juz or Surah if not available
  useEffect(() => {
    if (surahs.length === 0 && Q_SURAHS.length > 0) {
      // Fallback surahs if DB is empty
      const defaultSurahs = Q_SURAHS.map(s => ({
        id: s.no,
        title: `${s.no}. ${s.name}`,
        juz: s.juz[0],
        totalAyat: 0
      }));
      setSurahs(defaultSurahs);
    }
  }, [surahs.length]);

  const exportFullDatabase = () => {
    const dbData = {
      juzs, surahs, levels, segs, ustadz, halaqohs, siswas, subs,
      settings: { logo: schLogo, subtitle: schSub }
    };
    const dataStr = JSON.stringify(dbData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TahfidzQu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFullDatabase = (file) => {
    if (!file) return;
    showConfirm('Peringatan: Mengimpor database akan MENGHAPUS & MENGGANTI semua data saat ini di Cloud. Apakah Anda yakin?', () => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          setIsLoading(true);
          const cols = ['juzs', 'surahs', 'levels', 'segs', 'ustadz', 'halaqohs', 'siswas', 'subs'];
          for (let col of cols) {
            if (data[col] && Array.isArray(data[col])) {
              await dbSaveCollection(col, data[col]);
            }
          }
          if (data.settings) {
            await dbSaveCollection('settings/app', { logo: data.settings.logo || '', subtitle: data.settings.subtitle || '' });
          }
          showAlert("Migrasi/Restore Database berhasil! Halaman akan dimuat ulang.");
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          setIsLoading(false);
          showAlert("Gagal memproses file JSON. Pastikan format file benar.");
        }
      };
      reader.readAsText(file);
    });
  };

  const value = {
    theme, setTheme,
    adminLvl, setAdminLvl,
    loggedInUstadzId, setLoggedInUstadzId,
    view, switchView,
    schLogo, setSchLogo,
    schSub, setSchSub,
    search, setSearch,
    searchSiswa, setSearchSiswa,
    isLoading, setIsLoading,
    loadingMessage, setLoadingMessage,
    loadingProgress, setLoadingProgress,
    firebaseError, setFirebaseError,
    isFetchingSubs,
    juzs, setJuzs,
    surahs, setSurahs,
    levels, setLevels,
    segs, setSegs,
    ustadz, setUstadz,
    halaqohs, setHalaqohs,
    siswas, setSiswas,
    subs, setSubs,
    actJuzId, setActJuzId,
    actSurahId, setActSurahId,
    actLevelId, setActLevelId,
    actSegId, setActSegId,
    repTarget, setRepTarget,
    curRep, setCurRep,
    segOrder, setSegOrder,
    filter, setFilter,
    hierSel, setHierSel,
    adminSortOrder, setAdminSortOrder,
    modal, setModal,
    modalData, setModalData,
    customDialog, setCustomDialog,
    syahadahData, setSyahadahData,
    activeAudioId, setActiveAudioId,
    activeAudioDur, setActiveAudioDur,
    customAudioSpeed,
    playCustomAudio,
    toggleCustomAudioSpeed,
    showAlert, showConfirm,
    exportFullDatabase, importFullDatabase
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

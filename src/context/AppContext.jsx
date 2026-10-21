import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ref, onValue, onChildAdded, onChildChanged, onChildRemoved, get } from 'firebase/database';
import { db, safeId, initFirebaseAuth, dbSave, dbSaveCollection, dbDelete } from '../services/firebase';
import { Q_SURAHS } from '../utils/helpers';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('tahfidzqu_theme') || 'light');
  const [adminLvl, setAdminLvl] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        if (p.has('tq_adminLvl')) return Number(p.get('tq_adminLvl'));
        if (p.has('admin')) return Number(p.get('admin'));
        if (window.location.hash && window.location.hash.includes('?')) {
          const hashQ = window.location.hash.split('?')[1];
          const hp = new URLSearchParams(hashQ);
          if (hp.has('tq_adminLvl')) return Number(hp.get('tq_adminLvl'));
          if (hp.has('admin')) return Number(hp.get('admin'));
        }
      }
    } catch (e) {}
    const v = localStorage.getItem('tq_adminLvl');
    return v ? Number(v) : 0;
  }); // 0: public, 1: superadmin, 2: ustadz
  const [loggedInUstadzId, setLoggedInUstadzId] = useState(() => localStorage.getItem('tq_logged_ustadz') || null);
  const [view, setView] = useState('home');
  const [schLogo, setSchLogo] = useState('');
  const [schSub, setSchSub] = useState('Madrasah Tahfidz Quran');
  
  const [search, setSearch] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [firebaseError, setFirebaseError] = useState('');

  // Collections
  const [juzs, setJuzs] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [levels, setLevels] = useState([]);
  const [segs, setSegs] = useState([]);
  const [ustadz, setUstadz] = useState([]);
  const [halaqohs, setHalaqohs] = useState([]);
  const [siswas, setSiswas] = useState([]);

  // Active player selection
  const [actJuzId, setActJuzId] = useState(() => {
    let val = localStorage.getItem('tq_juz');
    if (!val || val === 'null' || val === 'undefined' || val === 'NaN') return 30;
    return val;
  });
  const [actSurahId, setActSurahId] = useState(() => { const v = localStorage.getItem('tq_surah'); return v ? (isNaN(v) ? v : Number(v)) : null; });
  const [actLevelId, setActLevelId] = useState(() => { const v = localStorage.getItem('tq_level'); return v ? (isNaN(v) ? v : Number(v)) : null; });
  const [actSegId, setActSegId] = useState(null);
  const [lastPlayed, setLastPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tq_last_played')) || null; } catch(e) { return null; }
  });
  const [repTarget, setRepTarget] = useState(7);
  const [curRep, setCurRep] = useState(0);
  const [segOrder, setSegOrder] = useState('asc'); // asc, desc, random

  // Local Bookmarks (No login)
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tq_bookmarks')) || {}; } catch (e) { return {}; }
  });

  // Filters and sorting
  const [filter, setFilter] = useState({ u: 'all', h: 'all', s: 'all', surah: 'all', startDate: '', endDate: '', status: 'all' });
  const [hierSel, setHierSel] = useState({ u: null, h: null, s: null });
  const [adminSortOrder, setAdminSortOrder] = useState('newest');


  // Modals & Dialogs
  const [modal, setModalState] = useState(null);
  const [modalData, setModalData] = useState(null);

  const setModal = (newModal, data = undefined) => {
    if (newModal) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({ view, modal: newModal }, '', '#' + view + '-modal-' + newModal);
      }
    } else {
      if (typeof window !== 'undefined' && window.history && window.history.state && window.history.state.modal) {
        window.history.back();
        return;
      }
    }
    setModalState(newModal);
    if (data !== undefined) setModalData(data);
  };
  const [customDialog, setCustomDialog] = useState({ show: false, type: 'alert', message: '', onConfirm: null });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tahfidzqu_theme', theme);
  }, [theme]);

  // Sync state to localStorage for persistence
  useEffect(() => { localStorage.setItem('tq_juz', actJuzId); }, [actJuzId]);
  useEffect(() => { if (actSurahId) localStorage.setItem('tq_surah', actSurahId); else localStorage.removeItem('tq_surah'); }, [actSurahId]);
  useEffect(() => { if (actLevelId) localStorage.setItem('tq_level', actLevelId); else localStorage.removeItem('tq_level'); }, [actLevelId]);
  useEffect(() => { if (loggedInUstadzId) localStorage.setItem('tq_logged_ustadz', loggedInUstadzId); else localStorage.removeItem('tq_logged_ustadz'); }, [loggedInUstadzId]);
  useEffect(() => { localStorage.setItem('tq_adminLvl', adminLvl); }, [adminLvl]);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const fullUrl = window.location.href;
        if (fullUrl.includes('tq_adminLvl=1') || fullUrl.includes('admin=1')) {
          setAdminLvl(1);
          localStorage.setItem('tq_adminLvl', '1');
        } else if (fullUrl.includes('tq_adminLvl=0') || fullUrl.includes('admin=0')) {
          setAdminLvl(0);
          localStorage.setItem('tq_adminLvl', '0');
        }
      }
    } catch(e) {}
  }, []);
  useEffect(() => { localStorage.setItem('tq_bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { if (lastPlayed) localStorage.setItem('tq_last_played', JSON.stringify(lastPlayed)); }, [lastPlayed]);

  // Handle hardware back button navigation
  useEffect(() => {
    // initialize history with current view
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({ view }, '', '#' + view);
    }
    const handlePopState = (event) => {
      if (event.state) {
        if (event.state.modal) {
          setModalState(event.state.modal);
        } else {
          setModalState(null);
        }

        if (event.state.view) {
          setIsLoading(true);
          setView(event.state.view);
          setSearch('');
          setSearchSiswa('');
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const showAlert = (message) => {
    setCustomDialog({ show: true, type: 'alert', message, onConfirm: null });
  };

  const showConfirm = (message, onConfirm) => {
    setCustomDialog({ show: true, type: 'confirm', message, onConfirm });
  };

  const switchView = (targetView, skipHistory = false) => {
    if (isLoading) return;
    setIsLoading(true);
    if (adminLvl === 2 && targetView === 'admin') {
      setHierSel(prev => ({ ...prev, u: loggedInUstadzId }));
      setFilter(prev => ({ ...prev, u: loggedInUstadzId }));
    }
    setSearch('');
    setSearchSiswa('');
    setView(targetView);
    if (!skipHistory && typeof window !== 'undefined' && window.history) {
      window.history.pushState({ view: targetView }, '', '#' + targetView);
    }
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
        }, error => {
          console.error(`Error syncing ${colName}:`, error);
        });
      };

      syncCollection('juzs', setJuzs);
      syncCollection('surahs', setSurahs);
      syncCollection('levels', setLevels);
      syncCollection('segs', setSegs);
      syncCollection('ustadz', setUstadz);
      syncCollection('halaqohs', setHalaqohs);
      syncCollection('siswas', setSiswas);

      // App Settings
      onValue(ref(db, `artifacts/${safeId}/public/data/settings/app`), snap => {
        const obj = snap.val();
        if (obj) {
          if (obj.logo !== undefined) {
            setSchLogo(obj.logo);
          }
          if (obj.subtitle !== undefined) {
            setSchSub(obj.subtitle);
          }
        }
        // First initial data load is complete
        setTimeout(() => setIsAppLoading(false), 300);
      });
    }, (err) => {
      setFirebaseError(err);
      setIsAppLoading(false);
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
      juzs, surahs, levels, segs, ustadz, halaqohs, siswas,
      settings: { logo: schLogo, subtitle: schSub }
    };
    const dataStr = JSON.stringify(dbData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TahfidzQur_Backup_${new Date().toISOString().slice(0, 10)}.json`;
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
          const cols = ['juzs', 'surahs', 'levels', 'segs', 'ustadz', 'halaqohs', 'siswas'];
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
    isAppLoading,
    loadingMessage, setLoadingMessage,
    loadingProgress, setLoadingProgress,
    firebaseError, setFirebaseError,
    juzs, setJuzs,
    surahs, setSurahs,
    levels, setLevels,
    segs, setSegs,
    ustadz, setUstadz,
    halaqohs, setHalaqohs,
    siswas, setSiswas,
    actJuzId, setActJuzId,
    actSurahId, setActSurahId,
    actLevelId, setActLevelId,
    actSegId, setActSegId,
    lastPlayed, setLastPlayed,
    repTarget, setRepTarget,
    curRep, setCurRep,
    segOrder, setSegOrder,
    bookmarks, setBookmarks,
    filter, setFilter,
    hierSel, setHierSel,
    adminSortOrder, setAdminSortOrder,
    modal, setModal,
    modalData, setModalData,
    customDialog, setCustomDialog,
    showAlert, showConfirm,
    exportFullDatabase, importFullDatabase
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

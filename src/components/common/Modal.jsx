import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { dbSave, dbDelete } from '../../services/firebase';
import { extractVideoId, Q_SURAHS, fmtT, esc } from '../../utils/helpers';

import { exportRekapPDF } from '../../services/pdf';

export const Modal = () => {
  const {
    modal, setModal,
    modalData, setModalData,
    customDialog, setCustomDialog,
    syahadahData, setSyahadahData,
    adminLvl, setAdminLvl,
    setLoggedInUstadzId,
    setFilter, setHierSel,
    switchView,
    juzs, surahs, levels, segs, ustadz, halaqohs, siswas, subs,
    actJuzId, setActJuzId,
    actSurahId, setActSurahId,
    actLevelId, setActLevelId, 
    actSegId, setActSegId,
    hierSel,
    showAlert
  } = useApp();

  const isSuper = adminLvl === 1;

  // Login & Register state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [regError, setRegError] = useState('');

  // Form state for editing master data
  const [formVal, setFormVal] = useState('');
  const [formVal2, setFormVal2] = useState('');
  const [formVal3, setFormVal3] = useState('');
  const [formVal4, setFormVal4] = useState('');
  const [formOrder, setFormOrder] = useState(1);
  const [formTime, setFormTime] = useState({ sm: 0, ss: 0, em: 0, es: 0 });
  const [isFetchingQuran, setIsFetchingQuran] = useState(false);
  
  const [formAyahStart, setFormAyahStart] = useState(1);
  const [formAyahEnd, setFormAyahEnd] = useState(1);
  const [maxAyah, setMaxAyah] = useState(286);
  
  const [showMiniVideo, setShowMiniVideo] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const miniPlayerRef = React.useRef(null);
  
  useEffect(() => {
    if (showMiniVideo && modal === 'segment') {
      const s = surahs.find(x => x.id === actSurahId);
      if (s && s.videoId && window.YT && window.YT.Player) {
        if (window.tahfidzPlayer && typeof window.tahfidzPlayer.pauseVideo === 'function') {
          try { window.tahfidzPlayer.pauseVideo(); } catch(e){}
        }
        const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')) 
          ? window.location.origin 
          : undefined;
          
        miniPlayerRef.current = new window.YT.Player('mini-yt-player', {
          videoId: s.videoId,
          playerVars: { 
            playsinline: 1, 
            rel: 0, 
            enablejsapi: 1,
            ...(origin ? { origin } : {})
          },
          events: {
            onReady: (e) => {
              const startSeconds = parseInt(formTime.sm || 0) * 60 + parseInt(formTime.ss || 0);
              if (startSeconds > 0) e.target.seekTo(startSeconds, true);
            }
          }
        });
      }
    } else {
      if (miniPlayerRef.current && typeof miniPlayerRef.current.destroy === 'function') {
        try { miniPlayerRef.current.destroy(); } catch(e){}
        miniPlayerRef.current = null;
      }
    }
  }, [showMiniVideo]);

  useEffect(() => {
    let interval;
    if (modal === 'segment') {
      interval = setInterval(() => {
        let ct = 0;
        if (showMiniVideo && miniPlayerRef.current && typeof miniPlayerRef.current.getCurrentTime === 'function') {
          ct = miniPlayerRef.current.getCurrentTime();
        } else if (!showMiniVideo && window.tahfidzPlayer && typeof window.tahfidzPlayer.getCurrentTime === 'function') {
          ct = window.tahfidzPlayer.getCurrentTime();
        }
        setCurrentVideoTime(ct);
      }, 250);
    }
    return () => clearInterval(interval);
  }, [modal, showMiniVideo]);

  const formatVideoTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchQuranData = async (isAuto = false) => {
    const sur = surahs.find(s => s.id === actSurahId);
    if (!sur) return;
    
    let surahNo = sur.no;
    if (!surahNo) {
      const matched = Q_SURAHS.find(q => sur.title && sur.title.toLowerCase().includes(q.name.toLowerCase()));
      if (matched) surahNo = matched.no;
    }
    
    if (!surahNo) {
      if (!isAuto) alert('Gagal mendeteksi nomor surat.');
      return;
    }

    const startAyah = parseInt(formAyahStart);
    const endAyah = parseInt(formAyahEnd);
    if (isNaN(startAyah) || isNaN(endAyah) || startAyah > endAyah) {
      if (!isAuto && startAyah > endAyah) alert('Ayat awal tidak boleh lebih besar dari ayat akhir.');
      return;
    }

    const requestedAyahs = new Set();
    for (let i = startAyah; i <= endAyah; i++) {
      requestedAyahs.add(i);
    }

    setIsFetchingQuran(true);
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${surahNo}`);
      const data = await res.json();
      
      if (data && data.code === 200 && data.data && data.data.ayat) {
        const ayahs = data.data.ayat.filter(a => requestedAyahs.has(a.nomorAyat));
        if (ayahs.length > 0) {
          const toArabicNumber = (num) => {
            const digits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
            return num.toString().split('').map(d => digits[d]).join('');
          };
          const combinedArabic = ayahs.map(a => `${a.teksArab} ۝${toArabicNumber(a.nomorAyat)}`).join(' ');
          const combinedTranslation = ayahs.map(a => `(${a.nomorAyat}) ${a.teksIndonesia}`).join('\n');
          
          setFormVal2(combinedArabic);
          setFormVal3(combinedTranslation);
        } else {
          if (!isAuto) alert('Ayat tidak ditemukan di surat ini.');
        }
      }
    } catch (err) {
      console.error(err);
      if (!isAuto) alert('Gagal mengambil data dari server EQuran.');
    }
    setIsFetchingQuran(false);
  };

  const isInitSegment = React.useRef(true);
  useEffect(() => {
    if (modal === 'segment') {
      if (isInitSegment.current) {
        isInitSegment.current = false;
        if (modalData) return; // Don't auto-fetch on initial open if editing an existing segment
      }
      const t = setTimeout(() => {
        fetchQuranData(true);
      }, 300);
      return () => clearTimeout(t);
    } else {
      isInitSegment.current = true;
    }
  }, [formAyahStart, formAyahEnd, modal, modalData]);

  useEffect(() => {
    setLoginError('');
    setRegError('');
    // Initialize form values when modal opens
    if (modal === 'juz') {
      const j = modalData ? juzs.find(x => x.id === modalData) : null;
      setFormVal(j ? j.name : '');
      setFormVal2(j && j.isHidden ? 'true' : 'false');
    } else if (modal === 'surah') {
      const s = modalData ? surahs.find(x => x.id === modalData) : null;
      setFormVal(s ? s.title : '');
      setFormVal2(s && s.videoId ? (s.videoId.startsWith('http') ? s.videoId : `https://youtu.be/${s.videoId}`) : '');
      setFormVal3(s ? (s.bgImage || '') : '');
    } else if (modal === 'video') {
      const s = surahs.find(x => x.id === actSurahId);
      setFormVal(s && s.videoId ? (s.videoId.startsWith('http') ? s.videoId : `https://youtu.be/${s.videoId}`) : '');
    } else if (modal === 'level') {
      const l = modalData ? levels.find(x => x.id === modalData) : null;
      const lvlsForM = levels.filter(x => x.surahId === actSurahId).sort((a, b) => (a.order || 0) - (b.order || 0));
      const curO = l ? (lvlsForM.findIndex(x => x.id === l.id) + 1) : (lvlsForM.length + 1);
      setFormVal(l ? l.name : '');
      setFormOrder(curO);
      setFormVal2(l && l.isHidden ? 'true' : 'false');
    } else if (modal === 'segment') {
      const sg = modalData ? segs.find(x => x.id === modalData) : null;
      const curSgsForModal = segs.filter(x => x.surahId === actSurahId && (!actLevelId || x.levelId === actLevelId)).sort((a, b) => (a.order || 0) - (b.order || 0));
      const curO = sg ? (curSgsForModal.findIndex(x => x.id === sg.id) + 1) : (curSgsForModal.length + 1);
      
      let sStart = 1, sEnd = 1, suffix = '';
      if (sg && sg.title) {
        const match = sg.title.match(/\d+/g);
        if (match) {
          sStart = parseInt(match[0]) || 1;
          sEnd = match.length > 1 ? parseInt(match[1]) || sStart : sStart;
        }
        suffix = sg.title.replace(/Ayat \d+(-\d+)?/gi, '').trim();
      } else {
        const lastSeg = curSgsForModal.length > 0 ? curSgsForModal[curSgsForModal.length - 1] : null;
        if (lastSeg) {
          const match = lastSeg.title.match(/\d+/g);
          if (match) {
            sStart = (match.length > 1 ? parseInt(match[1]) : parseInt(match[0])) + 1;
            sEnd = sStart;
          }
        }
      }
      setFormAyahStart(sStart);
      setFormAyahEnd(sEnd);
      setFormVal(suffix);

      setFormVal2(sg ? sg.arabic : '');
      setFormVal3(sg ? sg.translation : '');
      setFormOrder(curO);
      if (sg) {
        setFormTime({
          sm: Math.floor(sg.start / 60), ss: sg.start % 60,
          em: Math.floor(sg.end / 60), es: sg.end % 60
        });
      } else {
        const lastSeg = curSgsForModal.length > 0 ? curSgsForModal[curSgsForModal.length - 1] : null;
        if (lastSeg && lastSeg.end) {
          setFormTime({ 
            sm: Math.floor(lastSeg.end / 60), ss: Math.floor(lastSeg.end % 60), 
            em: Math.floor(lastSeg.end / 60), es: Math.floor(lastSeg.end % 60) 
          });
        } else {
          setFormTime({ sm: 0, ss: 0, em: 0, es: 0 });
        }
      }

      if (actSurahId) {
        const s = surahs.find(x => x.id === actSurahId);
        if (s) {
          let sNo = s.no;
          if (!sNo) {
            const m = Q_SURAHS.find(q => s.title && s.title.toLowerCase().includes(q.name.toLowerCase()));
            if (m) sNo = m.no;
          }
          if (sNo) {
            fetch(`https://equran.id/api/v2/surat/${sNo}`)
              .then(r => r.json())
              .then(d => { if (d && d.data && d.data.jumlahAyat) setMaxAyah(d.data.jumlahAyat); })
              .catch(() => setMaxAyah(286));
          }
        }
      }
    } else if (modal === 'ustadz') {
      const u = modalData ? ustadz.find(x => x.id === modalData) : null;
      setFormVal(u ? u.name : '');
      setFormVal2(u ? u.phone : '');
      setFormVal3(u ? u.username : '');
      setFormVal4(u ? u.password : '');
    } else if (modal === 'halaqoh') {
      const h = modalData ? halaqohs.find(x => x.id === modalData) : null;
      setFormVal(h ? h.name : '');
    } else if (modal === 'siswa') {
      const s = modalData ? siswas.find(x => x.id === modalData) : null;
      setFormVal(s ? s.name : '');
      setFormVal2(s ? s.kelas : '');
    }
  }, [modal, modalData]);

  // Handle Custom Dialog
  if (customDialog.show) {
    return (
      <div className="modal-overlay !flex z-[99999]">
        <div className="bg-white dark:bg-[#0f1915] border border-slate-100 dark:border-[#1a2e26] rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            customDialog.type === 'confirm' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
          }`}>
            <i className={`ph-fill ${customDialog.type === 'confirm' ? 'ph-question' : 'ph-info'} text-3xl`}></i>
          </div>
          <h3 className="text-lg font-bold dark:text-white mb-2">
            {customDialog.type === 'confirm' ? 'Konfirmasi' : 'Informasi'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-300 mb-6 leading-relaxed">{customDialog.message}</p>
          <div className="flex gap-3">
            {customDialog.type === 'confirm' && (
              <button
                type="button"
                onClick={() => setCustomDialog({ show: false, type: 'alert', message: '', onConfirm: null })}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-[#15241e] text-slate-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (customDialog.onConfirm) customDialog.onConfirm();
                setCustomDialog({ show: false, type: 'alert', message: '', onConfirm: null });
              }}
              className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-md transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }



  if (!modal) return null;

  const closeModal = () => {
    setModal(null);
    setModalData(null);
  };

  const handleJumpToMemorized = (seg, sur) => {
    closeModal();
    if (seg && sur) {
      let jId = sur.juzId;
      if (jId === 'null' || jId === 'undefined' || jId === 'NaN' || jId === '') jId = null;
      if (!jId && sur.juz) jId = Array.isArray(sur.juz) ? sur.juz[0] : sur.juz;
      if (!jId) jId = 30;

      setActJuzId(jId);
      setActSurahId(sur.id);
      setActLevelId(seg.levelId);
      setActSegId(seg.id);
      switchView('player');
    }
  };

  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    if (Date.now() < lockoutTime) {
      const remain = Math.ceil((lockoutTime - Date.now()) / 1000);
      setLoginError(`Akses Terkunci! Tunggu ${remain} detik.`);
      return;
    }
    const u = loginUser.trim();
    const p = loginPass.trim();
    if ((u === 'jayyidin' || u === 'jumanjayyidin') && p === 'offthewallba123') {
      setAdminLvl(1);
      closeModal();
      setLoggedInUstadzId(null);
      setFilter(prev => ({ ...prev, u: 'all' }));
      switchView('home');
    } else {
      const ust = ustadz.find(x => x.username === u && x.password === p);
      if (ust) {
        if (ust.status === 'pending') {
          setLoginError('Akun Anda sedang menunggu persetujuan Admin.');
          return;
        }
        setAdminLvl(2);
        closeModal();
        setLoggedInUstadzId(ust.id);
        setFilter(prev => ({ ...prev, u: ust.id }));
        setHierSel(prev => ({ ...prev, u: ust.id }));
        switchView('home');
      } else {
        const nextAtt = loginAttempts + 1;
        setLoginAttempts(nextAtt);
        if (nextAtt >= 3) {
          setLockoutTime(Date.now() + 30000);
          setLoginError('Akun terkunci sementara karena gagal 3 kali berturut-turut.');
        } else {
          setLoginError(`Username atau Password salah! (Sisa percobaan: ${3 - nextAtt})`);
        }
      }
    }
  };

  const handleUstadzRegister = (e) => {
    if (e) e.preventDefault();
    const n = regName.trim();
    const p = regPhone.trim();
    const us = regUser.trim();
    const pw = regPass.trim();
    const pwc = regPassConfirm.trim();

    if (!n || !p || !us || !pw || !pwc) {
      setRegError('Mohon lengkapi semua data pendaftaran!');
      return;
    }
    if (pw !== pwc) {
      setRegError('Konfirmasi password tidak cocok!');
      return;
    }
    if (ustadz.some(u => u.username.toLowerCase() === us.toLowerCase())) {
      setRegError('Username sudah digunakan, silakan pilih yang lain!');
      return;
    }

    const nid = Date.now();
    const nD = { id: nid, name: n, phone: p, username: us, password: pw, status: 'pending' };
    dbSave('ustadz', nid, nD);
    setModal('login');
    setRegError('');
    showAlert('Pendaftaran berhasil! Mohon tunggu persetujuan Admin Utama.');
  };

  return (
    <div className="modal-overlay !flex z-[500] animate-in fade-in duration-200">
      <div className="modal-box !p-0 overflow-hidden relative bg-white dark:bg-[#0f1915] border border-slate-100 dark:border-[#1a2e26] rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-[0.98] slide-in-from-bottom-4 duration-300 ease-out">
        {modal === 'login' && (
          <>
            <div className="p-8 text-center relative border-b border-slate-50 dark:border-[#1a2e26]">
              <button onClick={closeModal} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors">
                <i className="ph-bold ph-x text-xl"></i>
              </button>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/30 shadow-inner">
                <i className="ph-fill ph-lock-key text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold dark:text-white tracking-tight">Selamat Datang</h2>
              <p className="text-xs text-slate-500 mt-1">Silakan masuk untuk mengakses panel penguji.</p>
            </div>
            <form onSubmit={handleAdminLogin} className="p-8">
              {loginError && (
                <div className="mb-6 text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center gap-2 animate-pulse">
                  <i className="ph-bold ph-warning-circle text-lg"></i> {loginError}
                </div>
              )}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <i className="ph-bold ph-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="input-std !pl-11"
                    placeholder="Username"
                    required
                  />
                </div>
                <div className="relative">
                  <i className="ph-bold ph-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="input-std !pl-11 tracking-widest"
                    placeholder="Password"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-std flex items-center justify-center gap-2 shadow-xl">
                <span>Masuk Sekarang</span>
                <i className="ph-bold ph-arrow-right"></i>
              </button>
            </form>
          </>
        )}

        {modal === 'register_ustadz' && (
          <>
            <div className="p-8 text-center relative border-b border-slate-50 dark:border-[#1a2e26]">
              <button onClick={() => setModal('login')} className="absolute left-6 top-6 text-slate-400 hover:text-slate-600 transition-colors">
                <i className="ph-bold ph-arrow-left text-xl"></i>
              </button>
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 dark:bg-blue-900/30 shadow-inner">
                <i className="ph-fill ph-user-plus text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold dark:text-white tracking-tight">Daftar Penguji</h2>
              <p className="text-xs text-slate-500 mt-1">Lengkapi data Anda untuk mendaftar di sistem.</p>
            </div>
            <form onSubmit={handleUstadzRegister} className="p-8 overflow-y-auto max-h-[60vh]">
              {regError && (
                <div className="mb-6 text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 flex items-center gap-2 animate-pulse">
                  <i className="ph-bold ph-warning-circle text-lg"></i> {regError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="input-std" placeholder="Contoh: Ahmad Fauzi" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">No. WhatsApp</label>
                  <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="input-std" placeholder="628123456789" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                  <input type="text" value={regUser} onChange={e => setRegUser(e.target.value)} className="input-std" placeholder="Username untuk Login" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                    <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="input-std" placeholder="******" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Konfirmasi</label>
                    <input type="password" value={regPassConfirm} onChange={e => setRegPassConfirm(e.target.value)} className="input-std" placeholder="******" required />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-std !bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 flex items-center justify-center gap-2 shadow-xl">
                <span>Daftar Sekarang</span>
                <i className="ph-bold ph-check"></i>
              </button>
            </form>
            <div className="p-6 bg-slate-50 dark:bg-[#0a120f] text-center mt-auto border-t border-slate-100 dark:border-[#1a2e26]">
              <button type="button" onClick={() => setModal('login')} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition mx-auto">
                Kembali ke Halaman Login
              </button>
            </div>
          </>
        )}

        {/* Master Data Forms */}
        {modal === 'juz' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Juz</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const nD = { id, name: formVal, isHidden: formVal2 === 'true' };
              dbSave('juzs', id, nD);
              if (!modalData) setActJuzId(id);
              closeModal();
            }}>
              <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std mb-4" placeholder="Nama Juz" />
              
              <label className="flex items-center gap-2 mb-6 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={formVal2 === 'true'} onChange={e => setFormVal2(e.target.checked ? 'true' : 'false')} className="sr-only" />
                  <div className={`w-10 h-5 rounded-full transition-colors ${formVal2 === 'true' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <div className={`absolute left-1 w-3 h-3 bg-white rounded-full transition-transform ${formVal2 === 'true' ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300 select-none group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Sembunyikan tab Juz ini dari murid
                </span>
              </label>

              <button type="submit" className="btn-std w-full">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'surah' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Surah</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              let vid = extractVideoId(formVal2) || formVal2 || '';
              const nD = { id, juzId: modalData ? (surahs.find(x=>x.id===id)?.juzId || actJuzId) : actJuzId, title: formVal, videoId: vid, bgImage: formVal3 };
              if (!modalData) {
                const lid = Date.now() + 1;
                const nL = { id: lid, surahId: id, name: 'Level 1', order: 0 };
                dbSave('levels', lid, nL);
              }
              dbSave('surahs', id, nD);
              closeModal();
            }}>
              <select required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std cursor-pointer mb-4">
                <option value="" disabled>-- Pilih Surah --</option>
                {modalData && <option value={formVal}>{formVal}</option>}
                {Q_SURAHS.map(q => <option key={q.no} value={`Surah ${q.name}`}>Surah {q.name}</option>)}
              </select>
              <input type="text" value={formVal2} onChange={e => setFormVal2(e.target.value)} placeholder="Link YouTube (Opsional)" className="input-std mb-3" />
              <input type="text" value={formVal3} onChange={e => setFormVal3(e.target.value)} placeholder="URL Gambar Background (Opsional)" className="input-std mb-6" />
              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'video' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Ganti Video YouTube</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const sid = actSurahId;
              let vid = extractVideoId(formVal) || formVal;
              if (vid && vid.length >= 10) {
                const o = surahs.find(x => x.id === sid);
                if (o) {
                  o.videoId = vid;
                  dbSave('surahs', sid, o);
                }
                closeModal();
              } else {
                showAlert('Tautan URL YouTube tidak valid!');
              }
            }}>
              <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std mb-6" placeholder="Paste link YouTube di sini..." />
              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'level' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Level</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const oVal = parseInt(formOrder) - 1;
              const lvlsForM = levels.filter(x => x.surahId === actSurahId).sort((a, b) => (a.order || 0) - (b.order || 0));
              const isHiddenVal = isSuper ? formVal2 === 'true' : false;
              if (modalData) {
                const o = levels.find(x => x.id === id);
                if (o) {
                  o.name = formVal;
                  if (isSuper) {
                    o.isHidden = isHiddenVal;
                  }
                  const oldIdx = lvlsForM.findIndex(x => x.id === id);
                  if (oVal !== oldIdx && oldIdx !== -1) {
                    lvlsForM.splice(oldIdx, 1);
                    lvlsForM.splice(oVal, 0, o);
                    lvlsForM.forEach((lvl, idx) => {
                      const al = levels.find(x => x.id === lvl.id);
                      if (al) { al.order = idx; dbSave('levels', al.id, al); }
                    });
                  } else {
                    dbSave('levels', id, o);
                  }
                }
              } else {
                const nD = {
                  id,
                  surahId: actSurahId,
                  name: formVal,
                  order: oVal,
                  ...(isSuper && isHiddenVal ? { isHidden: true } : {})
                };
                lvlsForM.splice(oVal, 0, nD);
                lvlsForM.forEach((lvl, idx) => {
                  const al = lvl.id === id ? nD : levels.find(x => x.id === lvl.id);
                  if (al) { al.order = idx; dbSave('levels', al.id, al); }
                });
              }
              closeModal();
            }}>
              <div className="flex gap-3 mb-4">
                <div className="w-20">
                  <label className="block text-[10px] text-emerald-600 font-bold mb-1">URUTAN</label>
                  <input type="number" min="1" value={formOrder} onChange={e => setFormOrder(e.target.value)} className="input-std text-center" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-emerald-600 font-bold mb-1">NAMA LEVEL</label>
                  <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std" placeholder="Contoh: Level 2..." />
                </div>
              </div>

              {isSuper && (
                <label className="flex items-center gap-2 mb-6 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={formVal2 === 'true'}
                      onChange={e => setFormVal2(e.target.checked ? 'true' : 'false')}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${formVal2 === 'true' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                    <div className={`absolute left-1 w-3 h-3 bg-white rounded-full transition-transform ${formVal2 === 'true' ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300 select-none group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Sembunyikan level ini dari murid
                  </span>
                </label>
              )}

              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'segment' && (
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Ayat</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const st = (parseInt(formTime.sm) || 0) * 60 + (parseInt(formTime.ss) || 0);
              const et = (parseInt(formTime.em) || 0) * 60 + (parseInt(formTime.es) || 0);
              const oVal = parseInt(formOrder) - 1;
              const curSgsForModal = segs.filter(x => x.surahId === actSurahId && (!actLevelId || x.levelId === actLevelId)).sort((a, b) => (a.order || 0) - (b.order || 0));

              let autoTitle = parseInt(formAyahStart) === parseInt(formAyahEnd) ? `Ayat ${formAyahStart}` : `Ayat ${formAyahStart}-${formAyahEnd}`;
              if (formVal && formVal.trim() !== '') {
                autoTitle = `${autoTitle} ${formVal.trim()}`;
              }

              if (modalData) {
                const o = segs.find(x => x.id === id);
                if (o) {
                  o.title = autoTitle; o.arabic = formVal2; o.translation = formVal3;
                  o.start = st; o.end = et; o.levelId = actLevelId;
                  const oldIdx = curSgsForModal.findIndex(x => x.id === id);
                  if (oVal !== oldIdx && oldIdx !== -1) {
                    curSgsForModal.splice(oldIdx, 1);
                    curSgsForModal.splice(oVal, 0, o);
                    curSgsForModal.forEach((seg, idx) => {
                      const asg = segs.find(x => x.id === seg.id);
                      if (asg) { asg.order = idx; dbSave('segs', asg.id, asg); }
                    });
                  } else {
                    dbSave('segs', id, o);
                  }
                }
              } else {
                const nD = { id, surahId: actSurahId, levelId: actLevelId, title: autoTitle, arabic: formVal2, translation: formVal3, start: st, end: et, order: oVal };
                curSgsForModal.splice(oVal, 0, nD);
                curSgsForModal.forEach((seg, idx) => {
                  const asg = seg.id === id ? nD : segs.find(x => x.id === seg.id);
                  if (asg) { asg.order = idx; dbSave('segs', asg.id, asg); }
                });
              }
              closeModal();
            }}>
              <div className="grid grid-cols-12 gap-3 mb-4">
                <div className="col-span-3">
                  <label className="block text-[10px] text-emerald-600 font-bold mb-1">URUTAN</label>
                  <input type="number" min="1" required value={formOrder} onChange={e => setFormOrder(e.target.value)} className="input-std text-center font-bold text-emerald-600" />
                </div>
                <div className="col-span-9">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-[10px] text-emerald-600 font-bold">PILIH AYAT</label>
                    <button 
                      type="button" 
                      onClick={fetchQuranData}
                      disabled={isFetchingQuran}
                      className="text-[9px] font-bold text-blue-500 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <i className={`ph-bold ph-arrows-clockwise ${isFetchingQuran ? 'animate-spin' : ''}`}></i>
                      {isFetchingQuran ? 'Memuat...' : 'Tarik Otomatis'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 text-[10px] font-bold pointer-events-none transition-colors">Ayat</span>
                      <input
                        type="number"
                        min="1"
                        max={maxAyah}
                        value={formAyahStart}
                        onChange={e => {
                          const v = parseInt(e.target.value) || '';
                          setFormAyahStart(v);
                          if (v && formAyahEnd && v > formAyahEnd) setFormAyahEnd(v);
                        }}
                        onBlur={() => {
                          if (!formAyahStart || formAyahStart < 1) setFormAyahStart(1);
                          if (formAyahStart > maxAyah) setFormAyahStart(maxAyah);
                        }}
                        className="input-std w-full pl-11 pr-2 py-2 text-sm font-bold bg-white dark:bg-[#0a120f] transition-all"
                      />
                    </div>
                    <span className="text-slate-400 font-bold">-</span>
                    <div className="flex-1 relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 text-[10px] font-bold pointer-events-none transition-colors">Ayat</span>
                      <input
                        type="number"
                        min="1"
                        max={maxAyah}
                        value={formAyahEnd}
                        onChange={e => {
                          const v = parseInt(e.target.value) || '';
                          setFormAyahEnd(v);
                          if (v && formAyahStart && v < formAyahStart) setFormAyahStart(v);
                        }}
                        onBlur={() => {
                          if (!formAyahEnd || formAyahEnd < 1) setFormAyahEnd(1);
                          if (formAyahEnd > maxAyah) setFormAyahEnd(maxAyah);
                        }}
                        className="input-std w-full pl-11 pr-2 py-2 text-sm font-bold bg-white dark:bg-[#0a120f] transition-all"
                      />
                    </div>
                  </div>
                  <div className="mt-2 relative group">
                    <input
                      type="text"
                      value={formVal}
                      onChange={e => setFormVal(e.target.value)}
                      placeholder="Ket. Tambahan Judul (Contoh: Bagian 1)"
                      className="input-std w-full px-3 py-2 text-sm bg-white dark:bg-[#0a120f] transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] text-slate-500 font-bold mb-1">TEKS ARAB</label>
                <textarea rows="3" dir="rtl" value={formVal2} onChange={e => setFormVal2(e.target.value)} className="input-std font-arabic text-xl"></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] text-slate-500 font-bold mb-1">TERJEMAH</label>
                <textarea rows="2" value={formVal3} onChange={e => setFormVal3(e.target.value)} className="input-std text-xs md:text-sm"></textarea>
              </div>
              <div className="flex flex-col items-center mb-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  Waktu Video: {formatVideoTime(currentVideoTime)}
                </div>
                <div className="flex justify-center gap-2 w-full mb-2">
                  <button type="button" onClick={() => {
                    const p = showMiniVideo ? miniPlayerRef.current : window.tahfidzPlayer;
                    if (p && typeof p.getCurrentTime === 'function' && typeof p.seekTo === 'function') {
                      p.seekTo(p.getCurrentTime() - 2, true);
                    }
                  }} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1 shadow-sm border border-slate-200 dark:border-slate-700" title="Mundur 2 detik">
                    <i className="ph-bold ph-rewind"></i> -2d
                  </button>
                  <button type="button" onClick={() => {
                    if (!showMiniVideo) {
                      if (window.tahfidzPlayer && typeof window.tahfidzPlayer.getPlayerState === 'function') {
                        const state = window.tahfidzPlayer.getPlayerState();
                        if (state === 1) window.tahfidzPlayer.pauseVideo();
                        else window.tahfidzPlayer.playVideo();
                      }
                    } else {
                      if (miniPlayerRef.current && typeof miniPlayerRef.current.getPlayerState === 'function') {
                        const state = miniPlayerRef.current.getPlayerState();
                        if (state === 1) miniPlayerRef.current.pauseVideo();
                        else miniPlayerRef.current.playVideo();
                      }
                    }
                  }} className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700">
                    <i className="ph-fill ph-play-pause text-emerald-500"></i> Putar / Jeda
                  </button>
                  <button type="button" onClick={() => {
                    const p = showMiniVideo ? miniPlayerRef.current : window.tahfidzPlayer;
                    if (p && typeof p.getCurrentTime === 'function' && typeof p.seekTo === 'function') {
                      p.seekTo(p.getCurrentTime() + 2, true);
                    }
                  }} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1 shadow-sm border border-slate-200 dark:border-slate-700" title="Maju 2 detik">
                    +2d <i className="ph-bold ph-fast-forward"></i>
                  </button>
                </div>
                <div className="flex justify-center w-full">
                  <button type="button" onClick={() => setShowMiniVideo(!showMiniVideo)} className={`w-full text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-2 shadow-sm border ${showMiniVideo ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'}`}>
                    <i className={`ph-fill ${showMiniVideo ? 'ph-x' : 'ph-video-camera'}`}></i> {showMiniVideo ? 'Tutup Video' : 'Tampilkan Video Mini'}
                  </button>
                </div>
                {showMiniVideo && (
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative mt-3 animate-in fade-in zoom-in-95">
                    <div id="mini-yt-player" className="w-full h-full"></div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="relative border border-slate-200 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-slate-500 font-bold">MULAI (M:D)</label>
                    <button type="button" onClick={() => {
                      let ct = 0;
                      if (showMiniVideo && miniPlayerRef.current && typeof miniPlayerRef.current.getCurrentTime === 'function') {
                        ct = miniPlayerRef.current.getCurrentTime();
                      } else if (window.tahfidzPlayer && typeof window.tahfidzPlayer.getCurrentTime === 'function') {
                        ct = window.tahfidzPlayer.getCurrentTime();
                      }
                      setFormTime(prev => ({ ...prev, sm: Math.floor(ct / 60), ss: Math.floor(ct % 60) }));
                    }} className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-lg transition">
                      <i className="ph-bold ph-crosshair"></i> Ambil
                    </button>
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <input type="number" value={formTime.sm} onChange={e => setFormTime({ ...formTime, sm: e.target.value })} className="input-std !w-14 !p-1.5 text-center font-bold text-slate-700" />
                    <span className="font-bold text-slate-400">:</span>
                    <input type="number" value={formTime.ss} onChange={e => setFormTime({ ...formTime, ss: e.target.value })} className="input-std !w-14 !p-1.5 text-center font-bold text-slate-700" />
                  </div>
                </div>
                <div className="relative border border-slate-200 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-slate-500 font-bold">SELESAI (M:D)</label>
                    <button type="button" onClick={() => {
                      let ct = 0;
                      if (showMiniVideo && miniPlayerRef.current && typeof miniPlayerRef.current.getCurrentTime === 'function') {
                        ct = miniPlayerRef.current.getCurrentTime();
                      } else if (window.tahfidzPlayer && typeof window.tahfidzPlayer.getCurrentTime === 'function') {
                        ct = window.tahfidzPlayer.getCurrentTime();
                      }
                      setFormTime(prev => ({ ...prev, em: Math.floor(ct / 60), es: Math.floor(ct % 60) }));
                    }} className="text-[10px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded-lg transition">
                      <i className="ph-bold ph-crosshair"></i> Ambil
                    </button>
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <input type="number" value={formTime.em} onChange={e => setFormTime({ ...formTime, em: e.target.value })} className="input-std !w-14 !p-1.5 text-center font-bold text-slate-700" />
                    <span className="font-bold text-slate-400">:</span>
                    <input type="number" value={formTime.es} onChange={e => setFormTime({ ...formTime, es: e.target.value })} className="input-std !w-14 !p-1.5 text-center font-bold text-slate-700" />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-std w-full">Simpan Segmen</button>
            </form>
          </div>
        )}

        {modal === 'ustadz' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Ustadz/ah</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const nD = { id, name: formVal, phone: formVal2, username: formVal3, password: formVal4, status: 'approved' };
              dbSave('ustadz', id, nD);
              closeModal();
            }}>
              <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std mb-3" placeholder="Nama Lengkap" />
              <input type="text" value={formVal2} onChange={e => setFormVal2(e.target.value)} className="input-std mb-3" placeholder="No. WhatsApp (628...)" />
              <input type="text" required value={formVal3} onChange={e => setFormVal3(e.target.value)} className="input-std mb-3" placeholder="Username Login" />
              <input type="text" required value={formVal4} onChange={e => setFormVal4(e.target.value)} className="input-std mb-6" placeholder="Password Login" />
              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'halaqoh' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Halaqoh</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const nD = { id, ustadzId: modalData ? (halaqohs.find(x=>x.id===id)?.ustadzId || hierSel.u) : hierSel.u, name: formVal };
              dbSave('halaqohs', id, nD);
              closeModal();
            }}>
              <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std mb-6" placeholder="Nama Halaqoh" />
              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}

        {modal === 'siswa' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{modalData ? 'Edit' : 'Tambah'} Siswa</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="ph ph-x text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = modalData || Date.now();
              const nD = { id, halaqohId: modalData ? (siswas.find(x=>x.id===id)?.halaqohId || hierSel.h) : hierSel.h, name: formVal, kelas: formVal2 };
              dbSave('siswas', id, nD);
              closeModal();
            }}>
              <input type="text" required value={formVal} onChange={e => setFormVal(e.target.value)} className="input-std mb-3" placeholder="Nama Lengkap Siswa" />
              <input type="text" required value={formVal2} onChange={e => setFormVal2(e.target.value)} className="input-std mb-6" placeholder="Kelas (Contoh: 1-A / 7-B)" />
              <button type="submit" className="btn-std">Simpan</button>
            </form>
          </div>
        )}


        {modal === 'memorized_collection' && (
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-[#1a2e26] flex justify-between items-center bg-slate-50/50 dark:bg-[#0a120f]/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl flex items-center justify-center">
                  <i className="ph-fill ph-check-circle text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Koleksi Hafalan</h2>
                  <p className="text-[10px] text-slate-500 font-medium">{modalData?.length || 0} bagian telah diselesaikan</p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1a2e26] transition-colors"><i className="ph-bold ph-x text-lg"></i></button>
            </div>
            <div className="overflow-y-auto p-4 flex-1 hide-scrollbar">
              {modalData && modalData.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {modalData.map(({ seg, sur }) => (
                    <div 
                      key={seg.id}
                      onClick={() => handleJumpToMemorized(seg, sur)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#15241e] border border-slate-100 dark:border-[#1a2e26] cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col flex-1 min-w-0 pr-3">
                        <h3 className="text-[13px] md:text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">{sur.title.replace(/^\d+\.\s*/, '')}</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 truncate mt-0.5">{seg.title}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 transition-all shrink-0">
                        <i className="ph-bold ph-play text-[10px] ml-0.5"></i>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <i className="ph-fill ph-ghost text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
                  <p className="text-sm">Belum ada hafalan yang diselesaikan.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

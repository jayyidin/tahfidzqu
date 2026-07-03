import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fmtT } from '../../utils/helpers';
import { dbSave, uploadAudioToFirebase } from '../../services/firebase';

export const SetoranView = () => {
  const {
    actSurahId, actSegId,
    surahs, segs, ustadz, halaqohs, siswas,
    hierSel, setHierSel,
    adminLvl, loggedInUstadzId,
    switchView, showAlert
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const surah = surahs.find(s => s.id === actSurahId);
  const seg = segs.find(s => s.id === actSegId);

  useEffect(() => {
    if (adminLvl === 2 && loggedInUstadzId) {
      setHierSel(prev => ({ ...prev, u: loggedInUstadzId }));
    }
  }, [adminLvl, loggedInUstadzId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const uList = adminLvl === 2 ? ustadz.filter(x => x.id == loggedInUstadzId) : ustadz;
  const hList = halaqohs.filter(h => h.ustadzId == hierSel.u);
  const sList = siswas.filter(s => s.halaqohId == hierSel.h);

  const startRecord = async () => {
    if (!hierSel.s) {
      showAlert('Pilih identitas siswa terlebih dahulu!');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setAudioUrl(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecSecs(0);

      timerRef.current = setInterval(() => {
        setRecSecs(prev => prev + 1);
      }, 1000);
    } catch (err) {
      showAlert('Gagal mengakses mikrofon! Pastikan izin mikrofon diaktifkan pada browser Anda.');
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      showAlert('Ukuran file terlalu besar! Maksimal 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAudioUrl(ev.target.result);
      setRecSecs(30); // estimated duration or default
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!audioUrl) {
      showAlert('Rekaman audio belum tersedia!');
      return;
    }
    if (!hierSel.s || !hierSel.u || !hierSel.h) {
      showAlert('Mohon lengkapi identitas siswa!');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrl = await uploadAudioToFirebase(audioUrl, 'stu_' + hierSel.s);
      const subId = Date.now();
      const nowStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

      const newSub = {
        id: subId,
        siswaId: Number(hierSel.s),
        halaqohId: Number(hierSel.h),
        ustadzId: Number(hierSel.u),
        surahId: actSurahId,
        segmentId: actSegId,
        audioUrl: uploadedUrl,
        duration: recSecs,
        date: nowStr,
        status: 'pending'
      };

      await dbSave('subs', subId, newSub);
      setIsSubmitting(false);
      showAlert('Alhamdulillah! Setoran hafalan berhasil dikirim. Mohon tunggu pemeriksaan dari Ustadz/ah.');
      switchView('player');
    } catch (err) {
      setIsSubmitting(false);
      showAlert('Gagal mengirim setoran. Periksa koneksi internet Anda.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-y-auto md:overflow-hidden bg-slate-50 dark:bg-[#0a120f]">
      {/* Left Column: Identitas Penyetor */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200/60 dark:border-[#1a2e26] shadow-sm relative z-10">
        <div className="p-6 border-b border-slate-200/60 dark:border-[#1a2e26] shrink-0 bg-white/50 dark:bg-[#111c18]/50 backdrop-blur-sm sticky top-0 z-20 flex items-center gap-4">
          <button
            onClick={() => switchView('player')}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] text-slate-500 hover:text-emerald-600 hover:border-emerald-300 flex items-center justify-center transition-all shadow-sm active:scale-95"
          >
            <i className="ph-bold ph-arrow-left text-lg"></i>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">Setor Hafalan</h2>
            <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1.5">
              <i className="ph-fill ph-book-open text-emerald-500"></i> {surah?.title || '-'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-8">
          <div className="max-w-xl mx-auto flex flex-col gap-6 md:gap-8">
            {/* Segment info */}
            <div className="bg-white dark:bg-[#15241e] rounded-3xl p-5 md:p-6 border border-slate-100 dark:border-[#1a2e26] shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/5 rounded-bl-[3rem] -mr-6 -mt-6 transition-transform group-hover:scale-110 pointer-events-none"></div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-widest shadow-sm">
                  {surah?.title || '-'}
                </span>
              </div>
              <h3 className="text-base md:text-xl font-bold dark:text-white leading-tight mb-2 relative z-10 pr-6">
                {seg?.title || '-'}
              </h3>
              <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-2 font-medium bg-slate-50 dark:bg-[#0a120f] px-3 py-2 rounded-xl inline-flex relative z-10 border border-slate-100 dark:border-[#1a2e26]">
                <i className="ph-fill ph-clock text-emerald-500 text-sm"></i> Durasi Ayat: {fmtT(seg?.start || 0)} - {fmtT(seg?.end || 0)}
              </div>
            </div>

            {/* Identitas Form */}
            <div className="bg-white dark:bg-[#15241e] rounded-3xl p-5 md:p-6 border border-slate-100 dark:border-[#1a2e26] shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#1a2e26] pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-identification-card text-xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Identitas Penyetor</h3>
                  <p className="text-[10px] text-slate-500">Pilih Ustadz, Halaqoh, dan Siswa</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest flex items-center gap-1.5">
                      Ustadz/ah
                    </label>
                    <select
                      value={hierSel.u || ''}
                      onChange={(e) => setHierSel({ u: e.target.value ? Number(e.target.value) : null, h: null, s: null })}
                      disabled={adminLvl === 2}
                      className="input-std truncate !bg-white dark:!bg-[#0a120f] cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Ustadz/ah --</option>
                      {uList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  {hierSel.u && (
                    <div className="min-w-0 animate-in fade-in zoom-in-95 duration-300">
                      <label className="block text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest flex items-center gap-1.5">
                        Halaqoh
                      </label>
                      <select
                        value={hierSel.h || ''}
                        onChange={(e) => setHierSel(prev => ({ ...prev, h: e.target.value ? Number(e.target.value) : null, s: null }))}
                        className="input-std truncate !bg-white dark:!bg-[#0a120f] cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Halaqoh --</option>
                        {hList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {hierSel.h && (
                  <div className="min-w-0 animate-in fade-in zoom-in-95 duration-300">
                    <label className="block text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest flex items-center gap-1.5">
                      Siswa
                    </label>
                    <select
                      value={hierSel.s || ''}
                      onChange={(e) => setHierSel(prev => ({ ...prev, s: e.target.value ? Number(e.target.value) : null }))}
                      className="input-std truncate !bg-white dark:!bg-[#0a120f] cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Siswa --</option>
                      {sList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.kelas})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Audio Recorder */}
      <div className="w-full md:w-[360px] lg:w-[420px] p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center bg-white dark:bg-[#15241e] shrink-0">
        <div className="text-center w-full max-w-[300px]">
          <div className="inline-flex p-4 bg-slate-50 text-slate-400 rounded-full mb-6 dark:bg-[#0a120f] shadow-inner">
            <i className="ph-fill ph-microphone-stage text-4xl"></i>
          </div>
          <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-2 truncate">Rekam Audio</h3>
          <p className="text-xs text-slate-500 mb-8 leading-relaxed line-clamp-3">
            Ketuk tombol di bawah untuk mulai merekam setoran hafalan siswa.
          </p>

          <div className="relative w-28 h-28 md:w-32 md:h-32 mx-auto mb-6">
            {isRecording && <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping pointer-events-none"></div>}
            <button
              type="button"
              onClick={() => {
                if (!isRecording) startRecord();
                else stopRecord();
              }}
              className={`relative w-full h-full text-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                  : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/40 hover:-translate-y-1 hover:shadow-2xl'
              }`}
            >
              <i className={`ph-fill ${isRecording ? 'ph-stop' : 'ph-microphone'} text-5xl md:text-6xl`}></i>
            </button>
          </div>

          <div className="text-lg md:text-2xl font-mono text-slate-700 dark:text-gray-200 font-bold tracking-widest mb-6">
            {fmtT(recSecs)}
          </div>

          {audioUrl && !isRecording && (
            <div className="flex gap-3 animate-in fade-in duration-300">
              <button
                type="button"
                onClick={() => { setAudioUrl(null); setRecSecs(0); }}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-slate-100 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors dark:bg-[#0a120f]"
              >
                Ulangi
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="ph-bold ph-spinner animate-spin text-lg"></i> Mengirim...
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-paper-plane-tilt text-lg"></i> Kirim
                  </>
                )}
              </button>
            </div>
          )}

          {!audioUrl && !isRecording && (
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-[#1a2e26] relative">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#15241e] px-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Atau
              </span>
              <input type="file" id="au-up" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              <button
                type="button"
                onClick={() => {
                  if (!hierSel.s) showAlert('Pilih identitas siswa terlebih dahulu!');
                  else document.getElementById('au-up').click();
                }}
                className="w-full py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all dark:bg-[#0a120f] dark:border-[#1a2e26] dark:text-gray-400 text-[11px] uppercase tracking-widest shadow-sm"
              >
                <i className="ph-bold ph-upload-simple text-base"></i> Upload Audio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

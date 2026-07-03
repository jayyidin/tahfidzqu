import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { dbSave, uploadAudioToFirebase } from '../../services/firebase';
import { AudioPlayer } from './AudioPlayer';

export const GradeModal = () => {
  const {
    modal, setModal,
    modalData,
    subs, surahs, segs, siswas,
    showAlert
  } = useApp();

  const sb = subs.find(x => x.id === modalData);
  const stu = siswas.find(s => s.id === sb?.siswaId);
  const sur = surahs.find(s => s.id === sb?.surahId);
  const seg = segs.find(s => s.id === sb?.segmentId);

  const [selectedGrade, setSelectedGrade] = useState(sb?.status === 'pending' ? null : (sb?.grade || null));
  const [gradingNote, setGradingNote] = useState(sb?.note || '');
  const [voiceUrl, setVoiceUrl] = useState(sb?.voiceNote || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  if (modal !== 'grade' || !sb) return null;

  // Previous failed submissions
  const prevSubs = subs.filter(x => x.siswaId === sb.siswaId && x.segmentId === sb.segmentId && x.status === 'need-repeat' && x.id < sb.id).sort((a, b) => b.id - a.id);

  const startRecord = async () => {
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
          setVoiceUrl(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(prev => prev + 1), 1000);
    } catch (err) {
      showAlert('Gagal mengakses mikrofon.');
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleSubmit = async (statusType) => {
    if (statusType === 'graded' && !selectedGrade) {
      showAlert('Pilih nilai kelulusan terlebih dahulu!');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalVoiceUrl = voiceUrl;
      if (voiceUrl && voiceUrl.startsWith('data:')) {
        finalVoiceUrl = await uploadAudioToFirebase(voiceUrl, 'ust_note_' + sb.id);
      }

      const updatedSb = {
        ...sb,
        status: statusType,
        grade: statusType === 'graded' ? selectedGrade : null,
        note: gradingNote.trim(),
        voiceNote: finalVoiceUrl || null
      };

      await dbSave('subs', sb.id, updatedSb);
      setIsSubmitting(false);
      setModal(null);
      showAlert(statusType === 'graded' ? 'Alhamdulillah! Penilaian berhasil disimpan.' : 'Setoran ditandai untuk diulang.');
    } catch (err) {
      setIsSubmitting(false);
      showAlert('Gagal menyimpan penilaian.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-100 dark:border-[#1a2e26] bg-slate-50 dark:bg-[#0a120f] flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0">
              <i className="ph-fill ph-star text-xl md:text-2xl"></i>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold dark:text-white leading-tight">Beri Nilai Hafalan</h2>
              <p className="text-[10px] md:text-xs text-emerald-600 font-bold">{stu?.name || '-'} (Kelas {stu?.kelas || '-'})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal(null)}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >
            <i className="ph-bold ph-x text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="bg-white dark:bg-[#111c18] border border-slate-100 dark:border-[#1a2e26] rounded-2xl p-4 md:p-5 shadow-sm mb-6">
            <h3 className="text-sm md:text-base font-bold text-slate-700 dark:text-gray-200 mb-1.5">{sur?.title || '-'}</h3>
            <p className="text-[10px] md:text-xs text-slate-500 mb-4">{seg?.title || '-'}</p>
            <label className="block text-[10px] md:text-[11px] text-slate-500 font-bold mb-1.5">Rekaman Hafalan Siswa:</label>
            <div className="mb-2">
              <AudioPlayer id={`grade_stu_${sb.id}`} url={sb.audioUrl} duration={sb.duration || 0} isUstadz={false} />
            </div>

            {prevSubs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1a2e26]">
                <label className="block text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <i className="ph-fill ph-clock-counter-clockwise text-red-500 text-sm"></i> Riwayat Gagal Sebelumnya
                </label>
                <div className="flex flex-col gap-3">
                  {prevSubs.map((ps, idx) => (
                    <div key={ps.id} className="bg-slate-50 dark:bg-[#0a120f] border border-slate-100 dark:border-[#1a2e26] rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-red-500">Percobaan ke-{prevSubs.length - idx}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{ps.date}</span>
                      </div>
                      <div className="mb-2">
                        <AudioPlayer id={`grade_prev_${ps.id}`} url={ps.audioUrl} duration={ps.duration || 0} isUstadz={false} />
                      </div>
                      {ps.note && <p className="text-[10px] text-slate-600 dark:text-gray-300 italic mt-1">&quot;{ps.note}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="block text-[10px] md:text-[11px] text-emerald-600 font-bold uppercase tracking-widest mb-2">
            Pilih Nilai Kelulusan:
          </label>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {['A', 'B+', 'B', 'B-'].map(g => {
              const isSel = selectedGrade === g;
              const btnCls = isSel
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 -translate-y-1'
                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-500 hover:text-white dark:bg-[#0a120f] dark:border-[#1a2e26] dark:text-gray-300';
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGrade(g)}
                  className={`w-full h-12 rounded-xl font-bold text-lg transition-all shadow-sm ${btnCls}`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <label className="block text-[10px] md:text-[11px] text-emerald-600 font-bold uppercase tracking-widest mb-2">
              Catatan Penguji:
            </label>
            <textarea
              value={gradingNote}
              onChange={(e) => setGradingNote(e.target.value)}
              className="input-std min-h-[80px] mb-3 !text-xs"
              placeholder="Tambahkan catatan tertulis (opsional)..."
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { if (!isRecording) startRecord(); else stopRecord(); }}
                className={`w-11 h-11 rounded-full text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 ${
                  isRecording ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' : 'bg-slate-100 dark:bg-[#0a120f] text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-[#1a2e26]'
                }`}
                title={isRecording ? 'Hentikan Rekaman' : 'Rekam Suara'}
              >
                <i className={`ph-fill ${isRecording ? 'ph-stop' : 'ph-microphone'} text-lg`}></i>
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {voiceUrl ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <AudioPlayer id="grade_modal_voice" url={voiceUrl} duration={recSecs || 0} isUstadz={true} />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setVoiceUrl(null); setRecSecs(0); }}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
                    >
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {isRecording ? `Merekam... (${recSecs}s)` : 'Ketuk ikon mikrofon untuk merekam catatan suara'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmit('need-repeat')}
              disabled={isSubmitting}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 flex-1 active:scale-95"
            >
              <i className="ph-bold ph-arrow-counter-clockwise text-base"></i> Diulang
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('graded')}
              disabled={isSubmitting || !selectedGrade}
              className={`px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 flex-[2] active:scale-95 ${
                !selectedGrade
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-[#0a120f] dark:text-gray-600'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin text-base"></i> Menyimpan...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-check text-base"></i> Kirim Nilai
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1a2e26] bg-slate-50 dark:bg-[#0a120f] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => setModal(null)}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-colors dark:bg-[#15241e] dark:text-gray-300"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

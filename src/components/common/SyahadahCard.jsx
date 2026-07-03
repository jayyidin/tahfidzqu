import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { domToPng } from 'modern-screenshot';

export const SyahadahCard = ({ sub, onClose }) => {
  const { schLogo, schSub, siswas, surahs, segs, halaqohs, ustadz, showAlert } = useApp();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!sub) return null;

  const siswa = siswas.find(s => s.id == sub.siswaId) || { name: '-', kelas: '-' };
  const surah = surahs.find(s => s.id == sub.surahId) || { title: '-' };
  const seg = segs.find(s => s.id == sub.segmentId) || { title: '-' };
  const halaqoh = halaqohs.find(h => h.id == sub.halaqohId) || { name: '-' };
  const ust = ustadz.find(u => u.id == sub.ustadzId) || { name: '-' };

  const simulateScreenshot = () => {
    const f = document.createElement('div');
    f.style.position = 'fixed';
    f.style.top = '0'; f.style.left = '0';
    f.style.width = '100vw'; f.style.height = '100vh';
    f.style.backgroundColor = '#ffffff';
    f.style.zIndex = '999999';
    f.style.opacity = '0.9';
    f.style.transition = 'opacity 0.4s ease-out';
    document.body.appendChild(f);

    try {
      const a = new Audio('https://actions.google.com/sounds/v1/ui/camera_shutter.ogg');
      a.volume = 0.5;
      a.play().catch(() => {});
    } catch (err) {}

    setTimeout(() => { f.style.opacity = '0'; }, 50);
    setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 500);
  };

  const handleDownload = () => {
    const node = document.getElementById('achievement-card-node');
    if (!node) return;
    setIsDownloading(true);
    simulateScreenshot();

    document.fonts.ready.then(() => {
      setTimeout(() => {
        domToPng(node, { scale: 3, backgroundColor: null })
          .then(dataUrl => {
            const link = document.createElement('a');
            link.download = `Syahadah_${siswa.name.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
            setIsDownloading(false);
          })
          .catch(error => {
            showAlert('Gagal screenshot kartu. ' + error);
            setIsDownloading(false);
          });
      }, 300);
    });
  };

  const handleShare = () => {
    const node = document.getElementById('achievement-card-node');
    if (!node) return;
    setIsSharing(true);
    simulateScreenshot();

    document.fonts.ready.then(() => {
      setTimeout(() => {
        domToPng(node, { scale: 3, backgroundColor: null })
          .then(async dataUrl => {
            try {
              const blob = await (await fetch(dataUrl)).blob();
              const file = new File([blob], `Syahadah_${siswa.name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: 'Syahadah Tahfidz',
                  text: `Alhamdulillah, ${siswa.name} telah menyelesaikan hafalan ${surah.title}!`,
                  files: [file]
                });
              } else {
                showAlert('Perangkat ini tidak mendukung fitur Share gambar langsung. Silakan Download gambarnya terlebih dahulu.');
              }
            } catch (e) {
              if (e && e.name !== 'AbortError') {
                showAlert('Gagal membagikan kartu. Coba gunakan fitur Download.');
              }
            }
            setIsSharing(false);
          })
          .catch(error => {
            showAlert('Gagal memproses kartu. ' + error);
            setIsSharing(false);
          });
      }, 300);
    });
  };

  return (
    <div className="modal-overlay">
      <div className="bg-white dark:bg-[#0f1915] border border-slate-100 dark:border-[#1a2e26] rounded-[2rem] w-full max-w-lg p-6 md:p-8 shadow-2xl relative transition-all max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-[#15241e] text-slate-500 hover:text-red-500 flex items-center justify-center transition"
        >
          <i className="ph-bold ph-x text-lg"></i>
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Syahadah Hafalan</h3>
          <p className="text-xs text-slate-400">Pencapaian setoran hafalan siswa</p>
        </div>

        {/* Card Node to be screenshot */}
        <div
          id="achievement-card-node"
          className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden my-4 border-4 border-white/20"
        >
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              {schLogo ? (
                <img src={schLogo} alt="Logo" className="h-10 max-w-[100px] object-contain bg-white/90 p-1 rounded-xl" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <i className="ph-fill ph-monitor-play text-2xl"></i>
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-base tracking-tight leading-tight">TahfidzQu</h4>
                <p className="text-[9px] text-emerald-100 uppercase tracking-widest font-bold">{schSub}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Syahadah</span>
            </div>
          </div>

          <div className="text-center my-6 relative z-10">
            <p className="text-xs text-emerald-100 uppercase tracking-widest font-semibold mb-1">Diberikan Kepada:</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1 drop-shadow-md">{siswa.name}</h2>
            <p className="text-xs text-emerald-100 font-medium">Kelas {siswa.kelas} • Halaqoh {halaqoh.name}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 my-6 border border-white/15 relative z-10">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="border-r border-white/10 pr-2">
                <span className="text-[10px] text-emerald-100 uppercase block font-medium">Surah / Hafalan</span>
                <span className="text-sm md:text-base font-bold text-white block mt-0.5">{surah.title}</span>
                <span className="text-[11px] text-emerald-200 font-medium">{seg.title}</span>
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-emerald-100 uppercase block font-medium">Predikat Nilai</span>
                <span className="text-lg md:text-xl font-extrabold text-yellow-300 block mt-0.5 drop-shadow">{sub.grade || 'Lulus'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-100 pt-2 border-t border-white/15 relative z-10">
            <div>
              <span className="block text-[9px] uppercase text-emerald-200 font-semibold">Pembimbing</span>
              <span className="font-bold text-white">{ust.name}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] uppercase text-emerald-200 font-semibold">Tanggal Setoran</span>
              <span className="font-bold text-white">{sub.date || new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-std flex-1 flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <i className="ph-bold ph-spinner animate-spin text-lg"></i> Menyimpan...
              </>
            ) : (
              <>
                <i className="ph-bold ph-download text-lg"></i> Download Kartu
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="flex-1 py-3.5 bg-slate-100 dark:bg-[#15241e] text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#1a2e26] transition flex items-center justify-center gap-2"
          >
            {isSharing ? (
              <>
                <i className="ph-bold ph-spinner animate-spin text-lg"></i> Membagikan...
              </>
            ) : (
              <>
                <i className="ph-bold ph-share-network text-lg"></i> Bagikan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

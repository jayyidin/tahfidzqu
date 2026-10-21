import React, { useState, useEffect } from 'react';

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Cek jika sudah diinstal
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // Deteksi iOS
    const ua = window.navigator.userAgent || window.navigator.vendor || window.opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIos(isIOSDevice);

    if (isStandalone) {
      return; // Sudah diinstal
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Jika iOS dan belum standalone, tampilkan instruksi
    if (isIOSDevice && !isStandalone) {
      const hasDismissed = localStorage.getItem('tahfidzqu_dismiss_install');
      if (!hasDismissed) {
        setShow(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    if (isIos) {
      localStorage.setItem('tahfidzqu_dismiss_install', 'true');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-auto md:right-8 z-[5000] animate-in slide-in-from-bottom-12 duration-500 fade-in">
      <div className="bg-emerald-600 dark:bg-emerald-700 text-white rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 max-w-sm md:max-w-lg mx-auto border border-emerald-500/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none"></div>
        
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner z-10">
          <i className="ph-fill ph-download-simple text-xl md:text-2xl"></i>
        </div>
        
        <div className="flex-1 text-center sm:text-left z-10 w-full">
          <h3 className="text-sm md:text-base font-bold mb-1">Install TahfidzQur</h3>
          <p className="text-[10px] md:text-xs text-emerald-100 font-medium leading-tight">
            {isIos 
              ? "Ketuk ikon Share di bawah layar, lalu pilih 'Add to Home Screen' untuk menginstal."
              : "Install sekarang untuk akses lebih cepat, stabil, dan layar penuh."}
          </p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 z-10 shrink-0 mt-2 sm:mt-0">
          <button 
            onClick={handleDismiss}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-700/50 hover:bg-emerald-800 text-emerald-50 text-xs font-bold transition-colors"
          >
            Nanti
          </button>
          {!isIos && (
            <button 
              onClick={handleInstallClick}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-white text-emerald-600 hover:bg-emerald-50 text-xs font-black shadow-md transition-transform active:scale-95"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

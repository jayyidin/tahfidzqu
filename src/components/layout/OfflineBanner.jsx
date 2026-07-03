import React, { useState, useEffect } from 'react';

export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRecovered(true);
      const timer = setTimeout(() => setShowRecovered(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRecovered(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRecovered) return null;

  return (
    <div
      className={`fixed top-0 left-0 w-full z-[10000] transition-transform duration-500 text-center py-2 px-4 font-bold text-[11px] md:text-xs shadow-md flex items-center justify-center gap-2 pointer-events-none ${
        isOnline ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <i class="ph-bold ph-wifi-high text-base"></i> Koneksi Internet Pulih
        </>
      ) : (
        <>
          <i class="ph-bold ph-wifi-slash text-base"></i> Anda sedang Offline. Beberapa fitur mungkin tertunda.
        </>
      )}
    </div>
  );
};

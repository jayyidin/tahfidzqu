if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Mode Offline (Service Worker) Aktif:', reg.scope))
          .catch(err => console.error('Gagal memuat Service Worker:', err));
      });
    }
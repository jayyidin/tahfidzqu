import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { InstallBanner } from './components/layout/InstallBanner';
import { Header } from './components/layout/Header';
import { Modal } from './components/common/Modal';
import { ImportExportModal } from './components/common/ImportExportModal';
import { PullToRefresh } from './components/common/PullToRefresh';
import { SwipeToClose } from './components/common/SwipeToClose';
import { HomeView } from './components/views/HomeView';
import { PlayerView } from './components/views/PlayerView';
import { MasterDataView } from './components/views/MasterDataView';

const MainContent = () => {
  const {
    isAppLoading,
    view,
    customDialog, setCustomDialog,
    schLogo, schSub
  } = useApp();

  const closeDialog = () => {
    setCustomDialog({ show: false, type: 'alert', message: '', onConfirm: null });
  };

  const isConf = customDialog?.type === 'confirm';

  return (
    <div className="flex flex-col w-full h-[100dvh] relative z-10 bg-slate-50 dark:bg-[#0a120f] text-slate-800 dark:text-gray-200 transition-colors duration-300">
      <OfflineBanner />
      <InstallBanner />
      
      <div className="block">
        <Header />
      </div>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {isAppLoading ? (
          <div className="flex-1 flex flex-col p-4 md:p-8 bg-slate-50 dark:bg-[#0a120f] overflow-hidden">
            <div className="max-w-6xl mx-auto w-full animate-pulse">
              {/* Juz Tabs Skeleton */}
              <div className="flex gap-2 mb-6 overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-24 bg-slate-200 dark:bg-[#1a2e26] rounded-2xl shrink-0"></div>
                ))}
              </div>
              {/* Search Bar Skeleton */}
              <div className="h-12 w-full bg-slate-200 dark:bg-[#1a2e26] rounded-xl mb-6 max-w-sm"></div>
              {/* Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="h-28 w-full bg-slate-200 dark:bg-[#15241e] rounded-3xl border border-slate-100 dark:border-transparent"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <PullToRefresh onRefresh={() => { window.location.reload(); return new Promise(res => setTimeout(res, 500)); }}>
            <>
              <div className={`w-full h-full flex flex-col ${view === 'home' || view === 'player' ? 'animate-in fade-in zoom-in-[0.98] duration-500 ease-out' : 'hidden'}`}>
                {(view === 'home' || view === 'player') && <HomeView />}
              </div>
              <div className={`w-full h-full flex flex-col ${view === 'master' && view !== 'player' ? 'animate-in fade-in zoom-in-[0.98] duration-500 ease-out' : 'hidden'}`}>
                {(view === 'master' && view !== 'player') && <MasterDataView />}
              </div>
            </>
          </PullToRefresh>
        )}
      </main>

      {!isAppLoading && view === 'player' && (
        <SwipeToClose onClose={() => {
          if (typeof window !== 'undefined' && window.history) window.history.back();
        }}>
          <PlayerView />
        </SwipeToClose>
      )}

      {/* Modals */}
      <Modal />
      <ImportExportModal />

      {/* Custom Alert/Confirm Dialog */}
      {customDialog?.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[600] p-4 text-center animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isConf ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>
              <i className={`ph-fill ${isConf ? 'ph-warning-circle' : 'ph-info'} text-3xl`}></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isConf ? 'Konfirmasi' : 'Informasi'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-300 mb-6 leading-relaxed">
              {customDialog.message}
            </p>
            <div className="flex gap-3 justify-center">
              {isConf && (
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#0a120f] dark:text-gray-400 dark:hover:bg-[#1a2e26] transition active:scale-95"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (customDialog.onConfirm) customDialog.onConfirm();
                  closeDialog();
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition active:scale-95 shadow-lg ${
                  isConf
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {isConf ? 'Ya, Lanjutkan' : 'Mengerti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

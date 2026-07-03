import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { Header } from './components/layout/Header';
import { Modal } from './components/common/Modal';
import { GradeModal } from './components/common/GradeModal';
import { ImportExportModal } from './components/common/ImportExportModal';
import { SyahadahCard } from './components/common/SyahadahCard';
import { HomeView } from './components/views/HomeView';
import { PlayerView } from './components/views/PlayerView';
import { SetoranView } from './components/views/SetoranView';
import { HubView } from './components/views/HubView';
import { AdminView } from './components/views/AdminView';
import { MasterDataView } from './components/views/MasterDataView';

const MainContent = () => {
  const {
    isFetchingData,
    view,
    customDialog, setCustomDialog,
    schLogo, schSub
  } = useApp();

  const closeDialog = () => {
    setCustomDialog({ show: false, type: 'alert', message: '', onConfirm: null });
  };

  const isConf = customDialog?.type === 'confirm';

  return (
    <div className="flex flex-col w-full h-full relative z-10 bg-slate-50 dark:bg-[#0a120f] text-slate-800 dark:text-gray-200 transition-colors duration-300">
      <OfflineBanner />
      <Header />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {isFetchingData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#0a120f]">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              {schLogo ? (
                <img src={schLogo} alt="Logo" className="absolute inset-2 w-20 h-20 object-contain rounded-full p-1" />
              ) : (
                <i className="ph-fill ph-book-open absolute inset-0 flex items-center justify-center text-emerald-500 text-4xl"></i>
              )}
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-800 dark:text-white mb-1">
              {schSub || 'TahfidzQu'}
            </h2>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest animate-pulse">
              Memuat Data Aplikasi...
            </p>
          </div>
        ) : (
          <>
            {view === 'home' && <HomeView />}
            {view === 'player' && <PlayerView />}
            {view === 'setoran' && <SetoranView />}
            {view === 'hub' && <HubView />}
            {view === 'admin' && <AdminView />}
            {view === 'master' && <MasterDataView />}
          </>
        )}
      </main>

      {/* Modals */}
      <Modal />
      <GradeModal />
      <ImportExportModal />
      <SyahadahCard />

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

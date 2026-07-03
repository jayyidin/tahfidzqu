import React from 'react';
import { useApp } from '../../context/AppContext';

export const Header = () => {
  const {
    view, switchView,
    theme, setTheme,
    adminLvl, setAdminLvl,
    setLoggedInUstadzId,
    schLogo, schSub,
    search, setSearch,
    setFilter,
    setModal,
    subs
  } = useApp();

  const isAdmin = adminLvl > 0;
  const pend = subs.filter(s => s.status === 'pending').length;

  let searchPh = 'Cari...';
  if (view === 'home') searchPh = 'Cari Judul Surah...';
  else if (view === 'hub' || view === 'admin') searchPh = 'Cari Nama Siswa atau Surah...';
  else if (view === 'master') searchPh = 'Cari Ustadz / Halaqoh / Siswa...';
  else if (view === 'player') searchPh = 'Cari Ayat / Arti...';

  const handleLogout = () => {
    setAdminLvl(0);
    setLoggedInUstadzId(null);
    setFilter(prev => ({ ...prev, u: 'all' }));
    switchView('home');
  };

  return (
    <header className="shrink-0 border-b border-slate-200/60 dark:border-[#1a2e26] sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-[#0a120f]/90 shadow-sm transition-all duration-500 ease-out">
      <div className="flex items-center justify-between px-5 md:px-8 py-3.5 md:py-4">
        <div
          className="flex items-center gap-3 text-emerald-500 font-extrabold cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => switchView('home')}
        >
          {schLogo ? (
            <img src={schLogo} alt="Logo" className="h-8 md:h-10 max-w-[120px] object-contain" />
          ) : (
            <i className="ph-fill ph-monitor-play text-[2rem] md:text-4xl"></i>
          )}
          <div className="flex flex-col justify-center">
            <span className="text-xl md:text-2xl leading-none tracking-tight text-slate-800 dark:text-white">
              Tahfidz<span className="text-emerald-500">Qu</span>
            </span>
            {schSub && (
              <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-bold">
                {schSub}
              </span>
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative w-14 h-8 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors duration-300 ease-in-out shadow-inner"
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-6' : ''
              }`}
            >
              <i className={`ph-fill text-base ${theme === 'dark' ? 'ph-sun text-yellow-400' : 'ph-moon text-slate-500'}`}></i>
            </div>
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center transition-transform active:scale-95"
            >
              <i className="ph-bold ph-sign-out text-lg"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModal('login')}
              className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#15241e] text-slate-500 flex items-center justify-center transition-transform active:scale-95"
            >
              <i className="ph-fill ph-lock-key text-lg"></i>
            </button>
          )}
        </div>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
            <input
              type="text"
              placeholder={searchPh}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-std !w-full !rounded-full !pl-14 transition-all focus:!w-80 shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative w-14 h-8 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors duration-300 ease-in-out shadow-inner"
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-6' : ''
              }`}
            >
              <i className={`ph-fill text-base ${theme === 'dark' ? 'ph-sun text-yellow-400' : 'ph-moon text-slate-500'}`}></i>
            </div>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-12 h-12 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition shadow-sm"
              title="Keluar Akun"
            >
              <i className="ph-bold ph-sign-out text-xl"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModal('login')}
              className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#15241e] text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition shadow-sm"
            >
              <i className="ph-fill ph-lock-key text-xl"></i>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="px-5 md:px-8 flex gap-8 text-[13px] font-bold pt-2 overflow-x-auto hide-scrollbar">
        <button
          type="button"
          onClick={() => switchView('home')}
          className={`${
            view === 'home'
              ? 'text-emerald-600 border-b-[3px] border-emerald-500'
              : 'text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
          } pb-3 transition whitespace-nowrap flex items-center gap-1.5`}
        >
          <i className="ph-fill ph-house text-lg"></i> Beranda
        </button>

        <button
          type="button"
          onClick={() => switchView('hub')}
          className={`${
            view === 'hub'
              ? 'text-emerald-600 border-b-[3px] border-emerald-500'
              : 'text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
          } pb-3 transition whitespace-nowrap flex items-center gap-1.5`}
        >
          <i className="ph-fill ph-clipboard-text text-lg"></i> Setoran Hub
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => switchView('admin')}
              className={`${
                view === 'admin'
                  ? 'text-orange-500 border-b-[3px] border-orange-500'
                  : 'text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
              } pb-3 transition whitespace-nowrap flex items-center gap-1.5`}
            >
              <i className="ph-fill ph-tray text-lg"></i> Antrean{' '}
              {pend > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md">
                  {pend}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchView('master')}
              className={`${
                view === 'master'
                  ? 'text-purple-600 border-b-[3px] border-purple-500'
                  : 'text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
              } pb-3 transition whitespace-nowrap flex items-center gap-1.5`}
            >
              <i className="ph-fill ph-database text-lg"></i> Data Master
            </button>
          </>
        )}
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-5 mb-3 mt-1">
        <div className="relative">
          <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          <input
            type="text"
            placeholder={searchPh}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-std !w-full !rounded-full !pl-12 py-2.5 shadow-sm text-xs"
          />
        </div>
      </div>
    </header>
  );
};

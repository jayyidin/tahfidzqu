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
    setModal
  } = useApp();

  const isAdmin = adminLvl > 0;

  let searchPh = 'Cari...';
  if (view === 'home') searchPh = 'Cari Judul Surah...';
  else if (view === 'master') searchPh = 'Cari Ustadz / Halaqoh / Siswa...';
  else if (view === 'player') searchPh = 'Cari Ayat / Arti...';

  const handleLogout = () => {
    setAdminLvl(0);
    setLoggedInUstadzId(null);
    setFilter(prev => ({ ...prev, u: 'all' }));
    switchView('home');
  };

  const [tapCount, setTapCount] = React.useState(0);
  const handleLogoClick = () => {
    switchView('home');
    setTapCount(c => c + 1);
    
    // Tapping 4 times triggers login
    if (tapCount + 1 >= 4 && !isAdmin) {
      setModal('login');
      setTapCount(0);
    }
    
    // Reset tap count after 1 second
    setTimeout(() => {
      setTapCount(0);
    }, 1000);
  };

  return (
    <header className="shrink-0 border-b border-slate-200/70 dark:border-[#1a2e26]/80 sticky top-0 z-50 backdrop-blur-2xl bg-white/80 dark:bg-[#0a120f]/80 shadow-sm transition-all duration-500 ease-out">
      <div className="flex items-center justify-between px-4 md:px-8 py-3 gap-4">
        {/* Brand & Logo */}
        <div
          className="flex items-center gap-3 text-emerald-600 dark:text-emerald-500 font-extrabold cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
          onClick={handleLogoClick}
        >
          {schLogo ? (
            <img src={schLogo} alt="Logo" className="h-8 md:h-11 max-w-[140px] object-contain drop-shadow-sm" />
          ) : (
            <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <i className="ph-fill ph-monitor-play text-lg md:text-2xl"></i>
            </div>
          )}
          <div className="flex flex-col justify-center">
            <span className="text-base md:text-xl leading-none tracking-tight font-black text-slate-800 dark:text-white">
              Tahfidz<span className="text-emerald-500">Qur</span>
            </span>
            {schSub ? (
              <span className="hidden md:block text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-bold max-w-[180px] truncate">
                {schSub}
              </span>
            ) : (
              <span className="hidden md:block text-[8px] text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-widest font-extrabold">
                Platform Hafalan
              </span>
            )}
          </div>
        </div>

        {/* Desktop Navigation Pills (Center) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#15241e]/80 p-1.5 rounded-full border border-slate-200/60 dark:border-[#1a2e26] shadow-inner">



          {isAdmin && (
            <>


              <button
                type="button"
                onClick={() => switchView('master')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 duration-300 ${
                  view === 'master'
                    ? 'bg-white dark:bg-[#2b1f38] text-purple-600 dark:text-purple-400 shadow-md shadow-slate-200/50 dark:shadow-none scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <i className="ph-fill ph-database text-base"></i> Data Master
              </button>
            </>
          )}
        </div>

        {/* Desktop Controls (Right) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
            <input
              type="text"
              placeholder={searchPh}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-std !w-56 !rounded-full !pl-11 !pr-4 !py-2 !text-xs transition-all focus:!w-72 shadow-sm bg-slate-100/80 dark:bg-[#15241e]/80 hover:bg-white dark:hover:bg-[#15241e]"
            />
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative w-12 h-7 flex items-center bg-slate-200 dark:bg-[#1a2e26] rounded-full p-1 transition-colors duration-300 ease-in-out shadow-inner shrink-0"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-5 bg-slate-800' : ''
              }`}
            >
              <i className={`ph-fill text-xs ${theme === 'dark' ? 'ph-sun text-yellow-400' : 'ph-moon text-slate-500'}`}></i>
            </div>
          </button>



          {isAdmin && (
            <button
              type="button"
              onClick={handleLogout}
              className="h-9 px-3.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-1.5 transition text-xs font-bold shadow-sm shrink-0 active:scale-95"
              title="Keluar Akun"
            >
              <i className="ph-bold ph-sign-out text-base"></i> Keluar
            </button>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#15241e] text-slate-600 dark:text-yellow-400 flex items-center justify-center transition-transform active:scale-95"
          >
            <i className={`ph-fill text-lg ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`}></i>
          </button>


          {isAdmin && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center transition-transform active:scale-95"
            >
              <i className="ph-bold ph-sign-out text-lg"></i>
            </button>
          )}
        </div>
      </div>

      {/* Mobile & Tablet Navigation Tabs (Below 1024px) */}
      {isAdmin && (
        <div className="lg:hidden px-4 flex gap-2 pb-2.5 overflow-x-auto hide-scrollbar border-t border-slate-100 dark:border-[#1a2e26]/60 pt-2">
          <button
            type="button"
            onClick={() => switchView('master')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 w-full justify-center shadow-sm ${
              view === 'master'
                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 scale-[0.98]'
                : 'bg-slate-100 dark:bg-[#15241e] text-slate-500 dark:text-gray-400 border border-slate-200/60 dark:border-[#1a2e26]'
            }`}
          >
            <i className="ph-fill ph-gear-six text-base"></i> Pengaturan Aplikasi
          </button>
        </div>
      )}

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 mb-2.5">
        <div className="relative">
          <i className="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder={searchPh}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-std !w-full !rounded-full !pl-10 py-2 shadow-inner text-xs bg-slate-100/80 dark:bg-[#15241e]/80"
          />
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';

export const AudioPlayer = ({ id, url, duration, isUstadz = false }) => {
  const { activeAudioId, playCustomAudio, toggleCustomAudioSpeed, customAudioSpeed } = useApp();

  if (!url) {
    return (
      <span className="text-[10px] md:text-xs text-slate-400 italic bg-slate-50 dark:bg-[#1a2e26] px-4 py-3 rounded-2xl border border-dashed border-slate-200 dark:border-transparent w-full text-center inline-block pointer-events-none">
        Rekaman tidak tersedia
      </span>
    );
  }

  const isPlay = activeAudioId === id;
  const ic = isPlay ? 'ph-pause' : 'ph-play';
  const btnColor = isUstadz ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600';
  const barColor = isUstadz ? 'bg-blue-500' : 'bg-emerald-500';
  const iconSize = isUstadz ? 'text-xs' : 'text-sm';
  const btnSize = isUstadz ? 'w-8 h-8 md:w-9 md:h-9' : 'w-10 h-10 md:w-11 md:h-11';

  return (
    <div
      className="flex items-center gap-2 md:gap-3 bg-slate-50 dark:bg-[#0a120f] border border-slate-200 dark:border-[#1a2e26] p-1.5 md:p-2 rounded-full w-full shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        id={`audio-btn-${id}`}
        onClick={(e) => {
          e.stopPropagation();
          playCustomAudio(id, url, duration);
        }}
        className={`${btnSize} rounded-full ${btnColor} text-white flex items-center justify-center shrink-0 transition-colors shadow-md active:scale-95`}
      >
        <i className={`ph-fill ${ic} ${iconSize}`}></i>
      </button>

      <div className="flex-1 flex items-center gap-2 pr-2 md:pr-3">
        <div className="h-1.5 flex-1 bg-slate-200 dark:bg-[#15241e] rounded-full overflow-hidden relative">
          <div
            id={`audio-bar-${id}`}
            className={`absolute left-0 top-0 h-full ${barColor} rounded-full transition-all duration-100`}
            style={{ width: isPlay ? 'auto' : '0%' }}
          ></div>
        </div>

        <span
          id={`audio-time-${id}`}
          className="text-[9px] md:text-[10px] font-mono font-medium text-slate-500 dark:text-gray-400 w-8 text-right shrink-0"
        >
          00:00
        </span>

        <button
          type="button"
          onClick={toggleCustomAudioSpeed}
          className="audio-speed-btn text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-emerald-500 bg-slate-100 dark:bg-[#15241e] px-1.5 py-0.5 rounded cursor-pointer transition-colors w-8 text-center shrink-0"
          title="Atur Kecepatan"
        >
          {customAudioSpeed || 1}x
        </button>
      </div>
    </div>
  );
};

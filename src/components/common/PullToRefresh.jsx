import React, { useState, useEffect, useRef } from 'react';

export const PullToRefresh = ({ onRefresh, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef(null);
  
  const MAX_PULL = 100; // max px to pull down
  const THRESHOLD = 60; // px to trigger refresh

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (isRefreshing) return;
      
      // We look for the main scrollable elements in our app
      const scrollable = e.target.closest('.overflow-y-auto') ||
                         document.getElementById('main-scroll') || 
                         document.getElementById('home-scroll') || 
                         document.getElementById('master-scroll');
                         
      if (scrollable && scrollable.scrollTop > 0) {
        return; // Not at top, don't pull
      }
      
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      setIsPulling(true);
    };

    const handleTouchMove = (e) => {
      if (!isPulling || isRefreshing) return;
      
      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;
      
      if (distance > 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        setPullDistance(Math.min(distance * 0.4, MAX_PULL)); // add some friction
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;
      
      setIsPulling(false);
      
      if (pullDistance >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(50); // Hold at a specific height while refreshing
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isPulling, isRefreshing, pullDistance, onRefresh]);

  return (
    <div className="relative w-full h-full flex flex-col" ref={containerRef}>
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center overflow-hidden transition-all duration-200 z-50 pointer-events-none"
        style={{ height: `${pullDistance}px` }}
      >
        <div className={`transition-transform duration-300 ${isRefreshing ? 'animate-spin' : ''}`}
             style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}>
          <i className={`ph-bold ph-arrow-circle-down text-3xl text-emerald-500 bg-white dark:bg-slate-800 rounded-full shadow-md`}></i>
        </div>
      </div>
      <div 
        className="flex-1 w-full h-full flex flex-col transition-transform duration-200 min-h-0"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

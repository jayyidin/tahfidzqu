import React, { useState, useEffect, useRef } from 'react';

export const SwipeToClose = ({ onClose, children }) => {
  const [pullDistance, setPullDistance] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [isClosing, setIsClosing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef(null);
  
  const THRESHOLD = 120; // px to trigger close

  useEffect(() => {
    // Animate in on mount
    const timer = setTimeout(() => {
      setPullDistance(0);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (isClosing) return;
      
      const isHandle = e.target.closest('.pull-handle');
      
      // Look for the main scrollable element within this view
      const scrollable = document.getElementById('main-scroll');
                         
      if (!isHandle && scrollable && scrollable.scrollTop > 0) {
        return; // Not at top, don't pull
      }
      
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e) => {
      if (!isPulling.current || isClosing) return;
      
      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;
      
      if (distance > 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        setPullDistance(distance); 
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current || isClosing) return;
      
      isPulling.current = false;
      
      if (pullDistance >= THRESHOLD) {
        setIsClosing(true);
        setPullDistance(window.innerHeight || 800); // slide all the way down
        setTimeout(() => {
          onClose();
        }, 300); // Wait for transition
      } else {
        setPullDistance(0); // snap back
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
  }, [isClosing, pullDistance, onClose]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full flex flex-col z-[100] bg-white dark:bg-[#0a120f] overflow-hidden shadow-2xl"
      style={{ 
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        opacity: Math.max(1 - (pullDistance / (window.innerHeight || 800) * 1.5), 0)
      }}
    >
      {children}
    </div>
  );
};

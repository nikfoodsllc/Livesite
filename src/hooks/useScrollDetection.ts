'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScrollState {
  isScrolled: boolean;
  scrollY: number;
  scrollDirection: 'up' | 'down' | null;
  isAtTop: boolean;
}

export const useScrollDetection = (threshold: number = 10) => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrolled: false,
    scrollY: 0,
    scrollDirection: null,
    isAtTop: true,
  });

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const isScrolled = currentScrollY > threshold;
    const isAtTop = currentScrollY <= 0;

    setScrollState(prev => {
      const scrollDirection =
        currentScrollY > prev.scrollY ? 'down' :
        currentScrollY < prev.scrollY ? 'up' :
        prev.scrollDirection;

      return {
        isScrolled,
        scrollY: currentScrollY,
        scrollDirection,
        isAtTop,
      };
    });
  }, [threshold]);

  useEffect(() => {
    let ticking = false;

    const optimizedScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', optimizedScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', optimizedScroll);
    };
  }, [handleScroll]);

  return scrollState;
};
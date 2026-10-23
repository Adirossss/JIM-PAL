import { useEffect, type RefObject } from 'react';

let openSheets = 0;

/**
 * While a sheet is open: freezes the screen's own scroll area (the app shell
 * scrolls `.screen-scroll`, not the body), and stops touch drags on the
 * sheet's non-scrolling parts from panning anything behind it. Drags inside
 * `scrollableSelector` still scroll that list.
 */
export function useScrollLock(sheetRef: RefObject<HTMLElement | null>, scrollableSelector?: string): void {
  useEffect(() => {
    const app = document.querySelector('.app');
    openSheets += 1;
    app?.classList.add('app--locked');

    const sheet = sheetRef.current;
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (scrollableSelector && target?.closest(scrollableSelector)) return;
      e.preventDefault();
    };
    sheet?.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      openSheets -= 1;
      if (openSheets === 0) app?.classList.remove('app--locked');
      sheet?.removeEventListener('touchmove', onTouchMove);
    };
  }, [sheetRef, scrollableSelector]);
}

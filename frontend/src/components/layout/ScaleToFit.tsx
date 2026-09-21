import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Fits its children into the viewport with zero scrolling by measuring
 * their natural (unscaled) size and applying a CSS transform: scale(...)
 * - the transform equivalent of `object-fit: contain`. No layout
 * re-flow happens on resize, only a scale factor recalculation, so it
 * works regardless of how the design-resolution content inside is sized.
 */
export function ScaleToFit({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const recompute = () => {
      // scrollWidth/Height reflect the untransformed layout box, so this
      // stays accurate even while a transform is already applied.
      const naturalWidth = el.scrollWidth;
      const naturalHeight = el.scrollHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setScale(Math.min(viewportWidth / naturalWidth, viewportHeight / naturalHeight));
    };

    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);

    const observer = new ResizeObserver(recompute);
    observer.observe(el);

    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-void">
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

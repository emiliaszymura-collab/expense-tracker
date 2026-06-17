import React, { useRef, useState, useLayoutEffect } from 'react';

// Robust replacement for recharts <ResponsiveContainer>.
// Measures the container with ResizeObserver and passes an explicit pixel width
// to the chart — avoids the iOS Safari bug where ResponsiveContainer measures 0.
export function MeasuredChart({ height, children }: { height: number; children: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
    measure();
    // Re-measure shortly after mount (after page transition / layout settles)
    const timers = [60, 200, 500].map(ms => setTimeout(measure, ms));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width > 0 ? children(width) : null}
    </div>
  );
}

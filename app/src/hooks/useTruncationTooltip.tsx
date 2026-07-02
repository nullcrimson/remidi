import { useState } from 'react';

interface Tip {
  name: string;
  x: number;
  y: number;
}

export function useTruncationTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);

  const show = (el: HTMLElement, name: string) => {
    if (el.scrollWidth <= el.clientWidth) return;
    const r = el.getBoundingClientRect();
    setTip({ name, x: r.left, y: r.bottom });
  };
  const hide = () => setTip(null);

  const tooltip = tip
    ? (
        <div
          role="tooltip"
          style={{ left: tip.x, top: tip.y + 6 }}
          className="
            pointer-events-none fixed z-50 max-w-70 rounded-md border
            border-accent/25 bg-ink px-2.5 py-1.5 font-sans text-[12px]
            leading-tight text-t1 shadow-[0_8px_24px_rgba(0,0,0,0.55)]
          "
        >
          {tip.name}
        </div>
      )
    : null;

  return { show, hide, tooltip };
}

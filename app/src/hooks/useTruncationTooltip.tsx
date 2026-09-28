import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Tip {
  name: string;
  x: number;
  y: number;
}

export function useTruncationTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);

  const show = (el: HTMLElement, name: string, always = false) => {
    if (!always && el.scrollWidth <= el.clientWidth) return;
    const r = el.getBoundingClientRect();
    setTip({ name, x: r.left, y: r.bottom });
  };
  const hide = () => setTip(null);

  const tooltip = tip
    ? createPortal(
        <div
          role="tooltip"
          style={{ left: tip.x, top: tip.y + 6 }}
          className="
            pointer-events-none fixed z-50 max-w-70 rounded-panel border
            border-accent/25 bg-ink px-2.5 py-1.5 font-sans text-ui/tight
            text-t1 shadow-[0_8px_24px_rgba(0,0,0,0.55)]
          "
        >
          {tip.name}
        </div>,
        document.body,
      )
    : null;

  return { show, hide, tooltip };
}

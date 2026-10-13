import { useState } from 'react';
import { createPortal } from 'react-dom';
import { tip as tipClasses } from './styles';

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
          className={tipClasses()}
        >
          {tip.name}
        </div>,
        document.body,
      )
    : null;

  return { show, hide, tooltip };
}

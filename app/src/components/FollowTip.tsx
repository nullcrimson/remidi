import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const GAP_X = 14;
const GAP_Y = 18;
const MAX_WIDTH = 280;

/** Shows `text` beside the mouse pointer while it is over `children`, following it; touch shows nothing. */
export function FollowTip({ text, children }: { text: string | null; children: ReactNode }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  if (text === null) return children;
  const flip = at !== null && at.x + GAP_X + MAX_WIDTH > window.innerWidth;
  return (
    <div
      data-follow-tip
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') setAt({ x: e.clientX, y: e.clientY });
      }}
      onPointerLeave={() => setAt(null)}
    >
      {children}
      {at && createPortal(
        <div
          role="tooltip"
          style={flip
            ? { right: window.innerWidth - at.x + GAP_X, top: at.y + GAP_Y }
            : { left: at.x + GAP_X, top: at.y + GAP_Y }}
          className="
            pointer-events-none fixed z-50 max-w-70 rounded-panel border
            border-accent/25 bg-ink px-2.5 py-1.5 font-sans text-ui/tight
            text-t1 shadow-tip
          "
        >
          {text}
        </div>,
        document.body,
      )}
    </div>
  );
}

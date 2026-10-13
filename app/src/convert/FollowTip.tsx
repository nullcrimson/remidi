import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TIP_MAX_WIDTH_CLASS, tip } from '../ui/styles';

const GAP_X = 14;
const GAP_Y = 18;
const SPACING_PX = 4;
const MAX_WIDTH = Number(TIP_MAX_WIDTH_CLASS.slice('max-w-'.length)) * SPACING_PX;

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
          className={tip()}
        >
          {text}
        </div>,
        document.body,
      )}
    </div>
  );
}

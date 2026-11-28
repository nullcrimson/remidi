import { TipLink } from './TipLink';

/**
 * The tip link in the right margin beside the column, held at mid-height while the page
 * scrolls: shown from `xl` beside the `wide` converter and from `lg` beside a narrow page,
 * hidden while the tip ask is open or a tip pauses the asks (`tip-side-rail`).
 */
export function TipSide({ wide }: { wide: boolean }) {
  return (
    <div
      data-nosnippet
      className={`
        tip-side-rail
        ${wide
      ? 'max-xl:hidden'
      : `max-lg:hidden`}
      `}
    >
      <div className="sticky top-1/2 -translate-y-1/2">
        <TipLink where="side" className="tip-side" />
      </div>
    </div>
  );
}

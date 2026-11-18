import { engineName } from '../core/enginePair';
import type { EngineId } from '../core/midiremap';
import { track } from '../core/stats';
import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';
import type { SourceSurface } from './sourceSurface';
import { knows, misses } from './sourceWords';
import type { Remapper } from './useRemapper';

/**
 * Under the engine pickers, while `surface` is the notice: how many of the files' hits the
 * chosen source misses, announced, then what the engine the advice names knows, with a button
 * that makes a suggested engine the source and then calls `onUsed`, since the notice goes with
 * it; the target is only named. Hidden while source notes are edited, since the edits change
 * what the source recognizes.
 */
export function SourceAdviceNotice({ remapper, surface, onUsed }: { remapper: Remapper; surface: SourceSurface; onUsed: () => void }) {
  const t = useT();
  if (surface.kind !== 'notice') return null;
  const { offered } = surface;
  const { engines, chooseSuggested } = remapper;
  const nameOf = (id: EngineId) => engineName(engines, id);
  return (
    <div className="
      flex flex-col gap-1 rounded-chip bg-white/3 p-3 text-ui wrap-break-word
      text-t3
    "
    >
      <p role="status">{t(misses(offered, nameOf(offered.source)))}</p>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span>{t(knows(offered, nameOf))}</span>
        {offered.kind === 'suggest' && (
          <TextButton
            onClick={() => {
              track('source-suggestion-used', { engine: offered.engine, where: 'engines' });
              chooseSuggested(offered.engine);
              onUsed();
            }}
          >{t({ id: 'source-use', args: { engine: nameOf(offered.engine) } })}
          </TextButton>
        )}
      </p>
    </div>
  );
}

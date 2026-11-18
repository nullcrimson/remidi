import { useRef } from 'react';
import { engineName } from '../core/enginePair';
import type { EngineId } from '../core/midiremap';
import { track } from '../core/stats';
import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';
import type { FocusRef } from '../ui/useFocusIntent';
import type { SourceSurface } from './sourceSurface';
import { knows, misses } from './sourceWords';
import type { Remapper } from './useRemapper';

/**
 * Under the engine pickers, or on a phone under the file chips, in the space the empty file
 * step keeps, so it moves nothing below (the page renders it in its `NoticePlace`). While
 * `surface` is the notice: how many of the files' hits the
 * chosen source misses, announced, then what the engine the advice names knows, with a button
 * that makes a suggested engine the source and then calls `onUsed`, since the notice goes with
 * it; the target is only named. Hidden while source notes are edited, since the edits change
 * what the source recognizes. Its first sentence is `sentenceRef`, a focus target: focused, it
 * brings the whole notice into view.
 */
export function SourceAdviceNotice({ remapper, surface, sentenceRef, onUsed }: {
  remapper: Remapper;
  surface: SourceSurface;
  sentenceRef?: FocusRef;
  onUsed: () => void;
}) {
  const t = useT();
  const notice = useRef<HTMLDivElement>(null);
  if (surface.kind !== 'notice') return null;
  const { offered } = surface;
  const { engines, chooseSuggested } = remapper;
  const nameOf = (id: EngineId) => engineName(engines, id);
  return (
    <div
      ref={notice}
      className="
        flex flex-col gap-1 rounded-chip bg-white/3 p-3 text-ui wrap-break-word
        text-t3
      "
    >
      <p
        role="status"
        ref={sentenceRef}
        tabIndex={-1}
        className="outline-none"
        onFocus={() => notice.current?.scrollIntoView({ block: 'nearest' })}
      >{t(misses(offered, nameOf(offered.source)))}
      </p>
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

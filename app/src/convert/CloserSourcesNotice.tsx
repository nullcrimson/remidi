import { Fragment } from 'react';
import { engineName } from '../core/enginePair';
import type { EngineId } from '../core/midiremap';
import { track } from '../core/stats';
import { Rich } from '../ui/Rich';
import { TextButton } from '../ui/TextButton';
import { closerSources, type RankedFit } from './closerSources';
import type { Remapper } from './useRemapper';

function Suggestion({ fit, name, onChoose }: { fit: RankedFit; name: string; onChoose: (id: EngineId) => void }) {
  const engine = <span className="font-semibold text-t1">{name}</span>;
  return (
    <TextButton
      onClick={() => {
        track('source-suggestion-used', { rank: fit.rank });
        onChoose(fit.engine);
      }}
    >
      <span>
        {fit.complete
          ? <Rich id="source-fit-all" slots={{ engine }} />
          : <Rich id="source-fit-some" args={{ count: fit.recognized }} slots={{ engine }} />}
      </span>
    </TextButton>
  );
}

/**
 * Under the engine pickers: how many of the files' hits the chosen source misses, and up to
 * three engines that recognize more, each chosen as the source on a click. Hidden while
 * source notes are edited, since the edits change what the source recognizes.
 */
export function CloserSourcesNotice({ remapper }: { remapper: Remapper }) {
  const { fits, src, tgt, engines, editor, chooseSrc } = remapper;
  if (fits === null || src === null || Object.keys(editor.srcEdits).length > 0) return null;
  const closer = closerSources(fits, src, tgt);
  if (closer === null) return null;
  const suggestions = closer.better.map((fit, i) => (
    <Fragment key={fit.engine}>
      {i > 0 && ' · '}
      <Suggestion fit={fit} name={engineName(engines, fit.engine)} onChoose={chooseSrc} />
    </Fragment>
  ));
  return (
    <p
      role="status"
      className="rounded-chip bg-white/3 p-3 text-ui wrap-break-word text-t3"
    >
      <Rich
        id="source-fit-missing"
        args={{ missing: closer.missing, hits: closer.hits, source: engineName(engines, src) }}
        slots={{ engines: suggestions }}
      />
    </p>
  );
}

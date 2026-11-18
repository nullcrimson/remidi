import { useEffect, useId, useRef } from 'react';
import type { EngineId } from '../core/midiremap';
import { track } from '../core/stats';
import { useT } from '../locale/localeContext';
import { Button } from '../ui/Button';
import { WarnIcon } from '../ui/WarnIcon';
import { NamedButton } from '../ui/NamedButton';
import type { Offered } from './sourceOffer';
import { knows, lacks } from './sourceWords';

/**
 * In the Convert button's place, before converting a file the source reads no kick or no snare
 * in: what the source lacks and misses and what the engine the advice names knows, then
 * converting as the suggested engine or, when the advice names the target, picking another
 * source, or converting anyway. Focus goes to the sentence, so a held Enter answers nothing;
 * Escape takes the question away. Each answer is sent as `source-answered`.
 */
export function SourceQuestion({ offered, nameOf, onSwitch, onPick, onAnyway, onDismiss }: {
  offered: Offered;
  nameOf: (id: EngineId) => string;
  onSwitch: (engine: EngineId) => void;
  onPick: () => void;
  onAnyway: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const sentence = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => sentence.current?.focus(), []);
  const fix = offered.kind === 'suggest'
    ? (
        <NamedButton
          variant="primary"
          text={t({ id: 'source-ask-switch', args: { engine: nameOf(offered.engine) } })}
          describedBy={id}
          onClick={() => {
            track('source-answered', { answer: 'switched' });
            onSwitch(offered.engine);
          }}
        />
      )
    : (
        <Button
          variant="primary"
          size="stack"
          describedBy={id}
          onClick={() => {
            track('source-answered', { answer: 'picked' });
            onPick();
          }}
        >{t({ id: 'source-ask-pick' })}
        </Button>
      );
  return (
    <div
      role="group"
      aria-labelledby={id}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        track('source-answered', { answer: 'dismissed' });
        onDismiss();
      }}
      className="
        flex gap-3 rounded-panel border border-danger/30 bg-danger/6 p-4
        text-left text-ui text-t3
      "
    >
      <span className="mt-0.5 shrink-0 text-danger"><WarnIcon size={18} /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p id={id} ref={sentence} tabIndex={-1} className="text-t2 outline-none">
          {`${t(lacks(offered, nameOf(offered.source)))} ${t(knows(offered, nameOf))}`}
        </p>
        <div className="
          flex flex-col gap-2
          sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3
        "
        >
          {fix}
          <Button
            variant="secondary"
            size="stack"
            describedBy={id}
            onClick={() => {
              track('source-answered', { answer: 'anyway' });
              onAnyway();
            }}
          >{t({ id: 'source-ask-anyway' })}
          </Button>
        </div>
      </div>
    </div>
  );
}

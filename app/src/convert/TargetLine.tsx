import type { EngineNames } from '../core/enginePair';
import { useT } from '../locale/localeContext';
import { Rich } from '../ui/Rich';
import { TextButton } from '../ui/TextButton';
import type { Offered } from './sourceOffer';
import { wholeOf } from './sourceWords';

/**
 * The done card's muted line when the advice names the target: what the target knows of the
 * notes, and a text button that converts the other way, never the primary action.
 */
export function TargetLine({ names, offered, onSwap }: { names: EngineNames; offered: Offered; onSwap: () => void }) {
  const t = useT();
  const { recognized, hits } = offered;
  const swap = (
    <TextButton onClick={onSwap}>
      <span>{t({ id: 'source-swap', args: { target: names.target, source: names.source } })}</span>
    </TextButton>
  );
  return (
    <p className="text-ui wrap-break-word text-t3">
      <Rich
        id="source-target-fits"
        args={{ target: names.target, known: wholeOf(recognized, hits), count: recognized }}
        slots={{ swap }}
      />
    </p>
  );
}

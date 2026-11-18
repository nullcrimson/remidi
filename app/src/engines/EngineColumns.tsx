import { useT } from '../locale/localeContext';
import { track } from '../core/stats';
import type { FocusRef } from '../ui/useFocusIntent';
import type { Engine, EngineId } from '../core/midiremap';
import type { Message } from '../generated/i18n';
import { IconButton } from '../ui/IconButton';
import { EngineSide, type EngineSideName } from './EngineSide';

/**
 * The FROM and TO engine cards side by side, with the swap button between them; `picking`
 * names the side whose picker is open; `onTaken` is told why a favourite chosen on the other
 * side was not picked.
 */
export function EngineColumns({
  engines,
  src,
  tgt,
  onChooseSrc,
  onChooseTgt,
  onSwap,
  fromRef,
  toRef,
  picking,
  onPicking,
  onTaken,
}: {
  engines: Engine[];
  src: EngineId | null;
  tgt: EngineId | null;
  onChooseSrc: (id: EngineId) => void;
  onChooseTgt: (id: EngineId) => void;
  onSwap: () => void;
  fromRef: FocusRef;
  toRef: FocusRef;
  picking: EngineSideName | null;
  onPicking: (side: EngineSideName | null) => void;
  onTaken: (why: Message) => void;
}) {
  const t = useT();
  const pickerOf = (side: EngineSideName) => ({
    open: picking === side,
    onOpenChange: (open: boolean) => onPicking(open ? side : null),
  });
  const takenAs = (otherSide: string) => (engine: Engine) =>
    onTaken({ id: 'engine-taken', args: { engine: engine.name, side: otherSide } });
  const swap = () => {
    track('engines-swapped', { where: 'button' });
    onSwap();
  };
  return (
    <div className="
      grid grid-cols-1 gap-2
      sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-4
    "
    >
      <EngineSide
        side="from"
        label={t({ id: 'engine-from' })}
        value={src}
        disabledId={tgt}
        engines={engines}
        next={src === null}
        onChange={onChooseSrc}
        onTaken={takenAs(t({ id: 'engine-to' }))}
        cardRef={fromRef}
        {...pickerOf('from')}
      />
      <div className="
        flex justify-center
        sm:pt-4
      "
      >
        <IconButton label={t({ id: 'engine-swap' })} disabled={src === null && tgt === null} onClick={swap}>
          <span className="
            inline-block rotate-90
            sm:rotate-0
          "
          >⇄
          </span>
        </IconButton>
      </div>
      <EngineSide
        side="to"
        label={t({ id: 'engine-to' })}
        value={tgt}
        disabledId={src}
        engines={engines}
        next={src !== null && tgt === null}
        onChange={onChooseTgt}
        onTaken={takenAs(t({ id: 'engine-from' }))}
        cardRef={toRef}
        {...pickerOf('to')}
      />
    </div>
  );
}

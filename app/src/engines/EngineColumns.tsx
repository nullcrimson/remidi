import { useT } from '../locale/localeContext';
import { track } from '../core/stats';
import type { FocusRef } from '../ui/useFocusIntent';
import { useFavorites } from './useFavorites';
import type { Engine } from '../core/midiremap';
import { IconButton } from '../ui/IconButton';
import { LibraryList } from './LibraryList';

/** The FROM and TO engine lists side by side, with the swap button between them. */
export function EngineColumns({
  engines,
  src,
  tgt,
  onChooseSrc,
  onChooseTgt,
  onSwap,
  fromRef,
  toRef,
}: {
  engines: Engine[];
  src: string | null;
  tgt: string | null;
  onChooseSrc: (id: string) => void;
  onChooseTgt: (id: string) => void;
  onSwap: () => void;
  fromRef: FocusRef;
  toRef: FocusRef;
}) {
  const t = useT();
  const favFrom = useFavorites('from');
  const favTo = useFavorites('to');
  const swap = () => {
    track('engines-swapped');
    onSwap();
  };
  return (
    <div className="
      grid grid-cols-1 gap-3
      sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4
    "
    >
      <LibraryList
        side="from"
        label={t({ id: 'engine-from' })}
        value={src}
        disabledId={tgt}
        engines={engines}
        onChange={onChooseSrc}
        favorites={favFrom.favorites}
        onToggleFavorite={favFrom.toggleFavorite}
        filterRef={fromRef}
      />
      <div className="
        flex justify-center
        sm:pt-8
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
      <LibraryList
        side="to"
        label={t({ id: 'engine-to' })}
        value={tgt}
        disabledId={src}
        engines={engines}
        onChange={onChooseTgt}
        favorites={favTo.favorites}
        onToggleFavorite={favTo.toggleFavorite}
        filterRef={toRef}
      />
    </div>
  );
}

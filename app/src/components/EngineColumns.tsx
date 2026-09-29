import { t } from '../i18n';
import type { FocusRef } from '../hooks/useFocusIntent';
import { useFavorites } from '../hooks/useFavorites';
import type { Engine } from '../lib/midiremap';
import { IconButton } from './IconButton';
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
  src: string;
  tgt: string;
  onChooseSrc: (id: string) => void;
  onChooseTgt: (id: string) => void;
  onSwap: () => void;
  fromRef: FocusRef;
  toRef: FocusRef;
}) {
  const favFrom = useFavorites('from');
  const favTo = useFavorites('to');
  return (
    <div className="
      grid grid-cols-1 gap-3
      sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4
    "
    >
      <LibraryList
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
        <IconButton label={t({ id: 'engine-swap' })} disabled={!src && !tgt} onClick={onSwap}>
          <span className="
            inline-block rotate-90
            sm:rotate-0
          "
          >⇄
          </span>
        </IconButton>
      </div>
      <LibraryList
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

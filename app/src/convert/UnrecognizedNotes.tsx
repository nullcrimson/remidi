import type { MessageId } from '../generated/i18n';
import { useT } from '../locale/localeContext';
import type { Unrecognized } from '../core/midiremap';
import { track } from '../core/stats';
import { TextButton } from '../ui/TextButton';

const UNRECOGNIZED_SENTENCE = {
  remove: 'done-removed',
  keep: 'done-kept',
} as const satisfies Record<Unrecognized, MessageId>;

/** What the conversion did with the notes the source layout does not know, and the two ways to fix it. */
export function UnrecognizedNotes({ count, source, unrecognized, onPickSource, onAssign }: {
  count: number;
  source: string;
  unrecognized: Unrecognized;
  onPickSource: () => void;
  onAssign: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5 text-ui text-t3">
      <p>{t({ id: UNRECOGNIZED_SENTENCE[unrecognized], args: { count, source } })}</p>
      <div className="
        flex flex-wrap items-center justify-center gap-x-5 gap-y-2
      "
      >
        <TextButton
          onClick={() => {
            track('done-wrong-source');
            onPickSource();
          }}
        >{t({ id: 'done-pick-source' })}
        </TextButton>
        <TextButton
          onClick={() => {
            track('done-assign-unrecognized');
            onAssign();
          }}
        >{t({ id: 'done-assign-notes' })}
        </TextButton>
      </div>
    </div>
  );
}

import type { MessageId } from '../generated/i18n';
import type { Locale } from '../generated/i18n';
import { listed } from '../locale/list';
import { useLocale } from '../locale/localeContext';
import type { Unrecognized } from '../core/midiremap';
import { track } from '../core/stats';
import type { UnrecognizedEntry } from '../report/report';
import { TextButton } from '../ui/TextButton';

const UNRECOGNIZED_SENTENCE = {
  remove: 'done-removed',
  keep: 'done-kept',
} as const satisfies Record<Unrecognized, MessageId>;

/** The kept notes that play a target drum, each as its note and that drum, and their hits. */
function playing(entries: UnrecognizedEntry[], locale: Locale): { count: number; list: string } | null {
  const onto = entries.flatMap((e) => (e.kept?.drum == null ? [] : [{ count: e.count, text: `${e.label} ${e.kept.drum}` }]));
  if (onto.length === 0) return null;
  return {
    count: onto.reduce((n, e) => n + e.count, 0),
    list: listed(locale, onto.map((e) => e.text)),
  };
}

/** What the conversion did with the notes the source layout does not know, and the two ways to fix it. */
export function UnrecognizedNotes({ count, entries, source, target, unrecognized, onPickSource, onAssign }: {
  count: number;
  entries: UnrecognizedEntry[];
  source: string;
  target: string;
  unrecognized: Unrecognized;
  onPickSource: () => void;
  onAssign: () => void;
}) {
  const { t, locale } = useLocale().translator;
  const plays = playing(entries, locale);
  return (
    <div className="flex flex-col gap-1.5 text-ui text-t3">
      <p>{t({ id: UNRECOGNIZED_SENTENCE[unrecognized], args: { count, source } })}</p>
      {plays && <p>{t({ id: 'done-kept-plays', args: { count: plays.count, target, list: plays.list } })}</p>}
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

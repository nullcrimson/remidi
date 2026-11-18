import type { MessageId } from '../generated/i18n';
import type { Locale } from '../generated/i18n';
import { listed } from '../locale/list';
import { useLocale } from '../locale/localeContext';
import type { EngineId, Note, Unrecognized } from '../core/midiremap';
import { track } from '../core/stats';
import type { UnrecognizedEntry } from '../report/report';
import { TextButton } from '../ui/TextButton';
import { NamedButton } from '../ui/NamedButton';
import type { Offered } from './sourceOffer';
import { TargetLine } from './TargetLine';

const UNRECOGNIZED_SENTENCE = {
  remove: 'done-removed',
  keep: 'done-kept',
} as const satisfies Record<Unrecognized, MessageId>;

/** What the done card offers for a source that missed notes: converting again from the suggested engine, or the other way round when the target is named, the engines named in the catalog's words. */
export interface SourceFixes {
  offered: Offered;
  nameOf: (id: EngineId) => string;
  onConvertFrom: (engine: EngineId) => void;
  onSwap: () => void;
}

/** The kept notes that play a target drum, each as its note and that drum, and their hits. */
function playing(entries: UnrecognizedEntry[], locale: Locale): { count: number; list: string } | null {
  const onto = entries.flatMap((e) => (e.kept?.drum == null ? [] : [{ count: e.count, text: `${e.label} ${e.kept.drum}` }]));
  if (onto.length === 0) return null;
  return {
    count: onto.reduce((n, e) => n + e.count, 0),
    list: listed(locale, onto.map((e) => e.text)),
  };
}

/** The fix the advice offers, converting at once: from the suggested engine, or the other way round. */
function Fix({ fixes, source, target }: { fixes: SourceFixes; source: string; target: string }) {
  const { t } = useLocale().translator;
  const { offered, nameOf, onConvertFrom, onSwap } = fixes;
  if (offered.kind === 'looksLikeTarget') {
    return (
      <TargetLine
        names={{ source, target }}
        offered={offered}
        onSwap={() => {
          track('engines-swapped', { where: 'done' });
          onSwap();
        }}
      />
    );
  }
  return (
    <div className="flex justify-center">
      <NamedButton
        variant="secondary"
        text={t({ id: 'done-convert-from', args: { engine: nameOf(offered.engine) } })}
        onClick={() => {
          track('source-suggestion-used', { engine: offered.engine, where: 'done' });
          onConvertFrom(offered.engine);
        }}
      />
    </div>
  );
}

/**
 * What the conversion did with the notes the source layout does not know, the fix the advice
 * offers, converting in one click, and the two ways to fix it by hand.
 */
export function UnrecognizedNotes({ count, entries, source, target, unrecognized, fixes, onPickSource, onAssign }: {
  count: number;
  entries: UnrecognizedEntry[];
  source: string;
  target: string;
  unrecognized: Unrecognized;
  fixes: SourceFixes | null;
  onPickSource: () => void;
  onAssign: (notes: Note[]) => void;
}) {
  const { t, locale } = useLocale().translator;
  const plays = playing(entries, locale);
  return (
    <div className="flex flex-col gap-1.5 text-ui text-t3">
      <p>{t({ id: UNRECOGNIZED_SENTENCE[unrecognized], args: { count, source } })}</p>
      {plays && <p>{t({ id: 'done-kept-plays', args: { count: plays.count, target, list: plays.list } })}</p>}
      {fixes && <Fix fixes={fixes} source={source} target={target} />}
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
            onAssign(entries.map((e) => e.note));
          }}
        >{t({ id: 'done-assign-notes' })}
        </TextButton>
      </div>
    </div>
  );
}

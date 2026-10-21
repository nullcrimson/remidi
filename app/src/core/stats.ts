import { send, type AppEvent, type StatArgs } from './umami';

export { SUGGESTION_RANKS, type SuggestionRank } from './umami';

/** 1 is the funnel, 2 is feature use, 3 is fine detail. */
export type Tier = 1 | 2 | 3;

const TIER_OF = {
  'engine-picked': 2,
  'engines-swapped': 2,
  'engine-starred': 2,
  'midi-added': 1,
  'sample-used': 1,
  'file-removed': 2,
  'setting-changed': 2,
  converted: 1,
  'convert-failed': 1,
  'file-failed': 1,
  downloaded: 1,
  'rack-downloaded': 2,
  'convert-again': 1,
  'report-opened': 2,
  'report-fix-used': 2,
  'missing-dropped': 2,
  'done-wrong-source': 2,
  'done-assign-unrecognized': 2,
  'source-suggestion-used': 2,
  'mapping-reported': 2,
  'editor-opened': 2,
  'editor-closed': 2,
  'editor-reset': 2,
  'plan-failed': 2,
  'preset-saved': 2,
  'preset-loaded': 2,
  'preset-managed': 2,
  'preset-imported': 2,
  'presets-unsaved': 2,
  'language-picked': 3,
  'section-opened': 3,
  'nav-used': 3,
  'contact-used': 3,
  'tip-asked': 3,
  'tip-answered': 3,
  'load-failed': 3,
  crashed: 3,
  'storage-cleared': 3,
} as const satisfies Record<AppEvent, Tier>;

/** The tiers that are sent; an event of any other tier is not. */
export const ENABLED_TIERS: ReadonlySet<Tier> = new Set<Tier>([1, 2, 3]);

/** A `track` that sends the events of `enabled` tiers only. */
export function tracker(enabled: ReadonlySet<Tier>) {
  return <E extends AppEvent>(event: E, ...props: StatArgs<E>): void => {
    if (enabled.has(TIER_OF[event])) send(event, ...props);
  };
}

/** Counts `event` in Umami when its tier is on. */
export const track = tracker(ENABLED_TIERS);

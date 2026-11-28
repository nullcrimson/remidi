import type { Locale, RouteName, SectionKey } from '../generated/i18n';
import type { AppError } from './errors';
import type { EngineId, MissingDrums, Unrecognized } from './midiremap';
import type { SrcViaKind } from './selection';
import type { ShareBucket } from './share';
import type { HandoffPage, SharedHow } from './sharePage';

/** The kinds of error the events name: the app's own. */
export type ErrorKind = AppError['kind'];

/** The engine the advice suggested, as the events send it: its id, empty for none, or `advice-failed` when the advice failed. */
export type SuggestedProp = EngineId | '' | 'advice-failed';

/** Where a suggested source is taken: under the engine pickers, or on the done card. */
type SuggestionPlace = 'engines' | 'done';

/** Where a tip is asked or answered: in the converter, or on a static page. */
export type TipSite = 'converter' | 'static';

/** The downloads after which the converter asks for a tip. */
export type ConverterDownload = 'converted' | 'rack';

/** The downloads after which a static page asks for a tip. */
export type PageDownload = 'drum-map' | 'note-map' | 'rack';

/** What each event carries, by name: the one list of what the app and the static pages send. */
export interface StatEvents {
  'converter-opened': { page: 'index' | 'engine' | 'pair' | 'doc'; from?: string; to?: string };
  'maps-filtered': { page: 'index' | 'engine' | 'drum-maps' };
  'drum-map-downloaded': { engine: string; daw: 'reaper' | 'cubase' | 'studio-one' | 'ableton' | 'logic'; page: 'engine' | 'drum-maps' };
  'note-map-downloaded': { engine: string; page: 'engine' | 'drum-maps' };
  'rack-downloaded': { where: 'summary' | 'preset'; edited: boolean } | { where: 'pair' };
  'page-shared': { page: HandoffPage; how: SharedHow };
  'language-offered': { to: Locale };
  'language-offer-answered': { to: Locale; answer: 'accepted' | 'dismissed' | 'ignored' };
  'engine-picked': { side: 'from' | 'to'; id: string; via: 'list' | 'filter' | 'favorite' };
  'engines-swapped': { where: 'button' | 'done' };
  'engine-starred': { id: string; on: boolean };
  'file-removed': { all: boolean };
  'setting-changed':
    | { setting: 'octave'; value: 'c1' | 'c2' }
    | { setting: 'channel'; value: 'auto' | 'all' | 'one' }
    | { setting: 'missing'; value: MissingDrums }
    | { setting: 'unrecognized'; value: Unrecognized };
  'midi-added': { files: number; via: 'picker' | 'drop' | 'sample'; unreadable: number };
  'parts-asked': { parts: number };
  'parts-offer-taken': { parts: number };
  'sample-used': { converted: boolean };
  'preset-imported': { files: number; skipped: number; failed: number };
  converted: {
    from: string;
    to: string;
    pair: `${string}>${string}`;
    files: number;
    failed: number;
    damaged: number;
    channel: 'auto' | 'all' | 'one' | 'parts';
    offered: number;
    untouched: number;
    missing: MissingDrums;
    edited: boolean;
    preset: boolean;
    dropped: number;
    approximated: number;
    unrecognized: number;
    unrecognizedNotes: string;
    droppedDrums: string;
    approximatedDrums: string;
    closer: SuggestedProp;
    missed: ShareBucket;
    lost: ShareBucket;
    via: SrcViaKind;
    asked: 'none' | 'anyway' | 'switched';
  };
  'convert-failed': { from: string; to: string; kind: ErrorKind };
  downloaded: { files: number; how: 'single' | 'file' | 'zip' };
  'editor-opened': {
    show: 'all' | 'changed' | 'issues';
    from: 'summary' | 'missing' | 'report' | 'done' | 'preset' | 'history';
  };
  'file-failed': { kind: ErrorKind; files: number };
  'convert-again': undefined;
  'report-opened': undefined;
  'report-fix-used': { fix: 'pick-target' | 'assign' | 'channel-hint' };
  'missing-dropped': { where: 'done' | 'report' };
  'done-wrong-source': undefined;
  'done-assign-unrecognized': undefined;
  'source-suggestion-used': { engine: string; where: SuggestionPlace };
  'source-reverted': undefined;
  'source-asked': { missed: ShareBucket; engine: string; via: SrcViaKind };
  'source-answered': { answer: 'switched' | 'picked' | 'anyway' | 'dismissed' };
  'mapping-reported': { from: string; to: string; missed: ShareBucket; lost: ShareBucket; closer: SuggestedProp };
  'editor-closed': {
    how: 'done' | 'back' | 'history';
    targets: number;
    sources: number;
    keyboard: number;
    list: number;
    filtered: boolean;
    resets: number;
  };
  'editor-reset': undefined;
  'plan-failed': { kind: ErrorKind };
  'preset-saved': { how: 'new' | 'update'; stored: boolean; edits: number };
  'preset-loaded': undefined;
  'preset-managed': { action: 'rename' | 'duplicate' | 'export' | 'delete' };
  'presets-unsaved': undefined;
  'language-picked': { to: Locale; where: 'app' | 'page' };
  'section-opened': { section: SectionKey };
  'nav-used': { target: RouteName | SectionKey; where: 'header' | 'footer' };
  'contact-used': { link: 'issues' | 'email' };
  'tip-asked': { site: 'converter'; after: ConverterDownload } | { site: 'static'; after: PageDownload };
  'tip-answered': { answer: '3' | '5' | '10' | 'other' | 'closed'; where: 'toast' | 'footer'; site: TipSite };
  'load-failed': { kind: ErrorKind | 'locale'; detail: string };
  crashed: { error: string; thrown: string; components: string };
  'storage-cleared': undefined;
}

/** Every event name. */
export type StatEvent = keyof StatEvents;

/** The events only the static pages send, which never pass through the tier switch. */
export type StaticOnlyEvent = 'converter-opened' | 'maps-filtered' | 'drum-map-downloaded' | 'note-map-downloaded' | 'language-offered' | 'language-offer-answered';

/** The events the app sends through `track`. */
export type AppEvent = Exclude<StatEvent, StaticOnlyEvent>;

/** The arguments after an event's name: its properties, or none when it has none. */
export type StatArgs<E extends StatEvent> = StatEvents[E] extends undefined ? [] : [props: StatEvents[E]];

declare global {
  interface Window {
    umami?: { track: (event: string, props?: StatEvents[StatEvent]) => void };
  }
}

/** Counts `event` in Umami; does nothing when its script is absent, blocked or off-domain. */
export function send<E extends StatEvent>(event: E, ...props: StatArgs<E>): void {
  window.umami?.track(event, ...props);
}

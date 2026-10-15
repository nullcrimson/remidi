import type { Locale, RouteName, SectionKey } from '../generated/i18n';
import type { AppError } from './errors';
import type { MissingDrums } from './midiremap';

/** The kinds of error the events name: the app's own. */
export type ErrorKind = AppError['kind'];

/** What each event carries, by name: the one list of what the app and the static pages send. */
export interface StatEvents {
  'converter-opened': { page: 'index' | 'engine' | 'pair' | 'doc'; from?: string; to?: string };
  'maps-filtered': { page: 'index' | 'engine' | 'drum-maps' };
  'drum-map-downloaded': { engine: string; daw: 'reaper' | 'cubase' | 'studio-one'; page: 'engine' | 'drum-maps' };
  'language-offered': { to: Locale };
  'language-offer-answered': { to: Locale; answer: 'accepted' | 'dismissed' };
  'engine-picked': { side: 'from' | 'to'; id: string; via: 'list' | 'filter' | 'favorite' };
  'engines-swapped': undefined;
  'engine-starred': { id: string; on: boolean };
  'file-removed': { all: boolean };
  'setting-changed':
    | { setting: 'octave'; value: 'c1' | 'c2' }
    | { setting: 'channel'; value: 'auto' | 'all' | 'one' }
    | { setting: 'missing'; value: MissingDrums };
  'midi-added': { files: number; via: 'picker' | 'drop'; unreadable: number };
  'preset-imported': { files: number; skipped: number; failed: number };
  converted: {
    from: string;
    to: string;
    pair: `${string}>${string}`;
    files: number;
    failed: number;
    missing: MissingDrums;
    edited: boolean;
    preset: boolean;
    dropped: number;
    approximated: number;
    unrecognized: number;
  };
  'convert-failed': { from: string; to: string; kind: ErrorKind };
  downloaded: { files: number; how: 'single' | 'file' | 'zip' };
  'editor-opened': {
    show: 'all' | 'changed' | 'issues';
    from: 'summary' | 'missing' | 'report' | 'preset' | 'history';
  };
  'file-failed': { kind: ErrorKind; files: number };
  'convert-again': undefined;
  'report-opened': undefined;
  'report-fix-used': { fix: 'pick-target' | 'assign' | 'channel-hint' };
  'missing-dropped': { where: 'done' | 'report' };
  'mapping-reported': undefined;
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
  'tip-asked': undefined;
  'tip-answered': { answer: '3' | '5' | '10' | 'other' | 'closed'; where: 'toast' | 'footer' };
  'load-failed': { kind: ErrorKind | 'locale' };
  crashed: undefined;
  'storage-cleared': undefined;
}

/** Every event name. */
export type StatEvent = keyof StatEvents;

/** The events only the static pages send, which never pass through the tier switch. */
export type StaticOnlyEvent = 'converter-opened' | 'maps-filtered' | 'drum-map-downloaded' | 'language-offered' | 'language-offer-answered';

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

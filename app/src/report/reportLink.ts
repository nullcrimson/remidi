import type { EngineId, MissingDrums, Unrecognized } from '../core/midiremap';
import { wholeItems } from '../core/stats';
import type { StatEvents } from '../core/umami';
import type { Locale } from '../generated/i18n';

const FORM = 'https://tally.so/r/J95eYd';

/** The longest a list may be in the link, as encoded text. */
export const REPORT_LIST_CHARS = 200;

/** The longest the link may be: every list at its cut keeps it shorter. */
export const MAX_LINK_CHARS = 2000;

/** What a report is about: the pair and language, the build, and what the conversion read, lost and was set to. */
export interface ReportContext {
  from: EngineId;
  to: EngineId;
  lang: Locale;
  build: string | null;
  files: number;
  read: number;
  lost: number;
  unrecognizedNotes: string[];
  droppedDrums: string[];
  approximatedDrums: string[];
  suggested: EngineId | null;
  missing: MissingDrums;
  keep: Unrecognized;
  channel: StatEvents['converted']['channel'];
}

const KEY = 'v';

const encodedLength = (text: string) => new URLSearchParams({ [KEY]: text }).toString().length - `${KEY}=`.length;

/** `items` joined by commas, cut at whole items to `REPORT_LIST_CHARS` of encoded text. */
function listField(items: readonly string[]): string {
  return wholeItems(items, ',', REPORT_LIST_CHARS, encodedLength);
}

/** The no-account problem form, told what the report is about; an absent value is an empty field. */
export function reportLink(context: ReportContext): string {
  const fields = {
    from: context.from,
    to: context.to,
    lang: context.lang,
    build: context.build ?? '',
    files: String(context.files),
    read: String(context.read),
    lost: String(context.lost),
    unrecognized: listField(context.unrecognizedNotes),
    dropped: listField(context.droppedDrums),
    approximated: listField(context.approximatedDrums),
    closer: context.suggested ?? '',
    missing: context.missing,
    keep: context.keep,
    channel: context.channel,
  };
  return `${FORM}?${new URLSearchParams(fields)}`;
}

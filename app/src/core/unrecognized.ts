import type { Message } from '../generated/i18n';
import type { Unrecognized } from './midiremap';
import { optionsOf } from './options';

/** The name of each unrecognized-notes choice. */
export const UNRECOGNIZED_LABEL: Record<Unrecognized, Message> = {
  remove: { id: 'unrecognized-remove' },
  keep: { id: 'unrecognized-keep' },
};

export const UNRECOGNIZED_OPTIONS = optionsOf(UNRECOGNIZED_LABEL);

const HINTS: Record<Unrecognized, Message> = {
  remove: { id: 'unrecognized-hint-remove' },
  keep: { id: 'unrecognized-hint-keep' },
};

/** What `unrecognized` does with the notes the source layout does not recognize. */
export function unrecognizedHint(unrecognized: Unrecognized): Message {
  return HINTS[unrecognized];
}

import type { Message } from '../generated/i18n';
import type { Unrecognized } from './midiremap';

export const UNRECOGNIZED_OPTIONS: { value: Unrecognized; label: Message }[] = [
  { value: 'remove', label: { id: 'unrecognized-remove' } },
  { value: 'keep', label: { id: 'unrecognized-keep' } },
];

const HINTS: Record<Unrecognized, Message> = {
  remove: { id: 'unrecognized-hint-remove' },
  keep: { id: 'unrecognized-hint-keep' },
};

/** What `unrecognized` does with the notes the source layout does not recognize. */
export function unrecognizedHint(unrecognized: Unrecognized): Message {
  return HINTS[unrecognized];
}

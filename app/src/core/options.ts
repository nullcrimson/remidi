import type { Message } from '../generated/i18n';

/** A choice a setting offers: its value and the message that names it. */
export interface Option<V> {
  value: V;
  label: Message;
}

/** The options a record of labels names, in the record's order. */
export function optionsOf<V extends string>(labels: Record<V, Message>): Option<V>[] {
  return (Object.keys(labels) as V[]).map((value) => ({ value, label: labels[value] }));
}

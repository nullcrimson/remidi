import { Fragment } from 'react';
import type { ArgsOf, Message, MessageId } from '../generated/i18n';
import { useT } from '../locale/localeContext';
import type { ElementChildren } from './elementChildren';
import { slot, slotParts } from './slot';

type RichProps<I extends MessageId, S extends keyof ArgsOf[I] & string> = { id: I; slots: Record<S, ElementChildren> }
  & (Exclude<keyof ArgsOf[I], S> extends never ? { args?: undefined } : { args: Omit<ArgsOf[I], S> });

/** A whole-sentence message with elements in its slots, where the translation puts them. */
export function Rich<I extends MessageId, S extends keyof ArgsOf[I] & string>({ id, args, slots }: RichProps<I, S>) {
  const t = useT();
  const named = Object.fromEntries(Object.keys(slots).map((name) => [name, slot(name)]));
  const text = t({ id, args: { ...args, ...named } } as Message);
  return slotParts(text).map((part, i) => ('slot' in part
    ? <Fragment key={i}>{slots[part.slot as S]}</Fragment>
    : <span key={i}>{part.text}</span>));
}

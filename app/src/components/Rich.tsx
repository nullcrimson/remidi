import { Fragment, type ReactNode } from 'react';
import type { ArgsOf, Message, MessageId } from '../generated/i18n';
import { useT } from '../localeContext';
import { slot, slotParts } from './slot';

type RichProps<I extends MessageId, S extends keyof ArgsOf[I] & string> = { id: I; slots: Record<S, ReactNode> }
  & (Exclude<keyof ArgsOf[I], S> extends never ? { args?: undefined } : { args: Omit<ArgsOf[I], S> });

/** A whole-sentence message with elements in its slots, where the translation puts them. */
export function Rich<I extends MessageId, S extends keyof ArgsOf[I] & string>({ id, args, slots }: RichProps<I, S>) {
  const t = useT();
  const named = Object.fromEntries(Object.keys(slots).map((name) => [name, slot(name)]));
  const text = t({ id, args: { ...args, ...named } } as Message);
  return slotParts(text).map((part, i) => <Fragment key={i}>{'slot' in part ? slots[part.slot as S] : part.text}</Fragment>);
}

import type { ChannelScope, MissingDrums } from './midiremap';
import type { KnownEdits } from './overrides';

/**
 * A change to what is being converted. The screen hands each one to every reducer that
 * depends on the selection (the selection itself, the note editor, the converter), and
 * each decides what it means for its own state.
 */
export type SelectionEvent
  = | { type: 'chooseSrc'; id: string }
    | { type: 'chooseTgt'; id: string }
    | { type: 'swap' }
    | { type: 'preselect'; src: string | null; tgt: string | null }
    | {
      type: 'loadMapping';
      src: string;
      tgt: string;
      presetId: string | null;
      known: KnownEdits;
    }
    | { type: 'setChannel'; channel: ChannelScope }
    | { type: 'setMissing'; missing: MissingDrums };

/** Whether the event picks another engine pair, so edits made for the old one no longer apply. */
export function changesPair(event: SelectionEvent): boolean {
  switch (event.type) {
    case 'chooseSrc':
    case 'chooseTgt':
    case 'swap':
    case 'preselect':
    case 'loadMapping':
      return true;
    case 'setChannel':
    case 'setMissing':
      return false;
  }
}

import type { Channel } from './channel';
import type { Missing } from './missing';
import type { Edits, SrcEdits } from './overrides';

/**
 * A change to what is being converted. The screen hands each one to every reducer that
 * depends on the selection (the selection itself, the note editor, the converter), and
 * each decides what it means for its own state.
 */
export type SelectionEvent
  = | { type: 'chooseSrc'; id: string }
    | { type: 'chooseTgt'; id: string }
    | { type: 'swap' }
    | { type: 'preselect'; src: string; tgt: string }
    | {
      type: 'loadMapping';
      src: string;
      tgt: string;
      presetId: string | null;
      edits: Edits;
      srcEdits: SrcEdits;
    }
    | { type: 'setChannel'; channel: Channel }
    | { type: 'setMissing'; missing: Missing };

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

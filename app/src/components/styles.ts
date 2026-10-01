export type ChipState = 'on' | 'changed' | 'off';
export type ChipSize = 'sm' | 'md';

const CHIP_BASE = 'tap rounded-chip border font-mono font-semibold transition-colors';

const CHIP_SIZE: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-label pointer-coarse:px-3 pointer-coarse:py-3',
  md: 'min-w-14 px-2.5 py-1 text-ui',
};

const CHIP_STATE: Record<ChipState, string> = {
  on: 'border-accent bg-accent/15 text-t1',
  changed: 'border-accent/40 bg-accent/6 text-t1 hover:border-accent',
  off: 'border-white/12 text-t4 hover:border-accent/40 hover:text-t1',
};

/** Classes for the one chip every picker, tab and note badge wears. */
export function chip(state: ChipState, size: ChipSize): string {
  return `${CHIP_BASE} ${CHIP_SIZE[size]} ${CHIP_STATE[state]}`;
}

export type TagTone = 'neutral' | 'gold' | 'danger';

const TAG_TONE: Record<TagTone, string> = {
  neutral: 'border-white/12 text-t3',
  gold: 'border-star/40 text-star',
  danger: 'border-danger/40 text-danger',
};

/** Classes for a read-only outcome tag: counts on the done card and per file. */
export function tag(tone: TagTone): string {
  return `rounded-chip border px-2 py-0.5 font-mono text-label ${TAG_TONE[tone]}`;
}

export type TextTone = 'default' | 'danger';

const TEXT_TONE: Record<TextTone, string> = {
  default: 'text-t2 hover:text-accent disabled:hover:text-t2',
  danger: 'text-t4 hover:text-danger',
};

/** In-app action link: quiet text that lights up to the accent. */
export function textAction(tone: TextTone = 'default'): string {
  return `
    tap inline-flex items-center gap-1.5 text-ui transition-colors
    disabled:cursor-default disabled:opacity-40
    ${TEXT_TONE[tone]}
  `;
}

/** Text input; 16px below `sm` so phones do not zoom on focus. */
export function field(mono: boolean): string {
  return `
    rounded-chip border border-field-border bg-field px-2 py-1.25 text-body
    text-t2 transition-colors outline-none
    placeholder:text-t5
    focus:border-accent/40
    aria-invalid:border-danger/60
    pointer-coarse:py-2.5
    ${mono ? 'font-mono sm:text-label' : 'sm:text-ui'}
  `;
}

/** Column template shared by the edit view's rows and their header. */
export const ROW_GRID = `
  grid grid-cols-[minmax(0,1fr)_auto_12px_auto_1.25rem] items-center gap-x-2 gap-y-1
  sm:grid-cols-[minmax(0,1fr)_auto_16px_auto_9rem_1.25rem] sm:gap-x-3
`;

type ChipState = 'on' | 'changed' | 'off';
type ChipSize = 'sm' | 'md';

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

export type TextTone = 'default' | 'danger' | 'link';

const TEXT_TONE: Record<TextTone, string> = {
  default: 'text-t2 hover:text-accent disabled:hover:text-t2',
  danger: 'text-t4 hover:text-danger',
  link: 'prose-link',
};

/** In-app action link: quiet text that lights up to the accent; `link` marks one that takes you elsewhere. */
export function textAction(tone: TextTone = 'default'): string {
  return `
    tap inline-flex items-center gap-1.5 text-ui transition-colors
    disabled:cursor-default disabled:opacity-40
    ${TEXT_TONE[tone]}
  `;
}

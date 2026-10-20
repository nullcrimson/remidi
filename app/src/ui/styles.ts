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

export type RowState = 'selected' | 'idle' | 'disabled';

const ROW_BASE = 'border-l-2 transition-colors';

const ROW_STATE: Record<RowState, string> = {
  selected: 'border-accent font-semibold text-t1',
  idle: 'border-transparent text-t4 hover:text-t1',
  disabled: 'border-transparent text-t5 opacity-40',
};

/** Classes for the left rule, colour and weight of a pickable list row. */
export function rowState(state: RowState): string {
  return `${ROW_BASE} ${ROW_STATE[state]}`;
}

/** The tip's width cap as a Tailwind class, the one place it is stated. */
export const TIP_MAX_WIDTH_CLASS = 'max-w-70';

const TIP_LOOK = `
  pointer-events-none fixed z-50 ${TIP_MAX_WIDTH_CLASS} rounded-panel border
  border-accent/25 bg-ink px-2.5 py-1.5 font-sans text-ui/tight text-t1
  shadow-tip
`;

/** Classes for the small dark tip that a tooltip and the pointer-following reason both wear. */
export function tip(): string {
  return TIP_LOOK;
}

/** The tones of the `tag` utility in `index.css`, which has one rule per tone. */
export const TAG_TONES = ['neutral', 'gold', 'danger'] as const;

export type TagTone = typeof TAG_TONES[number];

/** Props for an outcome tag, the `tag` utility the static pages wear too: counts on the done card and per file. */
export function tag(tone: TagTone): { className: string; 'data-tone': TagTone } {
  return { className: 'tag', 'data-tone': tone };
}

export type LabelTone = 'faint' | 'muted' | 'strong' | 'gold' | 'danger';

const LABEL_TONE: Record<LabelTone, string> = {
  faint: 'text-t5',
  muted: 'text-t4',
  strong: 'text-t2',
  gold: 'text-star',
  danger: 'text-danger',
};

/** The text colour of a small label or a row's result. */
export function labelText(tone: LabelTone): string {
  return LABEL_TONE[tone];
}

export type TextTone = 'default' | 'danger' | 'link';

const TEXT_TONE: Record<TextTone, string> = {
  default: `
    text-star/85 decoration-star/40 underline-offset-4
    hover:text-star hover:underline
    disabled:hover:text-star/85 disabled:hover:no-underline
  `,
  danger: 'text-t4 hover:text-danger',
  link: 'prose-link',
};

/** In-app action link: gold text, the one colour of every action, underlined on hover; `link` marks one that takes you elsewhere. */
export function textAction(tone: TextTone = 'default'): string {
  return `
    tap inline-flex items-center gap-1.5 text-ui transition-colors
    disabled:cursor-default disabled:opacity-40
    ${TEXT_TONE[tone]}
  `;
}

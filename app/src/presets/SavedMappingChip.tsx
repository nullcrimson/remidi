import { useT } from '../locale/localeContext';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PresetName } from '../core/midiremap';
import type { SavedMapping } from './mappings';
import { ChipMenu, type ChipMenuItem } from './ChipMenu';
import { ChipRename } from './ChipRename';
import { engineCode } from '../core/engineCode';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

const CHIP_BOX = 'flex items-stretch overflow-hidden rounded-panel border border-hairline bg-field';

const ICON_BTN = `
  flex w-6 shrink-0 items-center justify-center border-l border-hairline
  pointer-coarse:w-11
  text-label text-t5 transition-colors
`;

export function SavedMappingChip({
  mapping,
  known,
  atCap,
  onLoad,
  onEdit,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  mapping: SavedMapping;
  known: boolean;
  atCap: boolean;
  onLoad: (m: SavedMapping) => void;
  onEdit: (m: SavedMapping) => void;
  onRename: (id: string, name: PresetName) => void;
  onDuplicate: (m: SavedMapping) => void;
  onExport: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const mainRef = useRef<HTMLButtonElement>(null);

  const overrideCount = Object.keys(mapping.edits).length + Object.keys(mapping.srcEdits).length;

  const endRename = (name: PresetName | null) => {
    flushSync(() => {
      if (name) onRename(mapping.id, name);
      setRenaming(false);
    });
    mainRef.current?.focus();
  };

  const managed = (action: StatEvents['preset-managed']['action'], run: ChipMenuItem['run']): ChipMenuItem['run'] => (focusButton) => {
    track('preset-managed', { action });
    run(focusButton);
  };

  const items: ChipMenuItem[] = [
    { label: t({ id: 'chip-rename' }), title: undefined, run: managed('rename', () => setRenaming(true)), disabled: false, danger: false },
    {
      label: t({ id: 'chip-duplicate' }),
      title: atCap ? t({ id: 'chip-at-cap' }) : undefined,
      run: managed('duplicate', (focusButton) => {
        onDuplicate(mapping);
        focusButton();
      }),
      disabled: atCap,
      danger: false,
    },
    { label: t({ id: 'chip-export' }), title: undefined, run: managed('export', () => onExport(mapping)), disabled: false, danger: false },
    { label: t({ id: 'chip-delete' }), title: undefined, run: managed('delete', () => onDelete(mapping.id)), disabled: false, danger: true },
  ];

  if (renaming) {
    return (
      <li className={CHIP_BOX}>
        <ChipRename name={mapping.name} onDone={endRename} />
      </li>
    );
  }

  return (
    <li className={CHIP_BOX}>
      <button
        ref={mainRef}
        data-chip-main
        type="button"
        disabled={!known}
        onClick={() => onLoad(mapping)}
        title={known ? t({ id: 'chip-overrides', args: { count: overrideCount } }) : t({ id: 'chip-unavailable' })}
        className="
          flex min-w-0 items-center gap-2 py-1.5 pr-2 pl-2.5 text-left text-ui
          enabled:hover:bg-white/3
          disabled:opacity-40
          pointer-coarse:py-3
        "
      >
        <span className="max-w-40 truncate text-t2">{mapping.name}</span>
        <span className="shrink-0 font-mono text-label text-t5">
          {engineCode(mapping.src)}→{engineCode(mapping.tgt)}
        </span>
      </button>
      <button
        type="button"
        aria-label={t({ id: 'chip-edit', args: { name: mapping.name } })}
        disabled={!known}
        onClick={() => onEdit(mapping)}
        className={`
          ${ICON_BTN}
          enabled:hover:bg-white/5 enabled:hover:text-accent
          disabled:opacity-40
        `}
      >
        ✎
      </button>
      <ChipMenu
        label={t({ id: 'chip-more', args: { name: mapping.name } })}
        items={items}
        buttonClass={`
          ${ICON_BTN}
          hover:bg-white/5 hover:text-t2
        `}
      />
    </li>
  );
}

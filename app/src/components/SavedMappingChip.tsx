import { t } from '../i18n';
import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react';
import type { SavedMapping } from '../lib/mappings';
import { shortCode } from '../lib/format';
import { IconButton } from './IconButton';
import { TextField } from './TextField';

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
  onRename: (id: string, name: string) => void;
  onDuplicate: (m: SavedMapping) => void;
  onExport: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const moreId = useId();
  const focusMore = () =>
    document.querySelector<HTMLElement>(`[data-more="${moreId}"]`)?.focus();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: (open, _event, reason) => {
      setMenuOpen(open);
      if (!open && reason === 'escape-key') focusMore();
    },
    placement: 'bottom-end',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'menu' }),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      loop: true,
    }),
  ]);

  const overrideCount = Object.keys(mapping.edits).length + Object.keys(mapping.srcEdits).length;

  const startRename = () => {
    setMenuOpen(false);
    setDraft(mapping.name);
    setRenaming(true);
  };
  const mainRef = useRef<HTMLButtonElement>(null);
  const endRename = (name: string | null) => {
    flushSync(() => {
      if (name) onRename(mapping.id, name);
      setRenaming(false);
    });
    mainRef.current?.focus();
  };
  const commitRename = () => endRename(draft.trim());

  const items = [
    { key: 'rename', label: t({ id: 'chip-rename' }), run: startRename, disabled: false, danger: false },
    { key: 'duplicate', label: t({ id: 'chip-duplicate' }), run: () => onDuplicate(mapping), disabled: atCap, danger: false },
    { key: 'export', label: t({ id: 'chip-export' }), run: () => onExport(mapping), disabled: false, danger: false },
    { key: 'delete', label: t({ id: 'chip-delete' }), run: () => onDelete(mapping.id), disabled: false, danger: true },
  ];

  if (renaming) {
    return (
      <li className="
        flex items-stretch overflow-hidden rounded-panel border border-hairline
        bg-field
      "
      >
        <div className="flex items-center gap-1 p-1">
          <TextField
            mono
            value={draft}
            autoFocus
            aria-label={t({ id: 'chip-rename-label', args: { name: mapping.name } })}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') endRename(null);
            }}
            className="w-32 min-w-0"
          />
          <IconButton label={t({ id: 'chip-rename-save' })} size="sm" onClick={commitRename}>✓</IconButton>
          <IconButton label={t({ id: 'chip-rename-cancel' })} size="sm" onClick={() => endRename(null)}>×</IconButton>
        </div>
      </li>
    );
  }

  return (
    <li className="
      flex items-stretch overflow-hidden rounded-panel border border-hairline
      bg-field
    "
    >
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
          {shortCode(mapping.src)}→{shortCode(mapping.tgt)}
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
      <button
        ref={refs.setReference}
        data-more={moreId}
        type="button"
        aria-label={t({ id: 'chip-more', args: { name: mapping.name } })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        {...getReferenceProps()}
        className={`
          ${ICON_BTN}
          hover:bg-white/5 hover:text-t2
        `}
      >
        ⋯
      </button>
      {menuOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus={false}>
            <div
              // eslint-disable-next-line react-hooks/refs -- Floating UI setFloating is a callback-ref setter, not a during-render ref read
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="
                z-50 min-w-36 overflow-hidden rounded-panel border
                border-hairline bg-ink p-1 shadow-popover
              "
            >
              {items.map((it, i) => (
                <div key={it.key}>
                  {it.key === 'delete' && (
                    <div role="separator" className="my-1 h-px bg-hairline" />
                  )}
                  <button
                    ref={(node) => {
                      listRef.current[i] = node;
                    }}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.key === 'duplicate' && atCap ? t({ id: 'chip-at-cap' }) : undefined}
                    {...getItemProps({
                      onClick: () => {
                        if (it.disabled) return;
                        if (it.key !== 'rename') setMenuOpen(false);
                        it.run();
                        if (it.key === 'duplicate') focusMore();
                      },
                    })}
                    className={`
                      flex w-full items-center rounded-chip px-2.5 py-1.5
                      text-left text-ui transition-colors
                      disabled:opacity-40
                      pointer-coarse:py-3
                      ${it.danger
                  ? `
                    text-t3
                    hover:bg-danger/10 hover:text-danger
                  `
                  : `
                    text-t3
                    hover:bg-white/5 hover:text-t1
                  `}
                      ${i === activeIndex ? 'bg-white/5 text-t1' : ''}
                    `}
                  >
                    {it.label}
                  </button>
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </li>
  );
}

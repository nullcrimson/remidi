import { useRef, useState } from 'react';
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

const ICON_BTN = `
  flex w-6 shrink-0 items-center justify-center border-l border-hairline
  text-[11px] text-t5 transition-colors
`;

export function SavedMappingChip({
  mapping,
  known,
  atCap,
  onLoad,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
}: {
  mapping: SavedMapping;
  known: boolean;
  atCap: boolean;
  onLoad: (m: SavedMapping) => void;
  onEdit: (m: SavedMapping) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
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
  const commitRename = () => {
    const name = draft.trim();
    if (name) onRename(mapping.id, name);
    setRenaming(false);
  };

  const items = [
    { key: 'rename', label: 'Rename', run: startRename, disabled: false, danger: false },
    { key: 'duplicate', label: 'Duplicate', run: () => onDuplicate(mapping), disabled: atCap, danger: false },
    { key: 'delete', label: 'Delete', run: () => onDelete(mapping.id), disabled: false, danger: true },
  ];

  if (renaming) {
    return (
      <li className="
        flex items-stretch overflow-hidden rounded-[9px] border border-hairline
        bg-field
      "
      >
        <div className="flex items-center gap-1 p-1">
          <input
            value={draft}
            autoFocus
            aria-label={`Rename ${mapping.name}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            className="
              w-32 min-w-0 rounded-md border border-field-border bg-field px-2
              py-1.25 font-mono text-[11px] text-t2 transition-colors
              outline-none
              focus:border-accent/40
            "
          />
          <button
            type="button"
            aria-label="Save name"
            onClick={commitRename}
            className="
              flex size-6 shrink-0 items-center justify-center rounded-md
              text-[12px] text-star
              hover:bg-white/5
            "
          >
            ✓
          </button>
          <button
            type="button"
            aria-label="Cancel rename"
            onClick={() => setRenaming(false)}
            className="
              flex size-6 shrink-0 items-center justify-center rounded-md
              text-[12px] text-t5
              hover:bg-white/5 hover:text-t2
            "
          >
            ×
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="
      flex items-stretch overflow-hidden rounded-[9px] border border-hairline
      bg-field
    "
    >
      <button
        type="button"
        disabled={!known}
        onClick={() => onLoad(mapping)}
        title={known ? `${overrideCount} overrides` : 'engine unavailable'}
        className="
          flex min-w-0 items-center gap-2 py-1.5 pr-2 pl-2.5 text-left
          text-[12px]
          enabled:hover:bg-white/3
          disabled:opacity-40
        "
      >
        <span className="max-w-40 truncate text-t2">{mapping.name}</span>
        <span className="shrink-0 font-mono text-[10px] text-t5">
          {shortCode(mapping.src)}→{shortCode(mapping.tgt)}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Edit notes for ${mapping.name}`}
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
        type="button"
        aria-label={`More actions for ${mapping.name}`}
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
          <FloatingFocusManager context={context} modal={false}>
            <div
              // eslint-disable-next-line react-hooks/refs -- Floating UI setFloating is a callback-ref setter, not a during-render ref read
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="
                z-50 min-w-36 overflow-hidden rounded-[9px] border
                border-hairline bg-ink p-1
                shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]
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
                    title={it.key === 'duplicate' && atCap ? 'preset limit reached' : undefined}
                    {...getItemProps({
                      onClick: () => {
                        if (it.disabled) return;
                        if (it.key !== 'rename') setMenuOpen(false);
                        it.run();
                      },
                    })}
                    className={`
                      flex w-full items-center rounded-[6px] px-2.5 py-1.5
                      text-left text-[12px] transition-colors
                      disabled:opacity-40
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

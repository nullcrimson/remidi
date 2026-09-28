import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { CardDropzone } from './components/CardDropzone';
import { CHANNEL_SELECT_ID, ChannelSelect } from './components/ChannelSelect';
import { ConvertButton } from './components/ConvertButton';
import { DonePanel } from './components/DonePanel';
import { EditView, type EditFilter } from './components/EditView';
import { FileChips } from './components/FileChips';
import { IconButton } from './components/IconButton';
import { LibraryList } from './components/LibraryList';
import { MissingDrumsSetting } from './components/MissingDrumsSetting';
import { OctaveToggle } from './components/OctaveToggle';
import { PlanErrorNotice } from './components/PlanErrorNotice';
import { ReportModal } from './components/ReportModal';
import { SavedMappingChips } from './components/SavedMappingChips';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { StatusNotice } from './components/StatusNotice';
import { skipLink } from './components/styles';
import { SummaryRow } from './components/SummaryRow';
import { useDropGuard } from './hooks/useDropGuard';
import { useEditedSummary } from './hooks/useEditedSummary';
import { useFavorites } from './hooks/useFavorites';
import { useRemapper } from './hooks/useRemapper';
import { useSavedMappings } from './hooks/useSavedMappings';
import { convertBlocker } from './lib/blocker';
import type { OnFiles } from './lib/files';
import {
  CONVERT_BUTTON_ID,
  EDIT_LINK_ID,
  engineFilterId,
  FILE_PICKER_ID,
  focusById,
  MAIN_ID,
} from './lib/focusIds';
import { shortCode } from './lib/format';
import { parsePresetFile } from './lib/midiremap';
import { missingHint, swappedCanons } from './lib/missing';
import { downloadPreset } from './lib/presetFile';
import { importPresets, skippedNotice } from './lib/presetImport';
import { buildReport } from './lib/report';

function Page({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center px-5 pt-[6vh] pb-16"
    >
      <div
        data-testid="page-column"
        className={`
          flex w-200 max-w-full flex-col gap-5
          ${wide
      ? `
        lg:w-240
        xl:w-280
      `
      : ''}
        `}
      >
        <a
          href={`#${MAIN_ID}`}
          onClick={(e) => {
            e.preventDefault();
            focusById(MAIN_ID);
          }}
          className={skipLink}
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <main
      id={MAIN_ID}
      tabIndex={-1}
      className="
        w-full overflow-clip rounded-card border border-hairline bg-card
        shadow-[0_0_64px_-16px_rgba(199,192,173,0.09),0_18px_48px_-28px_rgba(0,0,0,0.6)]
        outline-none
      "
    >
      {children}
    </main>
  );
}

function Intro() {
  return (
    <p className="text-ui/relaxed text-t4">
      Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2,
      General MIDI, Guitar Pro and 80+ other engine layouts. Runs in your browser; files are never
      uploaded.
    </p>
  );
}

export default function App() {
  useDropGuard();
  const c = useRemapper();
  const favFrom = useFavorites('from');
  const favTo = useFavorites('to');
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const [assignNote, setAssignNote] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editShow, setEditShow] = useState<EditFilter>('all');
  const openPreset = saved.mappings.find((m) => m.id === c.presetId);
  const edited = useEditedSummary(c.editor, c.oct, openPreset);
  const { addFiles: storeFiles, src, tgt } = c;
  const { mappings, save: savePreset } = saved;
  const addFiles = useCallback<OnFiles>(
    (files, skipped, presets = []) => {
      if (presets.length > 0) setNotice(importPresets(presets, mappings, parsePresetFile, savePreset));
      if (files.length === 0 && skipped.length === 0) return;
      flushSync(() => storeFiles(files, skipped));
      if (files.length === 0) return;
      focusById(!src ? engineFilterId('FROM') : !tgt ? engineFilterId('TO') : CONVERT_BUTTON_ID);
    },
    [storeFiles, src, tgt, mappings, savePreset],
  );
  const reportView = useMemo(
    () => buildReport(c.results, c.editor.canonOptions, c.editor.targetDrums, c.oct),
    [c.results, c.editor.canonOptions, c.editor.targetDrums, c.oct],
  );
  const swapped = useMemo(() => swappedCanons(c.editor.rows), [c.editor.rows]);
  const canDropMissing
    = c.missing === 'nearest'
      && reportView.groups.approximated.some((e) => e.canon !== undefined && swapped.has(e.canon));
  const dropMissing = canDropMissing ? () => void c.dropMissingAndConvert() : undefined;
  const targetName = c.engines.find((e) => e.id === c.tgt)?.name ?? c.tgt;
  const sourceName = c.engines.find((e) => e.id === c.src)?.name ?? c.src;

  if (c.view === 'edit') {
    return (
      <Page>
        <Card>
          <EditView
            editor={c.editor}
            src={c.src}
            tgt={c.tgt}
            srcName={sourceName}
            tgtName={targetName}
            oct={c.oct}
            existingPreset={openPreset}
            presetsAtCap={saved.atCap}
            assignNote={assignNote}
            initialShow={editShow}
            setView={(v) => {
              flushSync(() => {
                setAssignNote(null);
                setEditShow('all');
                c.setView(v);
              });
              if (v === 'convert') focusById(EDIT_LINK_ID);
            }}
            onSavePreset={(name) => {
              const id = saved.save({
                name,
                src: c.src,
                tgt: c.tgt,
                edits: c.editor.edits,
                srcEdits: c.editor.srcEdits,
              });
              if (id) c.setPreset(id);
            }}
            onUpdatePreset={(id, name) =>
              saved.update(id, { name, edits: c.editor.edits, srcEdits: c.editor.srcEdits })}
          />
        </Card>
      </Page>
    );
  }

  const bothSelected = c.src !== '' && c.tgt !== '';
  const targetShort = shortCode(c.tgt);

  return (
    <Page wide>
      <Card>
        <CardDropzone onFiles={addFiles}>
          <div className="
            flex flex-col gap-7 p-5
            sm:p-[34px_34px_30px]
          "
          >
            <Intro />

            {c.status === 'loading' && (
              <p className="text-ui text-t3">Loading converter…</p>
            )}

            {c.status === 'error' && (
              <p className="text-ui text-danger">Failed to load converter: {c.error}</p>
            )}

            {c.status === 'ready' && (
              <>
                <FileChips
                  files={c.files}
                  failures={c.failures}
                  skipped={c.skipped}
                  onFiles={addFiles}
                  onRemove={c.removeFile}
                  onClear={c.clearFiles}
                />

                <div className="
                  grid grid-cols-1 gap-3
                  sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4
                "
                >
                  <LibraryList
                    label="FROM"
                    value={c.src}
                    disabledId={c.tgt}
                    engines={c.engines}
                    onChange={c.chooseSrc}
                    favorites={favFrom.favorites}
                    onToggleFavorite={favFrom.toggleFavorite}
                  />
                  <div className="
                    flex justify-center
                    sm:pt-8
                  "
                  >
                    <IconButton label="Swap FROM and TO" disabled={!c.src && !c.tgt} onClick={c.swap}>
                      <span className="
                        inline-block rotate-90
                        sm:rotate-0
                      "
                      >⇄
                      </span>
                    </IconButton>
                  </div>
                  <LibraryList
                    label="TO"
                    value={c.tgt}
                    disabledId={c.src}
                    engines={c.engines}
                    onChange={c.chooseTgt}
                    favorites={favTo.favorites}
                    onToggleFavorite={favTo.toggleFavorite}
                  />
                </div>

                {notice && <StatusNotice message={notice} onDismiss={() => setNotice(null)} />}

                <SavedMappingChips
                  fallbackFocusId={engineFilterId('FROM')}
                  mappings={saved.mappings}
                  engines={c.engines}
                  atCap={saved.atCap}
                  onLoad={(m) => setNotice(skippedNotice(m.name, c.loadMapping(m)))}
                  onEdit={(m) => {
                    setNotice(skippedNotice(m.name, c.loadMapping(m)));
                    c.setView('edit');
                  }}
                  onRename={saved.rename}
                  onDuplicate={(m) =>
                    saved.save({
                      name: `${m.name} copy`,
                      src: m.src,
                      tgt: m.tgt,
                      edits: m.edits,
                      srcEdits: m.srcEdits,
                    })}
                  onExport={downloadPreset}
                  onDelete={saved.remove}
                />

                <div className="
                  grid grid-cols-1 gap-5.5
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
                >
                  <OctaveToggle value={c.oct} onChange={c.setOct} />
                  <ChannelSelect value={c.channel} onChange={c.setChannel} />
                  <MissingDrumsSetting
                    value={c.missing}
                    hint={missingHint(c.missing, c.editor.rows)}
                    onChange={c.setMissing}
                  />
                </div>

                {bothSelected && c.editor.planError !== null && (
                  <PlanErrorNotice message={c.editor.planError} onReset={c.editor.reset} />
                )}

                {bothSelected && c.editor.planError === null && (
                  <SummaryRow
                    remapped={c.editor.remappedCount}
                    total={c.editor.rows.length}
                    onEdit={() => c.setView('edit')}
                    edited={edited.count > 0
                      ? {
                          ...edited,
                          onReview: () => {
                            setEditShow('changed');
                            c.setView('edit');
                          },
                        }
                      : undefined}
                  />
                )}

                {c.conv.kind === 'done' && c.results.length > 0
                  ? (
                      <DonePanel
                        results={c.results}
                        failures={c.failures}
                        view={reportView}
                        targetName={targetName}
                        targetShort={targetShort}
                        onViewReport={() => setReportOpen(true)}
                        onDropMissing={dropMissing}
                        editedDrums={edited.count}
                        onConvertMore={() => {
                          flushSync(() => c.clearFiles());
                          focusById(FILE_PICKER_ID);
                        }}
                      />
                    )
                  : (
                      <ConvertButton
                        conv={c.conv}
                        blockedBy={convertBlocker({ files: c.files.length, src: c.src, tgt: c.tgt })}
                        onConvert={() => void c.convert()}
                      />
                    )}

                {c.conv.kind === 'error' && c.error && (
                  <p
                    role="alert"
                    className="
                      rounded-chip bg-danger/10 p-3 text-ui text-danger
                    "
                  >
                    Error: {c.error}
                  </p>
                )}
              </>
            )}
          </div>
        </CardDropzone>
      </Card>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        view={reportView}
        sourceName={sourceName}
        targetName={targetName}
        onPickTarget={(canon) => {
          c.setView('edit');
          c.editor.openPick(canon);
        }}
        onAssignSource={(note) => {
          setAssignNote(note);
          c.setView('edit');
        }}
        onChannel={() => document.getElementById(CHANNEL_SELECT_ID)?.focus()}
        onDropMissing={dropMissing}
      />
    </Page>
  );
}

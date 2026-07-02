import { useMemo, useState, type ReactNode } from 'react';
import { AboutContent } from './components/AboutContent';
import { CardDropzone } from './components/CardDropzone';
import { ConvertButton } from './components/ConvertButton';
import { EditView } from './components/EditView';
import { FileChips } from './components/FileChips';
import { LibraryList } from './components/LibraryList';
import { OctaveToggle } from './components/OctaveToggle';
import { ReportModal } from './components/ReportModal';
import { SavedMappingChips } from './components/SavedMappingChips';
import { SummaryRow } from './components/SummaryRow';
import { useFavorites } from './hooks/useFavorites';
import { useRemapper } from './hooks/useRemapper';
import { useSavedMappings } from './hooks/useSavedMappings';
import { shortCode } from './lib/format';
import { buildReport } from './lib/report';

function Page({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center px-5 pt-[6vh] pb-16"
    >
      <div className="flex w-200 max-w-full flex-col gap-5">{children}</div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <main
      className="
        w-full overflow-hidden rounded-card border border-hairline bg-card
        shadow-[0_0_64px_-16px_rgba(199,192,173,0.09),0_18px_48px_-28px_rgba(0,0,0,0.6)]
      "
    >
      {children}
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-baseline gap-2">
        <h1
          className="
            font-display text-[15px] font-semibold tracking-[0.02em] text-t2
            [text-shadow:0_0_12px_rgba(236,232,224,0.3)]
          "
        >
          Remidi
        </h1>
        <span className="text-[12px] text-t5">— any kit, any engine</span>
      </div>
      <span className="font-mono text-[11px] text-t6">free in-browser converter</span>
    </div>
  );
}

export default function App() {
  const c = useRemapper();
  const favFrom = useFavorites('from');
  const favTo = useFavorites('to');
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const reportView = useMemo(
    () => buildReport(c.results, c.editor.rows, c.editor.targetDrums, c.oct),
    [c.results, c.editor.rows, c.editor.targetDrums, c.oct],
  );
  const targetName = c.engines.find((e) => e.id === c.tgt)?.name ?? c.tgt;

  if (c.view === 'edit') {
    return (
      <Page>
        <Card>
          <EditView
            editor={c.editor}
            src={c.src}
            tgt={c.tgt}
            oct={c.oct}
            existingPreset={saved.findPair(c.src, c.tgt)}
            presetsAtCap={saved.atCap}
            setView={c.setView}
            onSavePreset={(name) =>
              saved.save({
                name,
                src: c.src,
                tgt: c.tgt,
                edits: c.editor.edits,
                srcEdits: c.editor.srcEdits,
              })
            }
            onUpdatePreset={(id, name) =>
              saved.update(id, { name, edits: c.editor.edits, srcEdits: c.editor.srcEdits })
            }
          />
        </Card>
      </Page>
    );
  }

  const bothSelected = c.src !== '' && c.tgt !== '';
  const targetShort = shortCode(c.tgt);
  const failedSuffix = c.failures.length > 0 ? ` · ${c.failures.length} failed` : '';
  const summary = `${c.results.length} file${
    c.results.length === 1 ? '' : 's'
  } · ${c.editor.remappedCount} remapped → ${c.tgt}${failedSuffix}`;

  return (
    <Page>
      <Card>
        <CardDropzone onFiles={c.addFiles}>
          <div className="flex flex-col gap-7 p-[34px_34px_30px]">
            <Header />

            {c.status === 'loading' && (
              <p className="text-[13px] text-t3">Loading converter…</p>
            )}

            {c.status === 'error' && (
              <p className="text-[13px] text-danger">Failed to load converter: {c.error}</p>
            )}

            {c.status === 'ready' && (
              <>
                <FileChips
                  files={c.files}
                  failures={c.failures}
                  onFiles={c.addFiles}
                  onRemove={c.removeFile}
                  onClear={c.clearFiles}
                />

                <div className="grid grid-cols-2 gap-5.5">
                  <LibraryList
                    label="FROM"
                    value={c.src}
                    disabledId={c.tgt}
                    engines={c.engines}
                    onChange={c.chooseSrc}
                    favorites={favFrom.favorites}
                    onToggleFavorite={favFrom.toggleFavorite}
                  />
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

                <SavedMappingChips
                  mappings={saved.mappings}
                  engines={c.engines}
                  atCap={saved.atCap}
                  onLoad={c.loadMapping}
                  onEdit={(m) => {
                    c.loadMapping(m);
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
                    })
                  }
                  onDelete={saved.remove}
                />

                <OctaveToggle value={c.oct} onToggle={c.toggleOct} />

                <SummaryRow
                  remapped={c.editor.remappedCount}
                  total={c.editor.rows.length}
                  onEdit={() => c.setView('edit')}
                  disabled={!bothSelected}
                />

                <ConvertButton
                  conv={c.conv}
                  canConvert={c.files.length > 0 && bothSelected}
                  targetShort={targetShort}
                  summary={summary}
                  onConvert={c.convert}
                  onReset={c.reset}
                  onViewReport={() => setReportOpen(true)}
                />

                {c.conv.kind === 'error' && c.error && (
                  <p className="
                    rounded-sm bg-danger/10 p-3 text-[12px] text-danger
                  ">
                    Error: {c.error}
                  </p>
                )}
              </>
            )}
          </div>
        </CardDropzone>
      </Card>

      <AboutContent />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        view={reportView}
        targetName={targetName}
      />
    </Page>
  );
}

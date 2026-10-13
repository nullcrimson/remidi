import { useState } from 'react';
import { CardDropzone } from './convert/CardDropzone';
import { ConvertButton } from './convert/ConvertButton';
import { DonePanel } from './convert/DonePanel';
import { EditView } from './editor/EditView';
import { EngineColumns } from './engines/EngineColumns';
import { FileChips } from './convert/FileChips';
import { Card, Page } from './site/PageFrame';
import { PlanControls } from './convert/PlanControls';
import { ReportModal } from './report/ReportModal';
import { SavedMappingChips } from './presets/SavedMappingChips';
import { UnsavedNotice } from './presets/UnsavedNotice';
import { StatusNotice } from './ui/StatusNotice';
import { useDropGuard } from './convert/useDropGuard';
import { useConversionReport } from './report/useConversionReport';
import { useEditedSummary } from './editor/useEditedSummary';
import { useEditorHistory } from './editor/useEditorHistory';
import { useFileIntake } from './convert/useFileIntake';
import { useFocusIntent } from './ui/useFocusIntent';
import { usePresetActions } from './presets/usePresetActions';
import { useRemapper } from './convert/useRemapper';
import { useSavedMappings } from './presets/useSavedMappings';
import { convertBlocker } from './convert/blocker';
import type { EditFilter } from './editor/editFilter';
import { namesOf } from './core/enginePair';
import type { Note } from './core/midiremap';
import { downloadPreset } from './presets/presetFile';
import { ErrorText } from './ui/ErrorText';
import { Rich } from './ui/Rich';
import { useT } from './locale/localeContext';
import type { NoticeLine } from './core/notice';
import type { Runtime } from './convert/runtime';
import { track } from './core/stats';

function Intro() {
  const t = useT();
  return (
    <p className="text-ui/relaxed text-t4">
      {t({ id: 'app-intro' })}
    </p>
  );
}

export default function App({ runtime }: { runtime: Runtime }) {
  const t = useT();
  useDropGuard();
  const remapper = useRemapper(runtime);
  const { editor, view, pair, conv } = remapper;
  const focus = useFocusIntent();
  const [notice, setNotice] = useState<NoticeLine[] | null>(null);
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const presets = usePresetActions(
    {
      ...remapper,
      edits: editor.edits,
      srcEdits: editor.srcEdits,
      openEditor: () => remapper.openEditor('all', null),
    },
    saved,
    setNotice,
  );
  const openPreset = presets.open(remapper.presetId);
  const edited = useEditedSummary(editor, remapper.oct, openPreset);
  const { request } = focus;
  const addFiles = useFileIntake({
    load: runtime.load,
    storeFiles: remapper.addFiles,
    src: remapper.src,
    tgt: remapper.tgt,
    saved,
    notify: setNotice,
    focus: request,
  });
  const { view: reportView, dropMissing } = useConversionReport({ ...editor, ...remapper });
  const names = pair && namesOf(remapper.engines, pair);
  const blocker = convertBlocker({ files: remapper.files.length, pair: remapper.pair });
  const openEditor = (show: EditFilter = 'all', note: Note | null = null) => {
    track('editor-opened', { show });
    remapper.openEditor(show, note);
  };
  const closeEditor = () => {
    remapper.closeEditor();
    request('editLink');
  };
  useEditorHistory(view.kind === 'edit', { canOpen: pair !== null, open: openEditor, close: closeEditor });

  if (view.kind === 'edit') {
    const shown = namesOf(remapper.engines, view.pair);
    return (
      <Page onSkip={() => request('main')}>
        <Card mainRef={focus.ref('main')}>
          <EditView
            editor={editor}
            pair={view.pair}
            srcName={shown.source}
            tgtName={shown.target}
            oct={remapper.oct}
            existingPreset={openPreset}
            presetsAtCap={saved.atCap}
            presetsUnsaved={saved.unsaved}
            assignNote={view.assignNote}
            initialShow={view.show}
            onClose={closeEditor}
            onSavePreset={(name) => presets.save(view.pair, name)}
            onUpdatePreset={presets.update}
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page wide onSkip={() => request('main')}>
      <Card mainRef={focus.ref('main')}>
        <CardDropzone onFiles={addFiles}>
          <div className="
            flex flex-col gap-7 p-5
            sm:p-[34px_34px_30px]
          "
          >
            <Intro />

            {remapper.catalog.status === 'loading' && (
              <p className="text-ui text-t3">{t({ id: 'app-loading' })}
              </p>
            )}

            {remapper.catalog.status === 'error' && (
              <p className="text-ui text-danger"><ErrorText error={remapper.catalog.error} /></p>
            )}

            {remapper.catalog.status === 'ready' && (
              <>
                <FileChips
                  files={remapper.files}
                  failures={remapper.failures}
                  skipped={remapper.skipped}
                  onFiles={addFiles}
                  onRemove={remapper.removeFile}
                  onClear={remapper.clearFiles}
                  pickerRef={focus.ref('filePicker')}
                />

                <EngineColumns
                  engines={remapper.engines}
                  src={remapper.src}
                  tgt={remapper.tgt}
                  onChooseSrc={remapper.chooseSrc}
                  onChooseTgt={remapper.chooseTgt}
                  onSwap={remapper.swap}
                  fromRef={focus.ref('from')}
                  toRef={focus.ref('to')}
                />

                {notice && <StatusNotice lines={notice} onDismiss={() => setNotice(null)} />}

                {saved.unsaved && <UnsavedNotice />}

                <SavedMappingChips
                  onFocusFallback={() => request('from')}
                  mappings={saved.mappings}
                  engines={remapper.engines}
                  atCap={saved.atCap}
                  onLoad={presets.load}
                  onEdit={presets.edit}
                  onRename={saved.rename}
                  onDuplicate={presets.duplicate}
                  onExport={downloadPreset}
                  onDelete={saved.remove}
                />

                <PlanControls
                  remapper={remapper}
                  editor={editor}
                  edited={edited}
                  channelRef={focus.ref('channel')}
                  editRef={focus.ref('editLink')}
                  onOpenEditor={openEditor}
                />

                {conv.kind === 'done' && conv.results.length > 0
                  ? (
                      <DonePanel
                        results={conv.results}
                        failures={conv.failures}
                        view={reportView}
                        pair={conv.pair}
                        targetName={namesOf(remapper.engines, conv.pair).target}
                        onViewReport={() => setReportOpen(true)}
                        onDropMissing={dropMissing}
                        editedDrums={edited.count}
                        onConvertMore={() => {
                          remapper.clearFiles();
                          request('filePicker');
                        }}
                      />
                    )
                  : (
                      <ConvertButton
                        ref={focus.ref('convert')}
                        conv={conv}
                        blockedBy={blocker && { reason: t(blocker.reason), quiet: blocker.quiet }}
                        onConvert={() => void remapper.convert()}
                      />
                    )}

                {conv.kind === 'error' && (
                  <p
                    role="alert"
                    className="
                      rounded-chip bg-danger/10 p-3 text-ui text-danger
                    "
                  >
                    <Rich id="convert-error" slots={{ error: <ErrorText error={conv.error} /> }} />
                  </p>
                )}
              </>
            )}
          </div>
        </CardDropzone>
      </Card>

      {names && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          view={reportView}
          names={names}
          onPickTarget={(canon) => {
            openEditor();
            editor.openPick(canon);
          }}
          onAssignSource={(note) => openEditor('all', note)}
          onChannel={() => request('channel')}
          onDropMissing={dropMissing}
        />
      )}
    </Page>
  );
}

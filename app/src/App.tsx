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
import { engineCode } from './core/engineCode';
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
  const { editor } = remapper;
  const focus = useFocusIntent();
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const [assignNote, setAssignNote] = useState<Note | null>(null);
  const [notice, setNotice] = useState<NoticeLine[] | null>(null);
  const [editShow, setEditShow] = useState<EditFilter>('all');
  const presets = usePresetActions(
    { ...remapper, edits: editor.edits, srcEdits: editor.srcEdits },
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
  const targetName = remapper.engines.find((e) => e.id === remapper.tgt)?.name ?? remapper.tgt;
  const sourceName = remapper.engines.find((e) => e.id === remapper.src)?.name ?? remapper.src;
  const blocker = convertBlocker({ files: remapper.files.length, src: remapper.src, tgt: remapper.tgt });
  const openEditor = (show: EditFilter = 'all', note: Note | null = null) => {
    track('editor-opened', { show });
    setEditShow(show);
    setAssignNote(note);
    remapper.setView('edit');
  };
  const closeEditor = () => {
    setAssignNote(null);
    setEditShow('all');
    remapper.setView('convert');
    request('editLink');
  };
  useEditorHistory(remapper.view, { open: openEditor, close: closeEditor });

  if (remapper.view === 'edit') {
    return (
      <Page onSkip={() => request('main')}>
        <Card mainRef={focus.ref('main')}>
          <EditView
            editor={editor}
            src={remapper.src}
            tgt={remapper.tgt}
            srcName={sourceName}
            tgtName={targetName}
            oct={remapper.oct}
            existingPreset={openPreset}
            presetsAtCap={saved.atCap}
            assignNote={assignNote}
            initialShow={editShow}
            setView={(v) => (v === 'convert' ? closeEditor() : remapper.setView(v))}
            onSavePreset={presets.save}
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

            {remapper.status === 'loading' && <p className="text-ui text-t3">{t({ id: 'app-loading' })}</p>}

            {remapper.status === 'error' && (
              <p className="text-ui text-danger">{remapper.error && <ErrorText error={remapper.error} />}</p>
            )}

            {remapper.status === 'ready' && (
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
                  names={{ source: sourceName, target: targetName }}
                  channelRef={focus.ref('channel')}
                  editRef={focus.ref('editLink')}
                  onOpenEditor={openEditor}
                />

                {remapper.conv.kind === 'done' && remapper.results.length > 0
                  ? (
                      <DonePanel
                        results={remapper.results}
                        failures={remapper.failures}
                        view={reportView}
                        targetName={targetName}
                        targetShort={engineCode(remapper.tgt)}
                        from={remapper.src}
                        to={remapper.tgt}
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
                        conv={remapper.conv}
                        blockedBy={blocker && { reason: t(blocker.reason), quiet: blocker.quiet }}
                        onConvert={() => void remapper.convert()}
                      />
                    )}

                {remapper.conv.kind === 'error' && remapper.error && (
                  <p
                    role="alert"
                    className="
                      rounded-chip bg-danger/10 p-3 text-ui text-danger
                    "
                  >
                    <Rich id="convert-error" slots={{ error: <ErrorText error={remapper.error} /> }} />
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
          openEditor();
          editor.openPick(canon);
        }}
        onAssignSource={(note) => openEditor('all', note)}
        onChannel={() => request('channel')}
        onDropMissing={dropMissing}
      />
    </Page>
  );
}

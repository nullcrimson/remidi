import { useState } from 'react';
import { CardDropzone } from './components/CardDropzone';
import { ConvertButton } from './components/ConvertButton';
import { ConvertSettings } from './components/ConvertSettings';
import { DonePanel } from './components/DonePanel';
import { EditView } from './components/EditView';
import { EngineColumns } from './components/EngineColumns';
import { FileChips } from './components/FileChips';
import { Card, Page } from './components/PageFrame';
import { PlanErrorNotice } from './components/PlanErrorNotice';
import { ReportModal } from './components/ReportModal';
import { SavedMappingChips } from './components/SavedMappingChips';
import { StatusNotice } from './components/StatusNotice';
import { SummaryRow } from './components/SummaryRow';
import { useDropGuard } from './hooks/useDropGuard';
import { useConversionReport } from './hooks/useConversionReport';
import { useEditedSummary } from './hooks/useEditedSummary';
import { useFileIntake } from './hooks/useFileIntake';
import { useFocusIntent } from './hooks/useFocusIntent';
import { usePresetActions } from './hooks/usePresetActions';
import { useRemapper } from './hooks/useRemapper';
import { useSavedMappings } from './hooks/useSavedMappings';
import { convertBlocker } from './lib/blocker';
import type { EditFilter } from './lib/editFilter';
import { shortCode } from './lib/format';
import { missingHint } from './lib/missing';
import { downloadPreset } from './lib/presetFile';
import { ErrorText } from './components/ErrorText';
import { Rich } from './components/Rich';
import { t } from './i18n';
import type { NoticeLine } from './lib/notice';

function Intro() {
  return (
    <p className="text-ui/relaxed text-t4">
      {t({ id: 'app-intro' })}
    </p>
  );
}

export default function App() {
  useDropGuard();
  const c = useRemapper();
  const { editor } = c;
  const focus = useFocusIntent();
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const [assignNote, setAssignNote] = useState<number | null>(null);
  const [notice, setNotice] = useState<NoticeLine[] | null>(null);
  const [editShow, setEditShow] = useState<EditFilter>('all');
  const presets = usePresetActions(
    { ...c, edits: editor.edits, srcEdits: editor.srcEdits },
    saved,
    setNotice,
  );
  const openPreset = presets.open(c.presetId);
  const edited = useEditedSummary(editor, c.oct, openPreset);
  const { request } = focus;
  const addFiles = useFileIntake({
    storeFiles: c.addFiles,
    src: c.src,
    tgt: c.tgt,
    saved,
    notify: setNotice,
    focus: request,
  });
  const { view: reportView, dropMissing } = useConversionReport({ ...editor, ...c });
  const targetName = c.engines.find((e) => e.id === c.tgt)?.name ?? c.tgt;
  const sourceName = c.engines.find((e) => e.id === c.src)?.name ?? c.src;
  const blocker = convertBlocker({ files: c.files.length, src: c.src, tgt: c.tgt });
  const openEditor = (show: EditFilter = 'all', note: number | null = null) => {
    setEditShow(show);
    setAssignNote(note);
    c.setView('edit');
  };

  if (c.view === 'edit') {
    return (
      <Page onSkip={() => request('main')}>
        <Card mainRef={focus.ref('main')}>
          <EditView
            editor={editor}
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
              setAssignNote(null);
              setEditShow('all');
              c.setView(v);
              if (v === 'convert') request('editLink');
            }}
            onSavePreset={presets.save}
            onUpdatePreset={presets.update}
          />
        </Card>
      </Page>
    );
  }

  const bothSelected = c.src !== '' && c.tgt !== '';

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

            {c.status === 'loading' && <p className="text-ui text-t3">{t({ id: 'app-loading' })}</p>}

            {c.status === 'error' && (
              <p className="text-ui text-danger">{c.error && <ErrorText error={c.error} />}</p>
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
                  pickerRef={focus.ref('filePicker')}
                />

                <EngineColumns
                  engines={c.engines}
                  src={c.src}
                  tgt={c.tgt}
                  onChooseSrc={c.chooseSrc}
                  onChooseTgt={c.chooseTgt}
                  onSwap={c.swap}
                  fromRef={focus.ref('from')}
                  toRef={focus.ref('to')}
                />

                {notice && <StatusNotice lines={notice} onDismiss={() => setNotice(null)} />}

                <SavedMappingChips
                  onFocusFallback={() => request('from')}
                  mappings={saved.mappings}
                  engines={c.engines}
                  atCap={saved.atCap}
                  onLoad={presets.load}
                  onEdit={presets.edit}
                  onRename={saved.rename}
                  onDuplicate={presets.duplicate}
                  onExport={downloadPreset}
                  onDelete={saved.remove}
                />

                <ConvertSettings
                  oct={c.oct}
                  onOct={c.setOct}
                  channel={c.channel}
                  onChannel={c.setChannel}
                  channelRef={focus.ref('channel')}
                  missing={c.missing}
                  missingHint={t(missingHint(c.missing, editor.rows))}
                  onMissing={c.setMissing}
                />

                {bothSelected && editor.planError !== null && (
                  <PlanErrorNotice error={editor.planError} onReset={editor.reset} />
                )}

                {bothSelected && editor.planError === null && (
                  <SummaryRow
                    remapped={editor.remappedCount}
                    total={editor.rows.length}
                    onEdit={() => openEditor()}
                    editRef={focus.ref('editLink')}
                    edited={edited.count > 0 ? { ...edited, onReview: () => openEditor('changed') } : undefined}
                  />
                )}

                {c.conv.kind === 'done' && c.results.length > 0
                  ? (
                      <DonePanel
                        results={c.results}
                        failures={c.failures}
                        view={reportView}
                        targetName={targetName}
                        targetShort={shortCode(c.tgt)}
                        onViewReport={() => setReportOpen(true)}
                        onDropMissing={dropMissing}
                        editedDrums={edited.count}
                        onConvertMore={() => {
                          c.clearFiles();
                          request('filePicker');
                        }}
                      />
                    )
                  : (
                      <ConvertButton
                        ref={focus.ref('convert')}
                        conv={c.conv}
                        blockedBy={blocker && t(blocker)}
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
                    <Rich id="convert-error" slots={{ error: <ErrorText error={c.error} /> }} />
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

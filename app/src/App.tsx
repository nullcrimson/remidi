import { useCallback, useState, type ReactNode } from 'react';
import { CardDropzone } from './convert/CardDropzone';
import { CloserSourcesNotice } from './convert/CloserSourcesNotice';
import { EditView } from './editor/EditView';
import { EngineColumns } from './engines/EngineColumns';
import { FileChips } from './convert/FileChips';
import { Intro } from './convert/Intro';
import { Card, Page } from './site/PageFrame';
import { PopularConversions } from './site/PopularConversions';
import { PlanSettings } from './convert/PlanSettings';
import { PlanSummary } from './convert/PlanSummary';
import { ConvertStepEnd } from './convert/ConvertStepEnd';
import { ReportModal } from './report/ReportModal';
import { SavedMappingChips } from './presets/SavedMappingChips';
import { UnsavedNotice } from './presets/UnsavedNotice';
import { StatusNotice } from './ui/StatusNotice';
import { Step } from './convert/Step';
import { stepStates } from './convert/stepState';
import { isConverted } from './convert/useConverter';
import { CONVERTER_STEPS, type ConverterStep } from './locale/docs';
import { useDropGuard } from './convert/useDropGuard';
import { useConversionReport } from './report/useConversionReport';
import { useEditedSummary } from './editor/useEditedSummary';
import { useEditorSession } from './convert/useEditorSession';
import { useFileIntake } from './convert/useFileIntake';
import { useFocusIntent } from './ui/useFocusIntent';
import { usePresetActions } from './presets/usePresetActions';
import { useRemapper } from './convert/useRemapper';
import { useSampleFile } from './convert/useSampleFile';
import { useSavedMappings } from './presets/useSavedMappings';
import { namesOf, samePair } from './core/enginePair';
import { downloadPreset } from './presets/presetFile';
import { ErrorText } from './ui/ErrorText';
import { useT } from './locale/localeContext';
import type { Notice, NoticeLine } from './core/notice';
import { rackDownloads } from './convert/rack';
import type { Runtime } from './convert/runtime';

export default function App({ runtime }: { runtime: Runtime }) {
  const t = useT();
  useDropGuard();
  const remapper = useRemapper(runtime);
  const { editor, view, pair, conv } = remapper;
  const focus = useFocusIntent();
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((lines: NoticeLine[] | null) => setNotice(lines && { lines, at: 'engines' }), []);
  const saved = useSavedMappings();
  const [reportOpen, setReportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const presets = usePresetActions(
    {
      ...remapper,
      edits: editor.edits,
      srcEdits: editor.srcEdits,
      openEditor: () => openEditor('preset'),
    },
    saved,
    notify,
  );
  const openPreset = presets.open(remapper.presetId);
  const edited = useEditedSummary(editor, remapper.oct, openPreset);
  const { request } = focus;
  const intake = {
    load: runtime.load,
    storeFiles: remapper.addFiles,
    src: remapper.src,
    tgt: remapper.tgt,
    saved,
    notify,
    focus: request,
  };
  const pickFiles = useFileIntake({ ...intake, via: 'picker' });
  const dropFiles = useFileIntake({ ...intake, via: 'drop' });
  const core = remapper.catalog.status === 'ready' ? remapper.catalog.core : null;
  const trySample = useSampleFile({ ...intake, core, convert: remapper.convert });
  const { view: reportView, dropMissing } = useConversionReport({ ...editor, ...remapper });
  const names = pair && namesOf(remapper.engines, pair);
  const steps = stepStates({ file: remapper.files.length > 0, engines: pair !== null, convert: isConverted(conv) });
  const { open: openEditor, close: closeEditor } = useEditorSession(remapper, request);
  const dismissNotice = () => setNotice(null);
  const racks = rackDownloads(remapper, openPreset, setNotice);

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

  const stepBodies: Record<ConverterStep, ReactNode> = {
    file: (
      <FileChips
        files={remapper.files}
        failures={remapper.failures}
        skipped={remapper.skipped}
        onFiles={pickFiles}
        onTrySample={trySample}
        onRemove={remapper.removeFile}
        onClear={remapper.clearFiles}
        pickerRef={focus.ref('filePicker')}
      />
    ),
    engines: (
      <>
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

        <CloserSourcesNotice remapper={remapper} />

        {notice?.at === 'engines' && <StatusNotice lines={notice.lines} onDismiss={dismissNotice} />}

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
          onRack={racks.preset}
          onDelete={saved.remove}
        />

        <PlanSummary
          remapper={remapper}
          editor={editor}
          edited={edited}
          editRef={focus.ref('editLink')}
          onOpenEditor={openEditor}
          onRack={racks.summary}
        />

        {notice?.at === 'summary' && pair && samePair(notice.pair, pair) && (
          <StatusNotice lines={notice.lines} onDismiss={dismissNotice} />
        )}
      </>
    ),
    convert: (
      <>
        <PlanSettings
          remapper={remapper}
          editor={editor}
          open={settingsOpen}
          onToggle={setSettingsOpen}
          channelRef={focus.ref('channel')}
          onOpenEditor={openEditor}
        />

        <ConvertStepEnd
          remapper={remapper}
          reportView={reportView}
          editedDrums={edited.count}
          convertRef={focus.ref('convert')}
          onViewReport={() => setReportOpen(true)}
          onPickSource={() => request('from')}
          onDropMissing={dropMissing}
          onConvertMore={() => {
            remapper.clearFiles();
            request('filePicker');
          }}
        />
      </>
    ),
  };

  return (
    <Page
      wide
      loading={remapper.catalog.status === 'loading'}
      onSkip={() => request('main')}
      after={<PopularConversions engines={remapper.engines} />}
    >
      <Card mainRef={focus.ref('main')}>
        <CardDropzone onFiles={dropFiles}>
          <div className="
            flex flex-col gap-7 p-5
            sm:p-[34px_34px_30px]
          "
          >
            <Intro />

            {remapper.catalog.status === 'loading' && (
              <p className="text-ui text-t3">{t({ id: 'app-loading' })}</p>
            )}

            {remapper.catalog.status === 'error' && (
              <p className="text-ui text-danger"><ErrorText error={remapper.catalog.error} /></p>
            )}

            {remapper.catalog.status === 'ready' && CONVERTER_STEPS.map(({ key, title }, i) => (
              <Step key={key} number={i + 1} title={t({ id: title })} state={steps[key]}>
                {stepBodies[key]}
              </Step>
            ))}
          </div>
        </CardDropzone>
      </Card>

      {names && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          view={reportView}
          names={names}
          unrecognized={remapper.unrecognized}
          onPickTarget={(canon) => {
            openEditor('report');
            editor.openPick(canon);
          }}
          onAssignSource={(note) => openEditor('report', 'all', note)}
          onChannel={() => {
            setSettingsOpen(true);
            request('channel');
          }}
          onDropMissing={dropMissing}
        />
      )}
    </Page>
  );
}

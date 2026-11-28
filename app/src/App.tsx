import { useCallback, useState, type ReactElement } from 'react';
import { CardDropzone } from './convert/CardDropzone';
import { SourceAdviceNotice } from './convert/SourceAdviceNotice';
import { useNoticePlace } from './convert/noticePlace';
import { EditView } from './editor/EditView';
import { EngineColumns } from './engines/EngineColumns';
import { usePickingSide } from './engines/usePickingSide';
import { FileStep } from './convert/FileStep';
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
import { sourceStage, sourceSurface } from './convert/sourceSurface';
import { isConverted } from './convert/useConverter';
import { CONVERTER_STEPS } from './locale/docs';
import { useDropGuard } from './convert/useDropGuard';
import { useConversionReport } from './report/useConversionReport';
import { useEditedSummary } from './editor/useEditedSummary';
import { useEditorSession } from './convert/useEditorSession';
import { useAddedFocus } from './convert/useAddedFocus';
import { useFileIntake } from './convert/useFileIntake';
import { useFocusIntent } from './ui/useFocusIntent';
import { usePresetActions } from './presets/usePresetActions';
import { useRemapper } from './convert/useRemapper';
import { useSampleFile } from './convert/useSampleFile';
import { useSavedMappings } from './presets/useSavedMappings';
import { namesOf, samePair } from './core/enginePair';
import { downloadPreset } from './presets/presetFile';
import { CatalogStatus } from './convert/CatalogStatus';
import { useT } from './locale/localeContext';
import type { Notice, NoticeLine } from './core/notice';
import { rackDownloads } from './convert/rack';
import { ConverterTip } from './tip/ConverterTip';
import type { Runtime } from './convert/runtime';

export default function App({ runtime }: { runtime: Runtime }) {
  const t = useT();
  useDropGuard();
  const remapper = useRemapper(runtime);
  const { editor, view, pair, conversion: { conv } } = remapper;
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
  const picker = usePickingSide(request);
  const core = remapper.catalog.status === 'ready' ? remapper.catalog.core : null;
  const actions = remapper.conversion.kind === 'ready' ? remapper.conversion.actions : null;
  const { view: reportView, dropMissing } = useConversionReport({ ...editor, ...remapper, actions });
  const surface = sourceSurface(sourceStage(conv, remapper.sourceQuestion.offer, reportView.totals.unrecognized));
  const noticePlace = useNoticePlace();
  const intake = {
    load: runtime.load,
    storeFiles: remapper.addFiles,
    src: remapper.src,
    tgt: remapper.tgt,
    saved,
    notify,
    focus: useAddedFocus(request, surface, remapper.adviceSettled, noticePlace),
  };
  const pickFiles = useFileIntake({ ...intake, via: 'picker' });
  const dropFiles = useFileIntake({ ...intake, via: 'drop' });
  const trySample = useSampleFile({ ...intake, focus: request, core, convert: actions?.convert ?? null });
  const names = pair && namesOf(remapper.engines, pair);
  const steps = stepStates({ file: remapper.files.length > 0, engines: pair !== null, convert: isConverted(conv) });
  const { open: openEditor, close: closeEditor } = useEditorSession(remapper, request);
  const dismissNotice = () => {
    setNotice(null);
    request('main');
  };
  const racks = rackDownloads(remapper, openPreset, setNotice);
  const sourceNotice = <SourceAdviceNotice remapper={remapper} surface={surface} sentenceRef={focus.ref('sourceNotice')} onUsed={() => request('from')} />;
  const dropping = (page: ReactElement) => <CardDropzone onFiles={dropFiles}>{page}</CardDropzone>;

  if (view.kind === 'edit') {
    const shown = namesOf(remapper.engines, view.pair);
    return dropping(
      <Page asksTip={false} onSkip={() => request('main')}>
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
            assigning={view.assigning}
            initialShow={view.show}
            onClose={closeEditor}
            onSavePreset={(name) => presets.save(view.pair, name)}
            onUpdatePreset={presets.update}
          />
        </Card>
      </Page>,
    );
  }

  const stepBodies = {
    file: <FileStep remapper={remapper} onFiles={pickFiles} onTrySample={trySample} pickerRef={focus.ref('filePicker')} notice={noticePlace === 'files' ? sourceNotice : undefined} />,
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
          picking={picker.picking}
          onPicking={picker.onPicking}
          onTaken={(why) => notify([{ message: why }])}
        />

        {noticePlace === 'engines' && sourceNotice}
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
          muted={surface.kind === 'notice'}
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
          surface={surface}
          reportView={reportView}
          editedDrums={edited.count}
          convertRef={focus.ref('convert')}
          onViewReport={() => setReportOpen(true)}
          onPickSource={() => picker.open('from')}
          onAssignNotes={(notes) => openEditor('done', 'all', { kind: 'notes', notes })}
          onQuestionClosed={() => request('convert')}
          onDropMissing={dropMissing}
          onConvertMore={() => {
            remapper.clearFiles();
            request('filePicker');
          }}
        />
      </>
    ),
  };

  return dropping(
    <Page
      wide
      loading={remapper.catalog.status === 'loading'}
      onSkip={() => request('main')}
      after={<PopularConversions engines={remapper.engines} />}
    >
      <Card mainRef={focus.ref('main')}>
        <ConverterTip />
        <div className="
          flex flex-col gap-7 p-5
          sm:p-[34px_34px_30px]
        "
        >
          <Intro />

          <CatalogStatus catalog={remapper.catalog} />

          {remapper.catalog.status === 'ready' && CONVERTER_STEPS.map(({ key, title }, i) => (
            <Step key={key} number={i + 1} title={t({ id: title })} state={steps[key]}>
              {stepBodies[key]}
            </Step>
          ))}
        </div>
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
          onAssignSource={(note) => openEditor('report', 'all', { kind: 'note', note })}
          onChannel={() => {
            setSettingsOpen(true);
            request('channel');
          }}
          onDropMissing={dropMissing}
        />
      )}
    </Page>,
  );
}

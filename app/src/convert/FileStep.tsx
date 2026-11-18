import type { ReactElement } from 'react';
import type { OnFiles } from '../core/files';
import type { FocusRef } from '../ui/useFocusIntent';
import { FileIntake } from './FileIntake';
import { PartPicker } from './PartPicker';
import { PhoneHandoff } from './PhoneHandoff';
import type { Remapper } from './useRemapper';

/**
 * The file step: the files to convert, with `notice` under them when the page gives it here,
 * and the drum parts of each file `auto` asks about.
 */
export function FileStep({
  remapper,
  onFiles,
  onTrySample,
  pickerRef,
  notice,
}: {
  remapper: Remapper;
  onFiles: OnFiles;
  onTrySample?: () => void;
  pickerRef: FocusRef;
  notice?: ReactElement;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FileIntake
        files={remapper.files}
        failures={[...remapper.failures, ...remapper.questions.unreadable.filter((u) => !remapper.failures.some((f) => f.name === u.name))]}
        waiting={remapper.questions.waiting}
        skipped={remapper.skipped}
        replaced={remapper.replaced}
        onFiles={onFiles}
        onTrySample={onTrySample}
        onRemove={remapper.removeFile}
        onClear={remapper.clearFiles}
        pickerRef={pickerRef}
        notice={notice}
        handoff={<PhoneHandoff src={remapper.src} tgt={remapper.tgt} />}
      />
      <PartPicker remapper={remapper} />
    </div>
  );
}

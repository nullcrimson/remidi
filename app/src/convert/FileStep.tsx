import type { OnFiles } from '../core/files';
import type { FocusRef } from '../ui/useFocusIntent';
import { FileChips } from './FileChips';
import { PartPicker } from './PartPicker';
import type { Remapper } from './useRemapper';

/** The file step: the files to convert, and the drum parts of each file `auto` asks about. */
export function FileStep({
  remapper,
  onFiles,
  onTrySample,
  pickerRef,
}: {
  remapper: Remapper;
  onFiles: OnFiles;
  onTrySample?: () => void;
  pickerRef: FocusRef;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FileChips
        files={remapper.files}
        failures={remapper.failures}
        skipped={remapper.skipped}
        onFiles={onFiles}
        onTrySample={onTrySample}
        onRemove={remapper.removeFile}
        onClear={remapper.clearFiles}
        pickerRef={pickerRef}
      />
      <PartPicker remapper={remapper} />
    </div>
  );
}

import { useMemo } from 'react';
import { engineCode } from '../core/engineCode';
import type { LoadedFile } from '../core/files';
import type { Midiremap } from '../core/midiremap';
import { track } from '../core/stats';
import { useFileIntake, type IntakeSetup } from './useFileIntake';

/**
 * The action that adds the sample groove the empty converter offers, undefined while the FROM
 * engine is not chosen: the groove is built for that engine, taken in as a picked file is, and
 * converted at once when the TO engine is chosen too.
 */
export function useSampleFile({
  core,
  convert,
  ...setup
}: IntakeSetup & {
  core: Midiremap | null;
  convert: (files: LoadedFile[]) => Promise<void>;
}): (() => void) | undefined {
  const intake = useFileIntake({ ...setup, via: 'sample' });
  const { src, tgt } = setup;
  return useMemo(() => {
    if (core === null || src === null) return undefined;
    return () => {
      const sample: LoadedFile = { bytes: core.sampleFile(src), name: `sample-${engineCode(src)}.mid` };
      const converted = tgt !== null;
      track('sample-used', { converted });
      intake([sample], []);
      if (converted) void convert([sample]);
    };
  }, [core, src, tgt, intake, convert]);
}

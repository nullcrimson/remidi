import { useMemo } from 'react';
import { engineCode } from '../core/engineCode';
import type { LoadedFile } from '../core/files';
import type { Midiremap } from '../core/midiremap';
import { track } from '../core/stats';
import { useFileIntake, type IntakeSetup } from './useFileIntake';

/**
 * The action that adds the sample groove the empty converter offers, undefined while the FROM
 * engine is not chosen: the groove is built for that engine, taken in as a picked file is, and
 * converted at once through `convert`, there once the TO engine is chosen too.
 */
export function useSampleFile({
  core,
  convert,
  ...setup
}: IntakeSetup & {
  core: Midiremap | null;
  convert: ((files: LoadedFile[]) => Promise<void>) | null;
}): (() => void) | undefined {
  const intake = useFileIntake({ ...setup, via: 'sample' });
  const { src } = setup;
  return useMemo(() => {
    if (core === null || src === null) return undefined;
    return () => {
      const sample: LoadedFile = { bytes: core.sampleFile(src), name: `sample-${engineCode(src)}.mid` };
      track('sample-used', { converted: convert !== null });
      intake([sample], []);
      if (convert !== null) void convert([sample]);
    };
  }, [core, src, intake, convert]);
}

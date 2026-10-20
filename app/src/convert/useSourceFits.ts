import { useEffect, useState } from 'react';
import type { Converter } from './converter';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, SourceFits } from '../core/midiremap';

interface Fitted {
  files: LoadedFile[];
  channel: ChannelScope;
  fits: SourceFits | null;
}

/**
 * Every engine fitted to the hits of `files` a conversion with `channel` reads, best first,
 * computed by the converter off the main thread. `null` with no files, until the fit of the
 * current files and channel arrives, and when it failed: the fit only advises, and converting
 * says what went wrong.
 */
export function useSourceFits(converter: Converter, files: LoadedFile[], channel: ChannelScope): SourceFits | null {
  const [fitted, setFitted] = useState<Fitted | null>(null);
  useEffect(() => {
    if (files.length === 0) return;
    let current = true;
    const settle = (fits: SourceFits | null) => {
      if (current) setFitted({ files, channel, fits });
    };
    void converter.fits(files, channel).then(settle, () => settle(null));
    return () => {
      current = false;
    };
  }, [converter, files, channel]);
  return fitted !== null && fitted.files === files && fitted.channel === channel ? fitted.fits : null;
}

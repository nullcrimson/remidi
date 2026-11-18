import { useEffect, useState } from 'react';
import type { Converter } from './converter';
import type { LoadedFile } from '../core/files';
import type { Advised, ChannelScope, EngineId } from '../core/midiremap';

interface Requested {
  files: LoadedFile[];
  channel: ChannelScope;
  advised: Advised | null;
}

/**
 * The advice for the hits of `files` a conversion with `channel` reads, converted from `src` to
 * `tgt`, computed by the converter off the main thread. `null` with no files or no source,
 * until the advice for the current files and channel arrives, and when it failed: the advice
 * only advises, and converting says what went wrong. The advice names the pair it is for.
 */
export function useSourceAdvice(converter: Converter, files: LoadedFile[], channel: ChannelScope, src: EngineId | null, tgt: EngineId | null): Advised | null {
  const [requested, setRequested] = useState<Requested | null>(null);
  useEffect(() => {
    if (files.length === 0 || src === null) return;
    let current = true;
    const settle = (advised: Advised | null) => {
      if (current) setRequested({ files, channel, advised });
    };
    void converter.advice(files, channel, src, tgt).then(settle, () => settle(null));
    return () => {
      current = false;
    };
  }, [converter, files, channel, src, tgt]);
  return requested !== null && requested.files === files && requested.channel === channel ? requested.advised : null;
}

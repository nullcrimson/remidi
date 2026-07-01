import { useEffect, useMemo } from 'react';
import type { Conv } from '../hooks/useRemapper';
import { zipFiles } from '../lib/zip';
import { Button } from './Button';

export function ConvertButton({
  conv,
  canConvert,
  targetShort,
  summary,
  onConvert,
  onReset,
}: {
  conv: Conv;
  canConvert: boolean;
  targetShort: string;
  summary: string;
  onConvert: () => void;
  onReset: () => void;
}) {
  const results = useMemo(() => (conv.kind === 'done' ? conv.results : []), [conv]);
  const multi = results.length > 1;
  const zipUrl = useMemo(
    () => (multi ? URL.createObjectURL(zipFiles(results)) : null),
    [multi, results],
  );

  useEffect(() => {
    if (!zipUrl) return;
    return () => URL.revokeObjectURL(zipUrl);
  }, [zipUrl]);

  if (conv.kind === 'done' && results.length > 0) {
    const single = results.length === 1;
    const href = single ? results[0].url : zipUrl;
    const name = single ? results[0].name : `remapped-${targetShort}.zip`;
    if (!href) return null;
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.75">
          <a href={href} download={name} className="
            text-[13.5px] font-semibold text-t1
          ">
            {single ? '↓ download .mid' : '↓ download all (.zip)'}
          </a>
          <span className="font-mono text-[11px] text-t4">{summary}</span>
        </div>
        <button type="button" onClick={onReset} className="
          text-[12px] text-t4
          hover:text-t1
        ">
          again
        </button>
      </div>
    );
  }
  if (conv.kind === 'running') {
    return (
      <div>
        <div className="
          mb-2.25 flex justify-between font-mono text-[11px] text-t4
        ">
          <span>remapping</span>
          <span className="text-accent">…</span>
        </div>
        <div className="h-0.5 overflow-hidden bg-white/8">
          <div className="h-full w-1/3 animate-pulse bg-accent" />
        </div>
      </div>
    );
  }
  return (
    <Button variant="outline" disabled={!canConvert} onClick={onConvert}>
      Convert &amp; download
    </Button>
  );
}

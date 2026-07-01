import type { ReactNode } from 'react';
import { ConvertButton } from './components/ConvertButton';
import { EditView } from './components/EditView';
import { FileRow } from './components/FileRow';
import { LibraryList } from './components/LibraryList';
import { OctaveToggle } from './components/OctaveToggle';
import { SummaryRow } from './components/SummaryRow';
import { useRemapper } from './hooks/useRemapper';

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="
      flex min-h-screen items-start justify-center px-5 pt-[6vh] pb-16
    ">
      <div className="
        w-120 max-w-full overflow-hidden rounded-[18px] border border-white/6
        bg-card
      ">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const c = useRemapper();

  if (c.status === 'loading') {
    return <main className="p-8 text-t3">Loading converter…</main>;
  }
  if (c.status === 'error') {
    return <main className="p-8 text-danger">Failed to load converter: {c.error}</main>;
  }

  if (c.view === 'edit') {
    return (
      <Card>
        <EditView c={c} />
      </Card>
    );
  }

  const summary = `${c.remappedCount} remapped · ${c.voiceCount - c.remappedCount} kept → ${c.tgt}`;

  return (
    <Card>
      <div className="flex flex-col gap-7 p-[34px_34px_30px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] tracking-[0.04em] text-t4">midiremap</span>
          <span className="font-mono text-[11px] text-t6">free</span>
        </div>

        <FileRow file={c.file} onFile={c.setFile} onReplace={c.replaceFile} />

        <div className="grid grid-cols-2 gap-5.5">
          <LibraryList label="FROM" value={c.src} engines={c.engines} onChange={c.chooseSrc} />
          <LibraryList label="TO" value={c.tgt} engines={c.engines} onChange={c.chooseTgt} />
        </div>

        <OctaveToggle value={c.oct} onToggle={c.toggleOct} />

        <SummaryRow
          remapped={c.remappedCount}
          total={c.voiceCount}
          onEdit={() => c.setView('edit')}
        />

        {c.src === c.tgt && (
          <p className="text-[11.5px] text-danger/80">
            Same source &amp; target — lossy round-trip.
          </p>
        )}

        <ConvertButton
          conv={c.conv}
          canConvert={c.file !== null}
          downloadUrl={c.result?.url ?? null}
          downloadName={c.result?.name ?? ''}
          summary={summary}
          onConvert={c.convert}
          onReset={c.reset}
        />

        {c.conv === 'error' && c.error && (
          <p className="rounded-sm bg-red-950 p-3 text-[12px] text-red-300">Error: {c.error}</p>
        )}
      </div>
    </Card>
  );
}

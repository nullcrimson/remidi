import type { ReactNode } from "react";
import { CardDropzone } from "./components/CardDropzone";
import { ConvertButton } from "./components/ConvertButton";
import { EditView } from "./components/EditView";
import { FileChips } from "./components/FileChips";
import { LibraryList } from "./components/LibraryList";
import { OctaveToggle } from "./components/OctaveToggle";
import { SummaryRow } from "./components/SummaryRow";
import { useFavorites } from "./hooks/useFavorites";
import { useRemapper } from "./hooks/useRemapper";
import { shortCode } from "./lib/format";

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        flex min-h-screen items-start justify-center px-5 pt-[6vh] pb-16
      "
    >
      <main
        className="
          w-200 max-w-full overflow-hidden rounded-card border border-hairline
          bg-card
        "
      >
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const c = useRemapper();
  const favFrom = useFavorites("from");
  const favTo = useFavorites("to");

  if (c.status === "loading") {
    return <main className="p-8 text-t3">Loading converter…</main>;
  }
  if (c.status === "error") {
    return (
      <main className="p-8 text-danger">
        Failed to load converter: {c.error}
      </main>
    );
  }

  if (c.view === "edit") {
    return (
      <Card>
        <EditView
          src={c.src}
          tgt={c.tgt}
          oct={c.oct}
          rows={c.rows}
          edits={c.edits}
          pick={c.pick}
          targetDrums={c.targetDrums}
          setView={c.setView}
          openPick={c.openPick}
          setPickOct={c.setPickOct}
          chooseNote={c.chooseNote}
          chooseNoteAbsolute={c.chooseNoteAbsolute}
          closePick={c.closePick}
        />
      </Card>
    );
  }

  const bothSelected = c.src !== "" && c.tgt !== "";
  const targetShort = shortCode(c.tgt);
  const failedSuffix = c.failures.length > 0 ? ` · ${c.failures.length} failed` : "";
  const summary = `${c.results.length} file${
    c.results.length === 1 ? "" : "s"
  } · ${c.remappedCount} remapped → ${c.tgt}${failedSuffix}`;

  return (
    <Card>
      <CardDropzone onFiles={c.addFiles}>
        <div className="flex flex-col gap-7 p-[34px_34px_30px]">
          <div className="flex items-baseline justify-between">
            <h1 className="
              font-display text-[15px] font-semibold tracking-[0.02em] text-t2
            ">
              Remidi
            </h1>
            <span className="font-mono text-[11px] text-t6">
              free in-browser converter
            </span>
          </div>

        <FileChips
          files={c.files}
          failures={c.failures}
          onFiles={c.addFiles}
          onRemove={c.removeFile}
          onClear={c.clearFiles}
        />

        <div className="grid grid-cols-2 gap-5.5">
          <LibraryList
            label="FROM"
            value={c.src}
            disabledId={c.tgt}
            engines={c.engines}
            onChange={c.chooseSrc}
            favorites={favFrom.favorites}
            onToggleFavorite={favFrom.toggleFavorite}
          />
          <LibraryList
            label="TO"
            value={c.tgt}
            disabledId={c.src}
            engines={c.engines}
            onChange={c.chooseTgt}
            favorites={favTo.favorites}
            onToggleFavorite={favTo.toggleFavorite}
          />
        </div>

        <OctaveToggle value={c.oct} onToggle={c.toggleOct} />

        <SummaryRow
          remapped={c.remappedCount}
          total={c.voiceCount}
          onEdit={() => c.setView("edit")}
          disabled={!bothSelected}
        />

        <ConvertButton
          conv={c.conv}
          canConvert={c.files.length > 0 && bothSelected}
          targetShort={targetShort}
          summary={summary}
          onConvert={c.convert}
          onReset={c.reset}
        />

        {c.conv.kind === "error" && c.error && (
          <p className="rounded-sm bg-danger/10 p-3 text-[12px] text-danger">
            Error: {c.error}
          </p>
        )}
        </div>
      </CardDropzone>
    </Card>
  );
}

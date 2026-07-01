export function SummaryRow({
  remapped,
  total,
  onEdit,
}: {
  remapped: number;
  total: number;
  onEdit: () => void;
}) {
  return (
    <div className="
      flex items-center justify-between border-t border-white/6 pt-4.5
    ">
      <span className="text-[12px] text-t4">
        <span className="font-semibold text-accent">{remapped}</span> of {total}{" "}
        drums remapped
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="
          inline-flex items-center gap-1.5 text-[12px] text-t4
          hover:text-accent
        "
      >
        <span>✎</span>
        <span className="border-b border-dashed border-t5 pb-px">
          Edit individual notes →
        </span>
      </button>
    </div>
  );
}

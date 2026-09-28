import { useId } from 'react';
import type { EditFilter } from '../../lib/editFilter';
import { ChipRadioGroup } from '../ChipRadioGroup';
import { FilterInput } from '../FilterInput';

/** The editor's text filter and its All / Changed / Issues switch, with counts. */
export function EditFilters({
  q,
  onQ,
  show,
  onShow,
  counts,
}: {
  q: string;
  onQ: (q: string) => void;
  show: EditFilter;
  onShow: (show: EditFilter) => void;
  counts: Record<EditFilter, number>;
}) {
  const showId = useId();
  return (
    <div className="
      flex flex-col gap-2
      sm:flex-row sm:items-start sm:gap-4
    "
    >
      <div className="sm:w-64">
        <FilterInput value={q} onChange={onQ} ariaLabel="Filter drums" placeholder="filter drums…" />
      </div>
      <span id={showId} className="sr-only">Show</span>
      <ChipRadioGroup
        labelledBy={showId}
        options={[
          { value: 'all', label: `All ${counts.all}` },
          { value: 'changed', label: `Changed ${counts.changed}` },
          { value: 'issues', label: `Issues ${counts.issues}` },
        ]}
        value={show}
        onChange={onShow}
      />
    </div>
  );
}

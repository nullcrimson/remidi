import { t } from '../../i18n';
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
        <FilterInput value={q} onChange={onQ} ariaLabel={t({ id: 'edit-filter-label' })} placeholder={t({ id: 'edit-filter-placeholder' })} />
      </div>
      <span id={showId} className="sr-only">{t({ id: 'edit-show' })}</span>
      <ChipRadioGroup
        labelledBy={showId}
        options={[
          { value: 'all', label: t({ id: 'edit-show-all', args: { count: counts.all } }) },
          { value: 'changed', label: t({ id: 'edit-show-changed', args: { count: counts.changed } }) },
          { value: 'issues', label: t({ id: 'edit-show-issues', args: { count: counts.issues } }) },
        ]}
        value={show}
        onChange={onShow}
      />
    </div>
  );
}

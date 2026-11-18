import type { Catalog } from '../engines/useEngineCatalog';
import { useT } from '../locale/localeContext';
import { ErrorText } from '../ui/ErrorText';

/** The line in place of the steps while the engine catalog loads, or why it failed; nothing once it is ready. */
export function CatalogStatus({ catalog }: { catalog: Catalog }) {
  const t = useT();
  if (catalog.status === 'loading') return <p className="text-ui text-t3">{t({ id: 'app-loading' })}</p>;
  if (catalog.status === 'error') return <p className="text-ui text-danger"><ErrorText error={catalog.error} /></p>;
  return null;
}

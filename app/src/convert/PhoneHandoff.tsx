import { useState } from 'react';
import type { EngineId } from '../core/midiremap';
import { SHARED_HOW, sharePage, type Shared } from '../core/sharePage';
import { track } from '../core/stats';
import { useLocale } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';
import { converterAddress } from './preselect';

/**
 * On a phone only (a coarse pointer below `sm:`): a line that sends this converter, with the
 * engines chosen, on to a computer, by the share sheet, else by a copied link, else by the
 * address shown to copy by hand.
 */
export function PhoneHandoff({ src, tgt }: { src: EngineId | null; tgt: EngineId | null }) {
  const { t, locale } = useLocale().translator;
  const [sent, setSent] = useState<{ shared: Shared; address: string } | null>(null);
  const send = async () => {
    const address = converterAddress(locale, src, tgt);
    const shared = await sharePage(address, navigator);
    setSent({ shared, address });
    const how = SHARED_HOW[shared];
    if (how !== null) track('page-shared', { page: 'converter', how });
  };
  return (
    <div className="phone-handoff">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span>{t({ id: 'handoff-lead' })}</span>
        <TextButton onClick={() => void send()}>{t({ id: 'handoff-share' })}</TextButton>
      </p>
      {sent?.shared === 'copied' && <p role="status">{t({ id: 'handoff-copied' })}</p>}
      {sent?.shared === 'failed' && (
        <p role="status" className="flex flex-wrap gap-x-2">
          <span>{t({ id: 'handoff-failed' })}</span>
          <span className="break-all text-t2 select-all">{sent.address}</span>
        </p>
      )}
    </div>
  );
}

import { CONTACT_EMAIL, ISSUES_URL } from '../core/contact';
import { track } from '../core/stats';
import { useT } from '../locale/localeContext';
import { ProseLink } from '../ui/ProseLink';
import { Rich } from '../ui/Rich';

export function ContactFooter() {
  const t = useT();
  return (
    <p className="border-t border-hairline pt-4 text-ui text-t5">
      <Rich
        id="report-contact"
        slots={{
          issue: <ProseLink href={ISSUES_URL} onClick={() => track('contact-used', { link: 'issues' })}>{t({ id: 'report-contact-issue' })}</ProseLink>,
          email: <ProseLink href={`mailto:${CONTACT_EMAIL}`} onClick={() => track('contact-used', { link: 'email' })}>{CONTACT_EMAIL}</ProseLink>,
        }}
      />
    </p>
  );
}

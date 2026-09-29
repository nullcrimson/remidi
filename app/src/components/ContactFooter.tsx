import { CONTACT_EMAIL, ISSUES_URL } from '../content/site';
import { useT } from '../localeContext';
import { ProseLink } from './ProseLink';
import { Rich } from './Rich';

export function ContactFooter() {
  const t = useT();
  return (
    <p className="border-t border-hairline pt-4 text-ui text-t5">
      <Rich
        id="report-contact"
        slots={{
          issue: <ProseLink href={ISSUES_URL}>{t({ id: 'report-contact-issue' })}</ProseLink>,
          email: <ProseLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ProseLink>,
        }}
      />
    </p>
  );
}

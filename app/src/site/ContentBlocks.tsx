import { contactLink } from '../core/contact';
import { track } from '../core/stats';
import type { Block, ConverterStep, Inline } from '../locale/docs';
import { localHref } from './site';
import type { MessageId, SitePath } from '../generated/i18n';
import { useLocale, useT } from '../locale/localeContext';
import { ProseLink } from '../ui/ProseLink';

const isSitePath = (href: string): href is SitePath => href.startsWith('/');

const STEP_TITLES = {
  file: 'step-file',
  engines: 'step-engines',
  convert: 'step-convert',
} as const satisfies Record<ConverterStep, MessageId>;

function ConverterSteps({ bodies }: { bodies: Record<ConverterStep, string> }) {
  const t = useT();
  return (
    <ol className="
      flex list-decimal flex-col gap-2 pl-5
      marker:text-decor
    "
    >
      {(Object.keys(STEP_TITLES) as ConverterStep[]).map((step) => (
        <li key={step}>
          <span className="block font-medium text-t2">{t({ id: STEP_TITLES[step] })}</span> {bodies[step]}
        </li>
      ))}
    </ol>
  );
}

function contactClick(href: string) {
  const link = contactLink(href);
  return link === null ? undefined : () => track('contact-used', { link });
}

function Text({ inline }: { inline: Inline[] }) {
  const { translator } = useLocale();
  return inline.map((part, i) => {
    if (typeof part === 'string') return part;
    return isSitePath(part.href)
      ? (
          <a
            key={i}
            href={localHref(part.href, translator.locale)}
            className="prose-link"
          >{part.text}
          </a>
        )
      : <ProseLink key={i} href={part.href} onClick={contactClick(part.href)}>{part.text}</ProseLink>;
  });
}

function BlockView({ block }: { block: Block }) {
  if ('p' in block) {
    return <p><Text inline={block.p} /></p>;
  }
  if ('h' in block) {
    return <h3 className="mt-2 text-body font-semibold text-t2">{block.h}</h3>;
  }
  if ('note' in block) {
    return (
      <p className="text-t5">
        <span className="font-medium text-t2">{block.note.title}</span> {block.note.body}
      </p>
    );
  }
  if ('converter-steps' in block) {
    return <ConverterSteps bodies={block['converter-steps']} />;
  }
  if ('list' in block) {
    return (
      <ul className="
        flex list-disc flex-col gap-1 pl-5
        marker:text-decor
      "
      >
        {block.list.map((item, i) => (
          <li key={i}><Text inline={item} /></li>
        ))}
      </ul>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {block.faq.map((item) => (
        <div key={item.q} className="flex flex-col gap-1">
          <h3 className="text-body font-semibold text-t2">{item.q}</h3>
          <p><Text inline={item.a} /></p>
        </div>
      ))}
    </div>
  );
}

export function ContentBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => <BlockView key={i} block={block} />)}
    </div>
  );
}

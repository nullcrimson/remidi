import type { Block, Inline } from '../content/site';
import { ProseLink } from './ProseLink';

function Text({ inline }: { inline: Inline[] }) {
  return inline.map((part, i) => {
    if (typeof part === 'string') return part;
    return part.href.startsWith('/')
      ? <a key={i} href={part.href} className="prose-link">{part.text}</a>
      : <ProseLink key={i} href={part.href}>{part.text}</ProseLink>;
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
  if ('steps' in block) {
    return (
      <ol className="
        flex list-decimal flex-col gap-2 pl-5
        marker:text-decor
      "
      >
        {block.steps.map((step) => (
          <li key={step.title}>
            <span className="font-medium text-t2">{step.title}</span> {step.body}
          </li>
        ))}
      </ol>
    );
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
          <p>{item.a}</p>
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

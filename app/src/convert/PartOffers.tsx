import type { Part } from '../core/midiremap';
import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';
import { partName, type Offer } from './partQuestions';

/** The parts each conversion left as they are beside channel-10 drums in their track, with a way to convert them too. */
export function PartOffers({ offers, onAlsoConvert }: { offers: Offer[]; onAlsoConvert: (file: string, parts: Part[]) => void }) {
  const t = useT();
  const shown = offers.filter((o) => o.parts.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 text-ui text-t3" role="status">
      {shown.map((o) => (
        <div key={o.file} className="flex flex-col items-center gap-1">
          {o.parts.map((s) => (
            <p key={`${s.part.track}:${s.part.channel}`}>
              {t({ id: 'done-offer', args: { count: s.hits, part: partName(s, t), file: o.file } })}
            </p>
          ))}
          <TextButton onClick={() => onAlsoConvert(o.file, o.withOffers)}>
            {t({ id: 'done-offer-convert' })}
          </TextButton>
        </div>
      ))}
    </div>
  );
}

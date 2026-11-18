import { track } from '../core/stats';
import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';

/** The way back to the pair a suggestion left: that pair named, and going there. */
export interface WayBack {
  previous: string;
  onBack: () => void;
}

/** After a suggestion was taken: which layout the file was read as, and the way back when there is a pair to go back to. */
export function ReadAs({ back, source }: { back: WayBack | null; source: string }) {
  const t = useT();
  return (
    <p className="
      flex flex-wrap items-center justify-center gap-x-3 text-ui text-t4
    "
    >
      <span>{t({ id: 'done-read-as', args: { source } })}</span>
      {back !== null && (
        <TextButton
          onClick={() => {
            track('source-reverted');
            back.onBack();
          }}
        >{t({ id: 'done-back-to', args: { previous: back.previous } })}
        </TextButton>
      )}
    </p>
  );
}

import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';

/**
 * On the done card after converting only the files that were ready: each file left out, waiting
 * for its drum parts, in one line with a way to its question.
 */
export function WaitingFiles({ files, onShow }: { files: string[]; onShow: (file: string) => void }) {
  const t = useT();
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-ui text-t3">
      {files.map((file) => (
        <li
          key={file}
          className="
            flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1
          "
        >
          <span>{t({ id: 'done-left-out', args: { file } })}</span>
          <TextButton onClick={() => onShow(file)}>{t({ id: 'done-left-out-pick' })}</TextButton>
        </li>
      ))}
    </ul>
  );
}

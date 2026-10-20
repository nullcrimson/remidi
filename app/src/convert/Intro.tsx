import { useT } from '../locale/localeContext';

export function Intro() {
  const t = useT();
  return (
    <p className="text-ui/relaxed text-t4">
      {t({ id: 'app-intro' })}
    </p>
  );
}

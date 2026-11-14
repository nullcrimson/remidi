import type { FileResult } from '../core/files';
import type { Damage } from '../core/midiremap';
import type { Translate } from '../locale/i18n';
import { useT } from '../locale/localeContext';

function damageLine(damage: Damage, t: Translate): string {
  switch (damage.kind) {
    case 'trackCut':
      return 'bar' in damage.at
        ? t({ id: 'done-damage-track-cut-bar', args: { track: damage.track, bar: damage.at.bar } })
        : t({ id: 'done-damage-track-cut-tick', args: { track: damage.track, tick: damage.at.tick } });
    case 'tracksMissing':
      return t({ id: 'done-damage-tracks-missing', args: { declared: damage.declared, read: damage.read } });
  }
}

/** The files that had lost part of themselves before they were read, and what each had lost. */
export function DamagedFiles({ results }: { results: FileResult[] }) {
  const t = useT();
  const damaged = results.filter((r) => r.damage.length > 0);
  if (damaged.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 text-ui text-t3" role="status">
      {damaged.map((r) => (
        <div key={r.name} className="flex flex-col gap-1">
          <p className="text-t2">{t({ id: 'done-damaged-file', args: { file: r.name } })}</p>
          <ul className="flex flex-col gap-0.5">
            {r.damage.map((d) => (
              <li key={damageLine(d, t)}>{damageLine(d, t)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

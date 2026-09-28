import { content } from '../content/site';
import { navLink } from './styles';

export function SiteHeader() {
  return (
    <header className="
      flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1
    "
    >
      <h1 className="flex flex-wrap items-baseline gap-x-2">
        <span
          className="
            font-display text-brand font-semibold tracking-[0.02em] text-t2
            [text-shadow:0_0_12px_rgba(236,232,224,0.3)]
          "
        >
          Drumverter
        </span>
        <span className="text-ui font-normal text-t5">
          <span className="
            hidden
            sm:inline
          "
          >{'— '}
          </span>drum MIDI converter & remapper
        </span>
      </h1>
      <nav aria-label="Main">
        <ul className="flex gap-5 text-ui">
          {content.nav.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={link.href === '/' ? 'page' : undefined}
                className={navLink(link.href === '/')}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

const KEY = 'midiremap:locale';
const DISMISSED = 'midiremap:locale-offer';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

document.querySelectorAll('[data-locale]').forEach((a) => {
  a.addEventListener('click', () => write(KEY, a.dataset.locale));
});

const offer = document.getElementById('lang-offer');
const languageAndScript = (tag) => {
  try {
    const locale = new Intl.Locale(tag).maximize();
    return `${locale.language}-${locale.script ?? ''}`;
  } catch {
    return undefined;
  }
};
const same = (a, b) => languageAndScript(a) !== undefined && languageAndScript(a) === languageAndScript(b);
const page = document.documentElement.lang;
const links = offer ? [...offer.querySelectorAll('[data-offer]')] : [];
const chosen = links.find((a) => a.dataset.offer === read(KEY));
if (chosen) {
  location.replace(chosen.href);
} else if (offer && read(KEY) === null && read(DISMISSED) === null) {
  const match = navigator.languages
    .map((tag) => (same(tag, page) ? 'stay' : links.find((a) => same(a.lang, tag))))
    .find(Boolean);
  if (match && match !== 'stay') {
    match.hidden = false;
    offer.hidden = false;
  }
  offer.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    write(DISMISSED, 'dismissed');
    offer.hidden = true;
  });
}

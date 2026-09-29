import { parseLocale, type Locale } from './generated/i18n';

export const LOCALE: Locale = parseLocale(location.pathname.split('/')[1] ?? '') ?? 'en';

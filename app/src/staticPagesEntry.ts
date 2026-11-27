import { runHandoffScript } from './core/pageHandoff';
import { runTipScript } from './tip/pageTip';
import { WIDE_QUERY } from './ui/breakpoint';
import { runLocaleScript } from './locale/staticPages';

runLocaleScript(document, navigator.languages, location);
runHandoffScript(document, navigator);
runTipScript(document, () => !window.matchMedia(WIDE_QUERY).matches);

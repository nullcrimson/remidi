import { runHandoffScript } from './core/pageHandoff';
import { runTipScript } from './tip/pageTip';
import { isNarrowScreen } from './ui/breakpoint';
import { runLocaleScript } from './locale/staticPages';

runLocaleScript(document, navigator.languages, location);
runHandoffScript(document, navigator);
runTipScript(document, isNarrowScreen);

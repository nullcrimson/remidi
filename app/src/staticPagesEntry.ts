import { runHandoffScript } from './core/pageHandoff';
import { runLocaleScript } from './locale/staticPages';

runLocaleScript(document, navigator.languages, location);
runHandoffScript(document, navigator);

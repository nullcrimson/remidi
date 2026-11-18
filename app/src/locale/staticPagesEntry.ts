import { runHandoffScript } from '../core/pageHandoff';
import { runLocaleScript } from './staticPages';

runLocaleScript(document, navigator.languages, location);
runHandoffScript(document, navigator);

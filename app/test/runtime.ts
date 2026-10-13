import { beforeEach } from 'vitest';
import { browserRuntime } from '../src/convert/runtime';

/**
 * The runtime a page gets, over the stubbed module and new for every test, so each test
 * loads the module itself; with no Worker here it converts on the main thread.
 */
export let RUNTIME = browserRuntime();

beforeEach(() => {
  RUNTIME = browserRuntime();
});

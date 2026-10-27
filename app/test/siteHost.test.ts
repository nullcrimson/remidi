import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES = readFileSync(join(HERE, '..', '..', 'midiremap-site', 'src', 'routes.rs'), 'utf8');
const VITE_CONFIG = readFileSync(join(HERE, '..', 'vite.config.ts'), 'utf8');

it('counts visits on the host the site generator links its pages to', () => {
  const domain = /const DOMAIN: &str = "([^"]+)";/.exec(ROUTES)?.[1];
  const counted = /'data-domains': '([^']+)'/.exec(VITE_CONFIG)?.[1];
  expect(domain).toBeDefined();
  expect(counted).toBe(domain);
});

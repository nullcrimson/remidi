import type { Page } from '@playwright/test';

/**
 * Translates the page the way Chrome's built-in translation does, keeping every text:
 * each text node is replaced by two nested `<font>` elements holding a copy, once the
 * document loads and again for every text added or changed later. React keeps the
 * replaced node, as it does under real translation.
 */
export async function simulateTranslation(page: Page) {
  await page.addInitScript(() => {
    const inserted = new WeakSet<Node>();
    const untranslated = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
    const font = () => {
      const el = document.createElement('font');
      el.style.verticalAlign = 'inherit';
      return el;
    };
    const translate = (text: Text) => {
      const parent = text.parentNode;
      if (!parent || inserted.has(parent) || untranslated.has(parent.nodeName) || !text.data.trim()) return;
      const outer = font();
      const inner = font();
      inserted.add(inner);
      inner.append(text.data);
      outer.append(inner);
      parent.replaceChild(outer, text);
    };
    const translateUnder = (root: Node) => {
      if (root instanceof Text) return translate(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const texts: Text[] = [];
      while (walker.nextNode()) texts.push(walker.currentNode as Text);
      texts.forEach(translate);
    };
    document.addEventListener('DOMContentLoaded', () => {
      translateUnder(document.body);
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'characterData') translateUnder(record.target);
          record.addedNodes.forEach(translateUnder);
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
  });
}

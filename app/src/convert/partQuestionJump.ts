import { centerAndFocus } from '../ui/reveal';

/**
 * Brings the question about the drum parts of `file` (its `data-part-question`) to the middle of
 * the window and puts focus on its first part. Says whether the question is on the page.
 */
export function showPartQuestion(file: string): boolean {
  const question = [...document.querySelectorAll<HTMLElement>('[data-part-question]')]
    .find((el) => el.dataset.partQuestion === file);
  if (question === undefined) return false;
  centerAndFocus(question, question.querySelector<HTMLElement>('input'));
  return true;
}

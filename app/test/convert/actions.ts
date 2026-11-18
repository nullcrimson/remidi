import type { Remapper } from '../../src/convert/useRemapper';

/** The ways `remapper` converts, there once both engines are chosen. */
export function actionsOf(remapper: Remapper) {
  if (remapper.conversion.kind === 'unready') throw new Error('nothing converts before both engines are chosen');
  return remapper.conversion.actions;
}

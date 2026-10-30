import type { ReactElement } from 'react';
import type { ElementChildren } from '../../src/ui/elementChildren';

describe('ElementChildren', () => {
  it('takes elements and lists of them', () => {
    expectTypeOf<ReactElement>().toExtend<ElementChildren>();
    expectTypeOf<(ReactElement | null)[]>().toExtend<ElementChildren>();
  });

  it('takes no bare text, alone or in a list', () => {
    expectTypeOf<string>().not.toExtend<ElementChildren>();
    expectTypeOf<number>().not.toExtend<ElementChildren>();
    expectTypeOf<string[]>().not.toExtend<ElementChildren>();
  });
});

import { useState } from 'react';
import type { FocusTarget } from '../ui/useFocusIntent';
import type { EngineSideName } from './EngineSide';

/** Which engine picker is open; closing one hands focus back to its card. */
export function usePickingSide(request: (target: FocusTarget) => void) {
  const [picking, setPicking] = useState<EngineSideName | null>(null);
  const onPicking = (side: EngineSideName | null) => {
    if (side === null && picking !== null) request(picking);
    setPicking(side);
  };
  return { picking, onPicking, open: setPicking };
}

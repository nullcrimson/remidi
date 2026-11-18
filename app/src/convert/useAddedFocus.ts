import { useCallback, useState } from 'react';
import type { FocusTarget } from '../ui/useFocusIntent';
import type { NoticePlace } from './noticePlace';
import type { SourceSurface } from './sourceSurface';

/**
 * Where focus goes after files are added: as asked, except that while the source notice shows
 * in the file step (`place`, on a phone), far above Convert, a move to Convert waits for the
 * advice and goes to the notice instead when it shows, bringing it into view; to Convert when
 * it does not.
 */
export function useAddedFocus(request: (target: FocusTarget) => void, surface: SourceSurface, adviceSettled: boolean, place: NoticePlace) {
  const [waiting, setWaiting] = useState(false);
  if (waiting && adviceSettled) {
    setWaiting(false);
    request(surface.kind === 'notice' ? 'sourceNotice' : 'convert');
  }
  return useCallback((target: FocusTarget) => {
    if (target === 'convert' && place === 'files') setWaiting(true);
    else request(target);
  }, [place, request]);
}

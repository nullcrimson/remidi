import { useNarrowScreen } from '../ui/useNarrowScreen';

/** Where the source notice shows: in the file step on a phone, under the engine pickers from `sm:` up. */
export type NoticePlace = 'files' | 'engines';

/** The place of the source notice at the window's width now, read again whenever it crosses `sm:`. */
export function useNoticePlace(): NoticePlace {
  return useNarrowScreen() ? 'files' : 'engines';
}

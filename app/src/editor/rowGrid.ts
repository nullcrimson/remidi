/**
 * Column template shared by the edit view's rows and their header. From `sm` up the drum
 * name and the Plays text share the free width, which puts the two note chips in the middle.
 */
export const ROW_GRID = `
  grid grid-cols-[minmax(0,1fr)_auto_12px_auto_1.25rem] items-center gap-x-2 gap-y-1
  sm:grid-cols-[minmax(0,1fr)_auto_16px_auto_minmax(0,1fr)_1.25rem] sm:gap-x-3
`;

/** Element ids that focus moves to after an action finishes. */
export const MAIN_ID = 'main';
export const FILE_PICKER_ID = 'file-picker';
export const EDIT_LINK_ID = 'edit-notes-link';
export const CONVERT_BUTTON_ID = 'convert-button';

export function engineFilterId(label: string): string {
  return `engine-filter-${label.toLowerCase()}`;
}

/** Moves focus to the element with `id`, if it is on the page. */
export function focusById(id: string): void {
  document.getElementById(id)?.focus();
}

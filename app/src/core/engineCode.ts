/** The three-letter badge an engine id is shown as. */
export function engineCode(id: string): string {
  return id.toUpperCase().slice(0, 3);
}

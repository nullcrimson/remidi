/** The message of a thrown value, without the error's class name. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

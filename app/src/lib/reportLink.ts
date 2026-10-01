const FORM = 'https://tally.so/r/J95eYd';

/** The no-account problem form, told which engines and language the report is about. */
export function reportLink(fields: { from: string; to: string; lang: string }): string {
  return `${FORM}?${new URLSearchParams(fields)}`;
}

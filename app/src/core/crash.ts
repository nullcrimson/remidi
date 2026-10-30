import { parse, type StackFrame } from 'stacktrace-parser';
import type { StatEvents } from './umami';

const COMPONENT_FRAMES = 4;
const PROP_CHARS = 200;
const ERROR_CHARS = 100;
const SEPARATOR = ' < ';
const HOST_FILE = 'unknown';

function text(value: unknown): string {
  try {
    return String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function crashSummary(err: unknown): string {
  const summary = err instanceof Error ? `${err.name}: ${err.message}` : text(err);
  return summary.split('\n', 1)[0].slice(0, ERROR_CHARS);
}

function thrownFrames(error: unknown): StackFrame[] {
  if (!(error instanceof Error) || typeof error.stack !== 'string') return [];
  const header = text(error);
  return parse(error.stack.startsWith(header) ? error.stack.slice(header.length) : error.stack);
}

const isHost = ({ methodName, file, lineNumber }: StackFrame) =>
  /^[a-z]/.test(methodName) && (lineNumber === null || file === HOST_FILE);

function wholeFrames(frames: StackFrame[]): string {
  let kept = '';
  for (const frame of frames.map(formatted)) {
    const next = kept === '' ? frame : `${kept}${SEPARATOR}${frame}`;
    if (next.length > PROP_CHARS) break;
    kept = next;
  }
  return kept;
}

function formatted({ methodName, file, lineNumber, column }: StackFrame): string {
  if (file === null || lineNumber === null) return methodName;
  const position = [file.slice(file.lastIndexOf('/') + 1), lineNumber, column].filter((part) => part !== null).join(':');
  return `${methodName}@${position}`;
}

/**
 * What the crash event says about a crash, short enough to send: the error's kind and first
 * line, the frame it was thrown from, and the nearest components above it, without host
 * elements. Frames keep their minified names and positions, which the build's source maps resolve.
 */
export function crashReport(error: unknown, componentStack: string | null | undefined): StatEvents['crashed'] {
  try {
    const components = parse(componentStack ?? '').filter((frame) => !isHost(frame)).slice(0, COMPONENT_FRAMES);
    return {
      error: crashSummary(error),
      thrown: wholeFrames(thrownFrames(error).slice(0, 1)),
      components: wholeFrames(components),
    };
  } catch {
    return { error: text(error).slice(0, ERROR_CHARS), thrown: '', components: '' };
  }
}

/** The frames with a position in a `thrown` or `components` prop that `crashReport` wrote: what the source maps resolve. */
export function crashFrames(prop: string): StackFrame[] {
  return parse(prop.split(SEPARATOR).join('\n')).filter((frame) => frame.lineNumber !== null);
}

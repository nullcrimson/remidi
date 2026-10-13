import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/core/download', () => ({ saveFile: vi.fn() }));

import App from '../src/App';
import { RUNTIME } from './runtime';
import { saveFile } from '../src/core/download';
import { WasmCallError } from '../src/core/errors';
import { MAPPINGS_CAP, MAPPINGS_KEY } from '../src/presets/mappings';
import type { PresetView, VocabularyDrum } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';

const PRESET = {
  id: 'p1',
  name: 'My kit',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 35, 'bogus.drum': 40 },
  srcEdits: { 24: 'bogus.drum' },
  updatedAt: 1,
};

async function start(presets: unknown[] = [PRESET]) {
  localStorage.setItem(MAPPINGS_KEY, JSON.stringify({ version: 1, items: presets }));
  render(<App runtime={RUNTIME} />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

async function importFile(name: string) {
  const input = screen.getAllByTestId('file-input')[0];
  await userEvent.upload(input, new File(['{}'], name), { applyAccept: false });
}

describe('App presets', () => {
  beforeEach(() => {
    vi.mocked(saveFile).mockClear();
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<VocabularyDrum[]>([
      { canon: 'kick.main', label: 'Kick', family: 'Kick' },
    ]));
    vi.mocked(stub.plan).mockReturnValue([]);
  });

  it('loads a preset without the edits this version cannot read, and says so', async () => {
    await start();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("2 edits in 'My kit' use drums this version doesn't know; skipped.");
    await userEvent.click(within(status).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/this version doesn't know/)).not.toBeInTheDocument();
  });

  it('exports a preset as a plain -drumverter.json file', async () => {
    await start();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export' }));
    expect(saveFile).toHaveBeenCalledWith('blob:mock-url', 'my-kit-drumverter.json');
  });

  it('says which files the browser could not read and keeps the rest', async () => {
    await start();
    const gone = (name: string) => {
      const f = new File(['x'], name);
      const fail = () => Promise.reject(new DOMException('gone', 'NotReadableError'));
      Object.defineProperty(f, 'arrayBuffer', { value: fail });
      Object.defineProperty(f, 'text', { value: fail });
      return f;
    };
    const input = screen.getAllByTestId('file-input')[0];
    await userEvent.upload(input, [gone('groove.mid'), new File(['MThd'], 'fill.mid')], { applyAccept: false });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("Couldn't read groove.mid — pick it again."),
    );
    expect(screen.getByText('fill.mid')).toBeInTheDocument();
    await userEvent.upload(screen.getAllByTestId('file-input')[0], [gone('a.mid'), gone('b.drumverter.json')], {
      applyAccept: false,
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("Couldn't read a.mid, b.drumverter.json — pick them again."),
    );
  });

  it('imports a preset file as a new preset with a free name', async () => {
    vi.mocked(stub.parse_preset_file).mockReturnValue(typed<PresetView>({
      name: 'My kit',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'kick.main': 35 },
      srcEdits: {},
      skipped: [{ kind: 'unknownDrum', key: 'x' }],
    }));
    await start();
    await importFile('my-kit.drumverter.json');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent("Imported 'My kit copy' (1 edit skipped)."));
    expect(screen.getByRole('button', { name: /^My kit copy/ })).toBeInTheDocument();
    expect(screen.queryByText(/my-kit\.drumverter\.json/)).not.toBeInTheDocument();
  });

  it('explains a file it cannot import', async () => {
    vi.mocked(stub.parse_preset_file).mockImplementation(() => {
      throw new WasmCallError({ kind: 'badPreset', detail: "not a Drumverter preset (format is 'other')" });
    });
    await start([]);
    await importFile('other.json');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        "Couldn't import other.json: Not a preset file Details: not a Drumverter preset (format is 'other')",
      ),
    );
  });

  it('refuses an import at the preset limit', async () => {
    vi.mocked(stub.parse_preset_file).mockReturnValue(
      typed<PresetView>({ name: 'New', src: 'ggd_invasion', tgt: 'ezdrummer', edits: {}, srcEdits: {}, skipped: [] }),
    );
    const full = Array.from({ length: MAPPINGS_CAP }, (_, i) => ({ ...PRESET, id: `p${i}`, name: `P${i}`, edits: {}, srcEdits: {} }));
    await start(full);
    await importFile('new.drumverter.json');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(`Couldn't import new.drumverter.json: preset limit reached (${MAPPINGS_CAP})`),
    );
  });
});

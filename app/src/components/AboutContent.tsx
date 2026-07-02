import { Fragment, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

const ENGINES = [
  'GetGood Drums (Invasion, Modern & Massive, and more)',
  'Toontrack EZdrummer & Superior Drummer 3',
  'Addictive Drums 2 (XLN Audio)',
  'Steven Slate Drums SSD5',
  'BFD3',
  'Native Instruments Studio Drummer & Abbey Road',
  'ML Drums & Perfect Drums',
  'MixWave signature drummer kits',
  'General MIDI & Guitar Pro',
  '…and dozens of others',
];

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Add your files.',
    body: 'Drop one or more .mid files anywhere on the page, or click to choose.',
  },
  {
    title: 'Pick source and target.',
    body: 'Choose the engine your MIDI was written for and the engine you want it mapped to.',
  },
  {
    title: 'Fine-tune (optional).',
    body: 'Open the editor to change target notes, or switch to the Source tab to reassign or rescue the notes your file uses.',
  },
  {
    title: 'Download.',
    body: 'Get a single .mid, or a .zip when you convert several at once.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Remidi free?',
    a: 'Yes. It runs entirely in your browser, with no account and no cost.',
  },
  {
    q: 'Do my MIDI files get uploaded?',
    a: 'No. Conversion happens locally in your browser; files never leave your device.',
  },
  {
    q: 'How do I convert GetGood Drums MIDI to EZdrummer?',
    a: 'Add the .mid, set the source to GetGood Drums and the target to EZdrummer, then download the remapped file.',
  },
  {
    q: 'Which DAWs and octave conventions are supported?',
    a: 'Both common note-octave conventions are covered — toggle between C-1 (Reaper, Logic, Ableton, Guitar Pro) and C-2 (Studio One, Cubase, FL Studio) so note names match your DAW.',
  },
  {
    q: 'Can I convert multiple files at once?',
    a: 'Yes. Queue several .mid files and download them all as a single .zip.',
  },
  {
    q: 'What if a drum has no equivalent in the target engine?',
    a: "Remidi uses per-slot fallback chains to pick the closest available voice, and reports anything it couldn't map.",
  },
];

function GuideBody() {
  return (
    <div className="flex flex-col gap-3">
      <p>
        Remidi is a free drum MIDI remapper for every sample engine. It converts a drum MIDI groove
        written for one sample engine&apos;s note layout into another&apos;s — entirely in your
        browser. Drop in a .mid from GetGood Drums, remap it to EZdrummer, Superior Drummer 3,
        Addictive Drums 2, General MIDI, or Guitar Pro, and download a ready-to-use file. No upload,
        no signup, no cost — your files never leave your machine.
      </p>
      <ol className="
        flex list-decimal flex-col gap-2 pl-5
        marker:text-t6
      ">
        {STEPS.map((step) => (
          <li key={step.title}>
            <span className="font-medium text-t2">{step.title}</span> {step.body}
          </li>
        ))}
      </ol>
      <p className="text-t5">
        <span className="font-medium text-t2">Save a preset (optional).</span> After fine-tuning, use
        Save preset in the editor to keep a source→target pair together with your note overrides. It
        appears under the engine lists as a chip — one click reloads it; rename with ✎, remove with ✕.
        Presets stay in this browser.
      </p>
    </div>
  );
}

function EnginesBody() {
  return (
    <div className="flex flex-col gap-3">
      <p>Remidi maps between dozens of drum-engine note layouts, in any direction — including:</p>
      <ul className="
        flex list-disc flex-col gap-1 pl-5
        marker:text-t6
      ">
        {ENGINES.map((engine) => (
          <li key={engine}>{engine}</li>
        ))}
      </ul>
      <p>
        Every mapping goes through a canonical drum vocabulary with per-slot fallbacks, so a note
        with no exact match falls back to the closest available voice instead of being dropped.
      </p>
    </div>
  );
}

function FaqBody() {
  return (
    <div className="flex flex-col gap-4">
      {FAQ.map((item) => (
        <div key={item.q} className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-t2">{item.q}</h3>
          <p>{item.a}</p>
        </div>
      ))}
    </div>
  );
}

function IssueBody() {
  return (
    <div className="flex flex-col gap-3">
      <p>
        Hit a wrong mapping, or want an engine added? Open a{' '}
        <a
          href="https://github.com/nullcrimson/remidi/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-star/85 underline decoration-star/30 decoration-1
            underline-offset-4 transition
            [text-shadow:0_0_10px_rgba(224,196,106,0.35)]
            hover:text-star hover:decoration-star/60
            hover:[text-shadow:0_0_15px_rgba(224,196,106,0.6)]
          "
        >
          GitHub issue
        </a>{' '}
        with the details.
      </p>
      <p>
        Prefer email? Reach me at{' '}
        <a
          href="mailto:null.crimson.dev@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-star/85 underline decoration-star/30 decoration-1
            underline-offset-4 transition
            [text-shadow:0_0_10px_rgba(224,196,106,0.35)]
            hover:text-star hover:decoration-star/60
            hover:[text-shadow:0_0_15px_rgba(224,196,106,0.6)]
          "
        >
          null.crimson.dev@gmail.com
        </a>
        .
      </p>
    </div>
  );
}

function ContactBody() {
  return (
    <p>
      Questions, feedback, or engine requests? Email me at{' '}
      <a
        href="mailto:null.crimson.dev@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className="
          text-star/85 underline decoration-star/30 decoration-1
          underline-offset-4 transition
          [text-shadow:0_0_10px_rgba(224,196,106,0.35)]
          hover:text-star hover:decoration-star/60
          hover:[text-shadow:0_0_15px_rgba(224,196,106,0.6)]
        "
      >
        null.crimson.dev@gmail.com
      </a>
      .
    </p>
  );
}

type SectionKey = 'guide' | 'engines' | 'faq' | 'issue' | 'contact';

const SECTIONS: {
  key: SectionKey;
  label: string;
  heading: string;
  body: ReactNode;
}[] = [
  {
    key: 'guide',
    label: 'How it works',
    heading: 'How to convert drum MIDI',
    body: <GuideBody />,
  },
  {
    key: 'engines',
    label: 'Engines',
    heading: 'Supported drum engines',
    body: <EnginesBody />,
  },
  {
    key: 'faq',
    label: 'FAQ',
    heading: 'Frequently asked questions',
    body: <FaqBody />,
  },
  {
    key: 'issue',
    label: 'Submit an issue',
    heading: 'Report an issue',
    body: <IssueBody />,
  },
  {
    key: 'contact',
    label: 'Contact',
    heading: 'Contact',
    body: <ContactBody />,
  },
];

export function AboutContent() {
  const [open, setOpen] = useState<SectionKey | null>(null);

  return (
    <section className="flex w-full flex-col px-1">
      <div className="
        flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px]
      ">
        {SECTIONS.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && (
              <span aria-hidden="true" className="text-t6">
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen(s.key)}
              aria-haspopup="dialog"
              className="
                text-star/85 underline decoration-star/30 decoration-1
                underline-offset-4 transition
                [text-shadow:0_0_10px_rgba(224,196,106,0.35)]
                hover:text-star hover:decoration-star/60
                hover:[text-shadow:0_0_15px_rgba(224,196,106,0.6)]
              "
            >
              {s.label}
            </button>
          </Fragment>
        ))}
      </div>

      {SECTIONS.map((s) => (
        <Modal
          key={s.key}
          open={open === s.key}
          heading={s.heading}
          onClose={() => setOpen(null)}
        >
          {s.body}
        </Modal>
      ))}
    </section>
  );
}

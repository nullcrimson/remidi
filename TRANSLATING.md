# Translating Drumverter

Drumverter's texts are translated on Hosted Weblate:
[hosted.weblate.org/engage/drumverter](https://hosted.weblate.org/engage/drumverter/).
Most of the texts in languages other than English were machine translated, so a native speaker's
fix or approval helps most. Weblate sends the changes back to this repository as pull requests.

## For translators

- **Variables stay as they are.** `{ $count }`, `{ $name }` and the other `{ $… }` parts are filled
  in by the app. Keep them exactly, in whatever place your sentence needs them. Weblate and the site
  build both refuse a translation that drops or renames one.
- **Plurals and other choices are written out in Fluent.** A message that depends on a number looks
  like this, and you translate each line between the braces:

  ```
  { $count ->
      [one] { $count } file
     *[other] { $count } files
  }
  ```

  Use the plural forms of your language: `[one]` and `*[other]` in most languages, plus `[few]` and
  `[many]` in Russian and Polish; Japanese, Chinese and Korean need only `*[other]`. Variants such as
  `[0]` (exactly zero) or `[source]` and `[target]` stay as they are. Keep the `*` in front of the last
  variant: it marks the default, and a message without one is refused.
- **A text that starts with `.`, `[` or `*`** must start with `{ "." }`, `{ "[" }` or `{ "*" }`
  instead, for example `{ "." }mid-Dateien hier ablegen`. Typed without it, Weblate shows a syntax
  error (`Expected token: "="`).
- **Names stay in English:** drum names, engine and product names (EZdrummer, Superior Drummer 3,
  Ableton Live …), "MIDI", "Drumverter", note names such as `C1`, file extensions, and the menu names
  of DAWs. The terms and tone of each language are in [locales/GLOSSARY.md](locales/GLOSSARY.md) and
  `locales/<code>/GLOSSARY.md` (for example [German](locales/de/GLOSSARY.md)).
- **Do not empty a translation** to mark it as wrong: that deletes the message and breaks the build.
  Suggest a better text, or leave a comment in Weblate.
- **The guide and the FAQ** (`locales/<code>/docs.json`) are not in Weblate yet. To fix them, open an
  issue or a pull request on GitHub.

## For developers

- A new or changed English message goes into all 11 locales in the same commit, machine translated
  as before; the site and the app refuse a locale that lacks a message. Weblate never adds a message.
  Run `npm run fmt:ftl` in `app/` afterwards: it puts the `.ftl` files in the layout Weblate writes,
  which `app/test/ftlCanonical.test.ts` checks. Weblate then flags the new texts "Needs rewriting".
- Before a commit that changes `locales/*/app.ftl` or `locales/*/site.ftl`, merge any open Weblate
  pull request (or press Commit in Weblate and merge it), so Weblate's rebase does not conflict.
- Weblate pull requests are squash-merged with their one-line title.
- A translation that rightly equals the English text needs its id in
  `locales/<code>/same-as-english.txt` (checked by `app/test/untranslated.test.ts`). Weblate cannot
  edit that file, so add the id on master in a separate commit; the Weblate pull request then rebases.

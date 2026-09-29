# Simplified Chinese glossary (zh-Hans, mainland)

| English | Chinese |
|---|---|
| MIDI file | MIDI 文件 |
| drum engine (EZdrummer, Superior Drummer…) | 鼓音源 (measure word 款: 80 多款鼓音源) — never 引擎 or 插件 |
| drum (a kit piece, cymbals included) | 鼓件 (measure word 个) |
| note | 音符; note name 音名; note number 音符编号 |
| note map | 音符映射表 |
| conversion table (maps pages) | 转换对照表 |
| preset | 预设 |
| convert | 转换 |
| remap | 重新映射 (tagline and titles: 重映射) |
| mapping | 映射 |
| source / target engine | 来源鼓音源 / 目标鼓音源; in running text 来源和目标鼓音源 |
| FROM / TO | 来源 / 目标 |
| INCOMING (source-note picker) | 输入 |
| channel | 通道 (鼓通道, 所有通道, 通道 10) |
| octave | 八度; octave convention 八度标记 |
| drag & drop a file | 拖放 (拖放 .MID, 拖放到任意位置) |
| pick a file | 选择 / 点击选择 |
| the on-screen piano | 琴键 |
| a note plays / triggers a drum | 触发 |
| exact / approximated / dropped / unrecognized | 精确 / 近似 / 丢弃 (report and row state: 已丢弃) / 未识别 |
| Nearest / Drop (missing-drums option) | 就近 / 丢弃 |
| unchanged | 未改动 |
| filter | 筛选 |
| favourites | 收藏 |
| reset | 重置 |
| reload | 刷新 |
| duplicate | 创建副本 |
| save new (beside Update) | 另存为 |
| dismiss / close | 关闭 |
| chip (saved preset on the main screen) | 按钮 |
| report an issue | 反馈问题 |
| GitHub issue | GitHub Issue |

## Tone and forms

- The pronoun is omitted wherever possible; 您 only where a sentence needs a person (terms, privacy answer). Never 你.
- Buttons and menu items are bare verbs as in Windows/macOS/WeChat: 保存, 取消, 删除, 重命名, 导出, 完成, 返回. Hints and blockers that ask something of the user start with 请 (请添加 .mid 文件…).
- Counts use a measure word: 个音符, 个鼓件, 个文件, 款鼓音源, 处修改/更改. Chinese has no plural forms: number selects keep only `*[other]`, except where the wording itself differs for exactly one (numeric key `[1]`: 该文件/这些文件, 两者/全部) or for zero (`[0]`).
- Short status tags put the label first, count second: 近似 { $count }, 丢弃 { $count }, 全部 { $count }.
- Punctuation: full-width ，。：；？（）“” in Chinese sentences, including around file extensions in parentheses (（.drumverter.json）). Mid-sentence em dashes are rewritten with ，or ：; a leading “— ” that continues a bold lead-in (report lines) is kept as in English. Ellipsis in placeholders is the single …, in running text ……. Arrows and symbols (→, ←, ↓, ⇄, ·, +) are kept where English has them.
- Spacing: one half-width space between Chinese and any Latin word, number, note name or placeable (鼓 MIDI, 通道 10, 另有 { $count } 项, { $engine } 音符), as Apple and Microsoft mainland UIs do. No space next to full-width punctuation, and none between a placeable that always holds Chinese text and Chinese ({ $side }鼓音源).
- Page titles keep “ | Drumverter”; the brand title uses a colon: Drumverter：….

## English kept

- Drum names from the drum list, as they appear in the UI: China, crash, Tom 3/Tom 4, Hi-Hat, Snare… — the tooltip example (China 改用 crash) must match what the user sees in the list.
- rimshot — what Chinese drummers say, and the word inside the drum names (Snare Rimshot).
- DAW — universal in Chinese producer speech.
- GitHub Issue — how Chinese developers refer to a GitHub issue.
- Enter, Ctrl+Enter — key names as printed on keyboards.
- MID (badge), .mid, .zip, .json, MIDI, Cookie, JavaScript.

## Translated although English was allowed

- ghost notes → 鬼音: the standard term in Chinese drumming lessons and forums; the English phrase is rarely used.
- preset → 预设: what every mainland DAW (Cubase, Logic, Ableton, FL Studio) shows.

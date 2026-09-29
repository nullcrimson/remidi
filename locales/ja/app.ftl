brand-tagline = ドラムMIDI変換・リマップツール
nav-converter = コンバーター
nav-note-maps = ノートマップ
section-guide-label = 使い方
section-guide-heading = ドラムMIDIを変換する方法
section-guide-title = ドラムMIDIをドラム音源間で変換する方法 | Drumverter
section-guide-description = GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなど80種類以上のドラム音源間で、ドラムMIDIを4ステップで変換。無料で、ブラウザだけで使えます。
section-faq-label = FAQ
section-faq-heading = よくある質問
section-faq-title = ドラムMIDIコンバーターのよくある質問 | Drumverter
section-faq-description = Drumverterのよくある質問：料金、プライバシー、オクターブ表記（C-1とC-2）、一括変換、変換先にないパーツの扱いについて。
section-issue-label = 問題を報告
section-issue-heading = 問題を報告
section-issue-title = 問題を報告 | Drumverter
section-issue-description = ドラムの割り当てが間違っている、またはDrumverterに追加してほしいドラム音源がある場合は、GitHubかメールでお知らせください。
section-contact-label = お問い合わせ
section-contact-heading = お問い合わせ
section-contact-title = お問い合わせ | Drumverter
section-contact-description = ブラウザで使える無料のドラムMIDIコンバーター、Drumverterへのご質問、ご意見、ドラム音源の追加リクエストはこちら。
section-terms-label = 利用規約
section-terms-heading = 利用規約
section-terms-title = 利用規約 | Drumverter
section-terms-description = ブラウザで使える無料のドラムMIDIコンバーター、Drumverterの利用規約：現状のまま提供、ファイルのアップロードなし、Cookieを使わない匿名の統計のみ。
skip-to-content = 本文へスキップ
nav-main = メイン
nav-site = サイト
lang-menu-label = 言語
lang-load-failed = { $language }を読み込めませんでした。接続を確認して、もう一度お試しください。
lang-offer = このページは日本語でもご覧いただけます →
open-converter = コンバーターを開く →
error-unknown-engine = 不明な{ $role ->
    [source] 変換元
   *[target] 変換先
}のドラム音源「{ $id }」
error-bad-midi = このコンバーターで読み込めるMIDIファイルではありません
error-bad-preset = プリセットファイルではありません
error-bad-overrides = ノートの編集内容を読み込めませんでした
error-bad-missing = 不足パーツの設定が不明です
error-bad-channel = チャンネルの設定が不明です
error-internal = 問題が発生しました
error-wasm-unavailable = コンバーターを読み込めませんでした
error-detail = 詳細：{ $detail }
blocker-files-and-engines = .midファイルを追加し、両方のドラム音源を選択してください
blocker-files = 変換する.midファイルを追加してください
blocker-engines = 変換元と変換先のドラム音源を選択してください
channel-auto = 自動
channel-all = 全チャンネル
channel-number = { $channel }
channel-hint-auto = チャンネル10のトラックのみ、他はそのまま
channel-hint-all = すべてのチャンネルを変換
channel-hint-one = チャンネル{ $channel }のみ変換
missing-nearest = 近似
missing-drop = 除外
missing-hint-nearest = 最も近いパーツで鳴らす
missing-hint-drop = 鳴らさずに省く
missing-hint-moved = { $count ->
    [0] 別のパーツで鳴らすパーツはなし
   *[other] { $count }個のパーツを別のパーツで鳴らす
}
missing-hint-dropped = { $count ->
    [0] 除外するパーツはなし
   *[other] { $count }個のパーツを除外
}
files-unreadable = { $names }を読み込めませんでした。{ $count ->
   *[other] もう一度選択してください。
}
preset-skipped = { $count ->
   *[other] 「{ $name }」の{ $count }件の編集は、このバージョンにないパーツを使っているためスキップしました。
}
import-failed = { $file }をインポートできませんでした：{ $error }
import-at-cap = { $file }をインポートできませんでした：プリセットの上限（{ $cap }個）に達しています
import-done = 「{ $name }」をインポートしました。
import-done-skipped = 「{ $name }」をインポートしました（{ $count ->
   *[other] { $count }件の編集
}をスキップ）。
edit-line = { $drum }：{ $now }（デフォルト：{ $byDefault }）
edit-more = +{ $count }件
app-intro = GetGood Drums、EZdrummer、Superior Drummer 3、Addictive Drums 2、General MIDI、Guitar Proをはじめ、80種類以上のドラム音源のノート配置間でドラムMIDIを変換します。ブラウザ上で動作し、ファイルがアップロードされることはありません。
app-loading = コンバーターを読み込み中…
convert-error = エラー：{ $error }
notice-dismiss = 閉じる
channel-label = ドラムチャンネル
channel-tip-title = 変換されるノート
channel-tip = 「自動」は、General MIDIのドラムチャンネルであるチャンネル10を使うトラックをすべて変換し、他の楽器には手を加えません。ドラムが別のチャンネルにある場合は、そのチャンネルか「全チャンネル」を選んでください。
missing-label = 不足パーツ
missing-tip-title = 変換先にないパーツの扱い
missing-tip = 「近似」は、変換先にある最も近いパーツで鳴らします（ChinaはCrashで、Tom 4はTom 3で）。「除外」はそのノートを省きます。ゴーストノートやリムショットなど、変換先にあるパーツの奏法違いは、常にそのパーツの通常の打音になります。
edited-review = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認
edited-review-saved = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認（プリセット「{ $name }」）
edited-review-unsaved = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認（「{ $name }」に未保存）
edited-differ = { $count ->
   *[other] { $count }個のパーツ
}がデフォルトのマッピングと異なります
edited-click = クリックすると確認・リセットできます。
edited-count = 編集済み { $count }
edited-count-unsaved = 編集済み { $count } · 未保存
octave-label = オクターブ表記
octave-tip-title = 表記のみの設定
octave-tip = MIDIノート0がどのオクターブにあたるかを設定し、ノート名をお使いのDAWに合わせます。表示だけの設定で、ファイルに書き込まれるノートは変わりません。
canon-picker-label = { $note }に割り当てるパーツ
canon-picker-heading = 変換元 · { $note }
close = 閉じる
dropzone-heading = .MIDをドロップ
dropzone-presets = プリセット（.drumverter.json）も可
convert-running = 変換中
convert-button = 変換してダウンロード
engine-from = 変換元
engine-to = 変換先
engine-swap = 変換元と変換先を入れ替え
filter-clear = 検索をクリア
note-picker-label = { $drum }の変換先ノート
note-picker-heading = 変換先 · { $drum }
source-picker-label = { $drum }の変換元ノート
source-picker-heading = 入力 · { $drum }
mid-badge = MID
plan-error = ノートエディターを読み込めませんでした：{ $error }
plan-error-reset = 編集をリセット
crash-heading = 問題が発生しました
crash-body = コンバーターで回復できないエラーが発生しました。通常は再読み込みで直ります。繰り返し起きる場合は、保存したプリセットが破損している可能性があります。
crash-reload = 再読み込み
crash-reset = 保存データをリセット…
crash-reset-confirm = 保存したプリセット、お気に入り、設定を削除しますか？
crash-reset-do = 削除して再読み込み
cancel = キャンセル
saved-group = 保存したマッピング
saved-heading = 保存済み
edit-back = ← 戻る
edit-heading = ノートを編集
edit-advanced = 詳細設定 — 変換元ノートを割り当て直す
summary-remapped = { $total ->
   *[other] { $total }個中{ $remapped }個のパーツをリマップ
}
summary-edit-tip-title = パーツごとに微調整
summary-edit-tip = どのパーツも別の変換先ノートに割り当て直せます。パーツ一覧か鍵盤から選んでください。変更は変換に反映され、プリセットとして保存できます。
summary-edit = ノートを個別に編集 →
row-extras-dropped = { $count ->
   *[other] ほかに{ $count }個の変換元ノートが{ $drum }を鳴らします：{ $notes }。どれにも変換先がありません。
}
row-extras = { $count ->
    [1] ほかに{ $count }個の変換元ノートが{ $drum }を鳴らします：{ $notes }。どちらも{ $target }になります。
   *[other] ほかに{ $count }個の変換元ノートが{ $drum }を鳴らします：{ $notes }。すべて{ $target }になります。
}
row-reset = { $drum }をリセット
edit-filter-label = パーツを絞り込み
edit-filter-placeholder = パーツを検索…
library-filter-placeholder = 検索…
edit-show = 表示
edit-show-all = 全{ $count }件
edit-show-changed = 変更{ $count }件
edit-show-issues = 問題{ $count }件
edit-actions = 編集操作
edit-changes = { $count ->
    [0] 変更なし
   *[other] { $count }件の変更
}
edit-reset-all = すべてリセット
edit-done = 完了
row-no-source = 変換元なし
row-dropped = 除外
rows-drum = パーツ
rows-source = 変換元
rows-target = 変換先
rows-plays = 鳴るパーツ
rows-none = 該当するパーツはありません
rows-reassigned = { $note }：{ $from }から{ $drum }に変更
preset-tip-title = このマッピングを再利用
preset-tip = 変換元→変換先の組み合わせとノートの変更を、メイン画面にボタンとして保存します。ワンクリックで読み込み直せます。保存先はこのブラウザだけです。
preset-update-open = プリセットを更新
preset-save-open = プリセットとして保存
preset-name = プリセット名
preset-update = 更新
preset-save-new = 新規保存
preset-save = 保存
preset-exists = { $pair }のプリセットはすでにあります。
preset-at-cap = プリセットの上限（{ $cap }個）に達しました。
source-unassigned = — 未割り当て
source-unmapped = 割り当てなし
source-clear = 変換元ノート{ $note }を削除
source-add-label = 変換元ノートを追加
source-add-placeholder = ノート0〜127
source-add = 追加
source-add-invalid = 0〜127のノート番号を入力してください
library-group = { $side }のドラム音源
library-filter = { $side }のドラム音源を絞り込み
library-hint = 入力すると絞り込めます。矢印キーで移動、Enterで選択、Ctrl+Enterでお気に入りに追加・削除できます。
library-list = { $side }のドラム音源一覧
library-favourites = お気に入り
library-all = すべてのドラム音源
library-none = 該当なし
files-skipped = { $names }をスキップしました。追加できるのは.midファイルとエクスポートしたプリセット（.drumverter.json）だけです
files-drop = ページのどこかに.midファイルをドロップするか、クリックして選択
files-presets = エクスポートしたプリセットファイル（.drumverter.json）も、同じ方法でドロップまたは選択できます。
files-remove = { $name }を削除
files-add-more = + 追加
files-clear = すべてクリア
chip-rename = 名前を変更
chip-duplicate = 複製
chip-export = エクスポート
chip-delete = 削除
chip-rename-label = { $name }の名前を変更
chip-rename-save = 名前を保存
chip-rename-cancel = 名前の変更をキャンセル
chip-overrides = { $count ->
   *[other] { $count }件の変更
}
chip-unavailable = この音源は利用できません
chip-edit = { $name }のノートを編集
chip-more = { $name }のその他の操作
chip-at-cap = プリセットの上限に達しました
done-tag-converted = { $count ->
   *[other] { $count }個のノートを変換
}
done-tag-nothing = 変換なし
done-tag-approximated = 近似 { $count }
done-tag-dropped = 除外 { $count }
done-tag-unrecognized = 不明 { $count }
done-tag-untouched = 他のチャンネル（変更なし） { $count }
done-tag-failed = 失敗 { $count }
done-file-approximated = 近似 { $count }
done-file-dropped = 除外 { $count }
done-file-unrecognized = 不明 { $count }
done-file-clean = 正常
done-heading = { $count ->
   *[other] { $count }ファイル
}を変換 → { $target }
done-edited = { $count ->
   *[other] { $count }個のパーツを編集済み
}
done-download-one = ↓ .midをダウンロード
done-download-zip = ↓ { $count }ファイルをダウンロード（.zip）
done-files = 変換済みファイル
done-file-download = ↓ .mid
done-view-report = レポートを表示 →
done-convert-more = 続けて変換
drop-missing = 不足パーツを除外して再変換
report-dropped = 除外
report-approximated = 近似
report-unrecognized = 不明
report-dropped-hint = { $target }に該当するパーツがありません
report-approximated-hint = 最も近いパーツで鳴らします
report-unrecognized-hint = { $source }のマップにないため、ファイルから削除します
report-pick-target = 変換先を選択 →
report-assign = 割り当て →
report-across = { $count }ファイル全体：{ $summary }
report-contact = 割り当ての誤りや未対応のドラム音源がありましたら、{ $issue }を作成するか、{ $email }までメールでお知らせください。
report-contact-issue = GitHubのIssue
report-unchanged = 変更なし
report-unchanged-hint = 他のトラック・チャンネル
report-unchanged-entry = 他のトラックやチャンネルのノート（そのまま）
report-channel = ドラムチャンネル →
report-nothing = 何も変換されませんでした
report-nothing-channel = — 選択したドラムチャンネルにノートがありません。別のドラムチャンネルか「全チャンネル」を選んでください。
report-nothing-notes = — このファイルにドラムのノートが見つかりません。
report-clean = 問題なく変換
report-clean-detail = — すべてのパーツを{ $target }に直接割り当てました。
report-heading = 変換レポート
converter-title = Drumverter — 無料のドラムMIDI変換・リマップツール
converter-description = 無料のドラムMIDIコンバーター：GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums、General MIDI、Guitar Pro間でドラムMIDIをブラウザ上でリマップ。
converter-og-description = GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなど80種類以上のドラム音源間でドラムMIDIを変換。無料、ブラウザで動作。
converter-image-alt = Drumverter — ドラムMIDI変換・リマップツール
converter-twitter-description = ブラウザで使える無料のドラムMIDIリマップツール — ドラム音源ごとのノート配置に合わせてドラムMIDIをリマップ。
converter-app-description = ドラム音源ごとのノート配置に合わせてドラムMIDIをリマップする、ブラウザで使える無料ツール。
converter-noscript = Drumverterは無料のドラムMIDIリマップツールです。あるドラム音源のノート配置用に作られたドラムMIDIファイルを、別の音源のノート配置に変換します。たとえばGetGood DrumsのMIDIを、EZdrummer、Superior Drummer、Addictive Drums、General MIDI、Guitar Pro用にリマップできます。共通のドラム語彙と、パーツごとの代替候補を使って変換します。処理はすべてブラウザ内で行われます。コンバーターを使うにはJavaScriptを有効にしてください。
load-failed = Drumverterを読み込めませんでした。接続を確認して、ページを再読み込みしてください。
load-failed-reload = 再読み込み
maps-breadcrumb = パンくずリスト
maps-index-title = { $count }種類のドラム音源のMIDIノートマップ | Drumverter
maps-index-description = { $count }種類のドラム音源のMIDIノートマップと、GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなどの間の変換表。
maps-index-heading = ドラムMIDIノートマップ
maps-index-intro = { $count }種類のドラム音源のノート表と、人気の音源どうしの変換表です。Drumverterのコンバーターと同じマッピングデータを使っています。
maps-popular = 人気の変換
maps-more-engines = その他のドラム音源
maps-matrix-corner = 変換元 ↓ 変換先 →
maps-pair-link = { $source }から{ $target }へ
maps-matrix-hint = 矢印をクリックすると、その行の音源からその列の音源への変換表が開きます。
maps-all-engines = 全{ $count }種類のドラム音源
maps-filter-engines-label = ドラム音源を絞り込み
maps-filter-engines-placeholder = 音源を検索…
maps-no-engines = 該当するドラム音源はありません
maps-engine-title = { $engineMidi }のノートマップとドラムの割り当て | Drumverter
maps-engine-title-long-name = MIDIノートマップ：{ $engine } | Drumverter
maps-engine-description = { $engine }のドラムMIDIノートマップ：全{ $total }個のノートとパーツ名を、C-1とC-2の両方のオクターブ表記で掲載。
maps-engine-description-short = { $engine }のドラムMIDIノートマップ（C-1・C-2表記のノート名付き）。
maps-engine-description-more = { $engineMidi }をどのドラム音源にも無料で変換できます。
maps-engine-heading = { $engine }のドラムMIDIノートマップ
maps-engine-intro = { $engine }が反応するすべてのMIDIノート（全{ $total }個）を、パーツ別にまとめています。ノート名は、C-1（Reaper、Logic、Ableton、Guitar Pro）とC-2（Studio One、Cubase、FL Studio）のどちらのオクターブ表記でも表示できます。
maps-convert-to = { $engine }に変換
maps-convert-from = { $engine }から変換
maps-filter-drums-label = パーツを絞り込み
maps-filter-drums-placeholder = パーツ・ノートで検索…
maps-octave-naming = オクターブ表記
maps-column-note = ノート
maps-column-drum = パーツ
maps-conversion-tables = 変換表
maps-pair-heading = { $sourceMidi }を{ $target }に変換
maps-pair-title = { $sourceMidi }を{ $target }に変換 | Drumverter
maps-pair-description = { $source }のドラムMIDIを{ $target }に変換：{ $exact ->
   *[other] 一致{ $exact }個
}、近似{ $approximated }個、除外{ $dropped }個。
maps-pair-description-more = ブラウザで使える無料コンバーター。
maps-pair-summary = { $source }の全{ $total }個のノートのうち、{ $exact ->
   *[other] { $exact }個
}は{ $target }にそのまま対応し、{ $approximated ->
   *[other] { $approximated }個
}は利用できる最も近いパーツで近似し、{ $dropped ->
   *[other] { $dropped }個
}には対応するパーツがありません。
maps-pair-convert = 変換：{ $source } → { $target }
maps-reverse = ⇄ 逆方向
maps-exact-count = 一致 { $count }
maps-approximated-count = 近似 { $count }
maps-dropped-count = 除外 { $count }
maps-rows = 表示する行
maps-rows-changes = 変更{ $count }件
maps-column-engine-note = { $engine }のノート
maps-column-engine-drum = { $engine }のパーツ
maps-column-to = 変換後
maps-column-result = 結果
maps-no-equivalent = 該当なし
maps-status-exact = 一致
maps-status-approximated = 近似
maps-status-dropped = 除外
maps-more-from = { $engine }からのその他の変換
maps-full-maps = 各音源のノートマップ：

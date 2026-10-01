brand-tagline = ドラムMIDI変換・リマップツール
nav-converter = コンバーター
nav-note-maps = ノートマップ
section-guide-label = 使い方
section-guide-heading = ドラムMIDIを変換する方法
section-guide-title = ドラムMIDIを別のドラム音源用に変換する方法 | Drumverter
section-guide-description = GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなど80種類以上のドラム音源のあいだで、ドラムMIDIを3ステップで変換。無料で、ブラウザだけで使えます。
section-faq-label = FAQ
section-faq-heading = よくある質問
section-faq-title = ドラムMIDIコンバーターのよくある質問 | Drumverter
section-faq-description = Drumverterのよくある質問：料金、プライバシー、オクターブ表記（C-1とC-2）、まとめて変換、変換先にないパーツがどうなるか。
section-issue-label = 問題を報告
section-issue-heading = 問題を報告
section-issue-title = 問題を報告 | Drumverter
section-issue-description = ドラムの割り当てがおかしい、Drumverterに入れてほしいドラム音源がある、という場合はGitHubかメールでお知らせください。
section-contact-label = お問い合わせ
section-contact-heading = お問い合わせ
section-contact-title = お問い合わせ | Drumverter
section-contact-description = ブラウザで使える無料のドラムMIDIコンバーター、Drumverterへのご質問、ご意見、ドラム音源の追加リクエストはこちら。
section-terms-label = 利用規約
section-terms-heading = 利用規約
section-terms-title = 利用規約 | Drumverter
section-terms-description = ブラウザで使える無料のドラムMIDIコンバーター、Drumverterの利用規約：現状のまま提供、ファイルはアップロードされず、Cookieを使わない匿名の統計のみ。
skip-to-content = 本文へスキップ
nav-main = メイン
nav-site = サイト
lang-menu-label = 言語
lang-load-failed = { $language }を読み込めませんでした。インターネット接続を確認して、もう一度お試しください。
lang-offer = このページは日本語でもご覧いただけます →
open-converter = コンバーターを開く →
error-unknown-engine = 不明な{ $role ->
    [source] 変換元
   *[target] 変換先
}のドラム音源「{ $id }」
error-bad-midi = このファイルは読み込めません。MIDIファイルではないようです
error-bad-preset = プリセットファイルではありません
error-bad-overrides = ノートの編集内容を読み込めませんでした
error-bad-missing = 「足りないパーツ」の設定が不明です
error-bad-channel = チャンネルの設定が不明です
error-internal = 問題が発生しました
error-wasm-unavailable = コンバーターを読み込めませんでした
error-detail = 詳細：{ $detail }
blocker-files-and-engines = .midファイルを追加して、ドラム音源を2つとも選んでください
blocker-files = まず.midファイルを追加してください
blocker-engines = 変換元と変換先のドラム音源を選んでください
channel-auto = 自動
channel-all = 全チャンネル
channel-number = { $channel }
channel-hint-auto = チャンネル10のトラックだけ、ほかはそのまま
channel-hint-all = すべてのチャンネルを変換
channel-hint-one = チャンネル{ $channel }だけ変換
missing-nearest = 置き換え
missing-drop = 削除
missing-hint-nearest = いちばん近いパーツに置き換える
missing-hint-drop = ファイルから削除する
missing-hint-moved = { $count ->
    [0] 置き換えるパーツはなし
   *[other] { $count }個のパーツを置き換え
}
missing-hint-dropped = { $count ->
    [0] 削除するパーツはなし
   *[other] { $count }個のパーツを削除
}
files-unreadable = { $names }を読み込めませんでした。{ $count ->
   *[other] もう一度選んでください。
}
preset-skipped = { $count ->
   *[other] 「{ $name }」の編集のうち{ $count }件は、このバージョンにないパーツのものなのでスキップしました。
}
import-failed = { $file }をインポートできませんでした：{ $error }
import-at-cap = { $file }をインポートできませんでした：プリセットは{ $cap }個までです
import-done = 「{ $name }」をインポートしました。
import-done-skipped = 「{ $name }」をインポートしました（{ $count ->
   *[other] { $count }件の編集
}はスキップ）。
edit-line = { $drum }：{ $now }（デフォルト：{ $byDefault }）
edit-more = ほか{ $count }件
app-intro = GetGood Drums、EZdrummer、Superior Drummer 3、Addictive Drums 2、General MIDI、Guitar Proなど、80種類以上のドラム音源のノート配置に合わせてドラムMIDIを変換します。ブラウザだけで動き、ファイルはアップロードされません。
app-loading = コンバーターを読み込み中…
convert-error = エラー：{ $error }
notice-dismiss = 閉じる
channel-label = ドラムチャンネル
channel-tip-title = どのノートを変換するか
channel-tip = 「自動」では、General MIDIのドラムチャンネルであるチャンネル10を使うトラックをすべて変換し、ほかの楽器はそのままにします。ドラムが別のチャンネルにある場合は、そのチャンネルか「全チャンネル」を選んでください。
missing-label = 足りないパーツ
missing-tip-title = 変換先にないパーツがあるとき
missing-tip = 「置き換え」では、変換先にあるいちばん近いパーツで鳴らします（ChinaならCrash、Tom 4ならTom 3）。「削除」では、そのノートをファイルから消します。ゴーストノートやリムショットなど、変換先にあるパーツの奏法違いは、いつもそのパーツの普通の打音になります。
edited-review = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認
edited-review-saved = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認（プリセット「{ $name }」）
edited-review-unsaved = { $count ->
   *[other] { $count }個のパーツを編集済み
} — 変更を確認（「{ $name }」には未保存）
edited-differ = { $count ->
   *[other] { $count }個のパーツ
}がデフォルトの割り当てと違います
edited-click = クリックして確認・リセットできます。
edited-count = 編集済み { $count }
edited-count-unsaved = 編集済み { $count } · 未保存
octave-label = オクターブ表記
octave-tip-title = 表示だけの設定です
octave-tip = お使いのDAWと同じノート名になるよう、MIDIノート0をどのオクターブとして表示するかを決めます。表示が変わるだけで、ファイルに書き込むノートは変わりません。
canon-picker-label = { $note }に割り当てるパーツ
canon-picker-heading = 変換元 · { $note }
close = 閉じる
dropzone-heading = .MIDをドロップ
dropzone-presets = プリセット（.json）もOK
convert-running = 変換中
convert-button = 変換する
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
crash-body = コンバーターでエラーが起きて、動作を続けられなくなりました。たいていは再読み込みで直ります。何度も起きる場合は、保存したプリセットが壊れているかもしれません。
crash-reload = 再読み込み
crash-reset = 保存データをリセット…
crash-reset-confirm = 保存したプリセット、お気に入り、設定を削除しますか？
crash-reset-do = 削除して再読み込み
cancel = キャンセル
saved-group = 保存したマッピング
saved-heading = 保存済み
edit-back = ← 戻る
edit-heading = ノートを編集
edit-advanced = 詳細 — 変換元ノートを割り当て直す
summary-remapped = { $total ->
   *[other] { $total }個中{ $remapped }個のパーツをリマップ
}
summary-edit-tip-title = パーツごとに微調整
summary-edit-tip = どのパーツも、別の変換先ノートに割り当て直せます。パーツ一覧か鍵盤から選んでください。変更は変換に反映され、プリセットとして保存することもできます。
summary-edit = ノートを個別に編集 →
missing-detail-moved = 別のパーツに置き換え
missing-detail-dropped = ファイルから削除
detail-edit = ノートエディターで変更 →
summary-detail-heading = { $total ->
   *[other] このマップのパーツ：{ $total }個
}
summary-detail-moved = 新しいノートへ
summary-detail-same = すでに正しいノート
summary-detail-variant = 近いバリエーションで再生
summary-detail-swapped = 別のパーツに置き換え
summary-detail-dropped = 削除
summary-detail-unplayed = 変換元の音源にない
summary-reason-same = 両方の音源で同じノート
summary-reason-variant = { $target }に完全に一致するパーツがないため、同じパーツのバリエーションで鳴らします
summary-reason-swapped = { $target }に該当パーツがないため、いちばん近いパーツで鳴らします
summary-reason-dropped = { $target }に該当パーツなし
summary-reason-unplayed = { $source }にノートなし
row-extras-dropped = { $count ->
   *[other] ほかに{ $count }個の変換元ノートが{ $drum }を鳴らします：{ $notes }。どれも変換先がありません。
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
edit-actions = 編集メニュー
edit-changes = { $count ->
    [0] 変更なし
   *[other] { $count }件の変更
}
edit-reset-all = すべてリセット
edit-done = 完了
row-no-source = 変換元なし
row-dropped = 削除
rows-drum = パーツ
rows-source = 変換元
rows-target = 変換先
rows-plays = 鳴るパーツ
rows-none = 該当するパーツはありません
rows-reassigned = { $note }：{ $from }から{ $drum }に変更
preset-tip-title = このマッピングをまた使う
preset-tip = 変換元→変換先の組み合わせとノートの変更を、メイン画面にボタンとして保存します。ワンクリックで呼び出せます。保存されるのはこのブラウザだけです。
preset-update-open = プリセットを更新
preset-save-open = プリセットとして保存
preset-name = プリセット名
preset-update = 更新
preset-save-new = 新規保存
preset-save = 保存
preset-exists = { $pair }のプリセットはすでにあります。
preset-at-cap = プリセットは{ $cap }個までです。これ以上は保存できません。
source-unassigned = — 未割り当て
source-unmapped = 割り当てなし
source-clear = 変換元ノート{ $note }を削除
source-add-label = 変換元ノートを追加
source-add-placeholder = ノート0〜127
source-add = 追加
source-add-invalid = 0〜127のノート番号を入力してください
library-group = { $side }のドラム音源
library-filter = { $side }のドラム音源を絞り込み
library-hint = 入力して絞り込めます。矢印キーで移動、Enterで選択、Ctrl+Enterでお気に入りに追加・削除できます。
library-list = { $side }のドラム音源一覧
library-favourites = お気に入り
library-all = すべてのドラム音源
library-none = 該当なし
files-skipped = { $names }はスキップしました。追加できるのは.midファイルと、エクスポートしたプリセット（.json）だけです
files-drop = .midファイル（複数可）をページのどこかにドロップ
files-choose = ファイルを選択
files-presets = エクスポートしたプリセット（.json）も、同じようにドロップまたは選択できます。
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
chip-unavailable = この音源は使えません
chip-edit = { $name }のノートを編集
chip-more = { $name }のその他の操作
chip-at-cap = プリセットはこれ以上保存できません
done-tag-converted = { $count ->
   *[other] { $count }個のノートを変換
}
done-tag-nothing = 変換なし
done-tag-approximated = 置き換え { $count }
done-tag-dropped = 削除 { $count }
done-tag-unrecognized = 不明 { $count }
done-tag-untouched = ほかのチャンネル（そのまま） { $count }
done-tag-failed = 失敗 { $count }
done-file-approximated = 置き換え { $count }
done-file-dropped = 削除 { $count }
done-file-unrecognized = 不明 { $count }
done-file-clean = 問題なし
done-heading = { $count ->
   *[other] { $count }ファイル
}を変換 → { $target }
done-edited = { $count ->
   *[other] { $count }個のパーツを編集済み
}
done-download-one = ↓ .midをダウンロード
done-download-zip = ↓ { $count }ファイルをダウンロード（.zip）
done-files = 変換したファイル
done-file-download = ↓ .mid
tip-link = コーヒーで応援する
tip-ask = Drumverterは、私が一人で空き時間に作っています。リマップの手間が少しでも省けたなら、コーヒー1杯分の応援をいただけると、無料・広告なしのまま続けていけます。
tip-amounts = 開発者を応援
tip-other = 金額を指定
thanks-title = ありがとうございます | Drumverter
thanks-description = 無料のドラムMIDIコンバーター、Drumverterへのご支援ありがとうございます。
thanks-heading = ありがとうございます！
thanks-body = いただいたコーヒーのおかげで、Drumverterを無料・広告なしで続けられます。領収書はStripeからメールで届きます。
done-view-report = レポートを表示 →
done-convert-more = 続けて変換
done-report-mapping = 割り当ての間違いを報告
drop-missing = 足りないパーツを削除して再変換
report-dropped = 削除
report-approximated = 置き換え
report-unrecognized = 不明
report-dropped-hint = { $target }にはこのパーツがありません
report-approximated-hint = いちばん近いパーツで鳴らします
report-unrecognized-hint = { $source }のマップにないので、ファイルから削除します
report-pick-target = 変換先を選ぶ →
report-assign = 割り当てる →
report-across = { $count }ファイルの合計：{ $summary }
report-contact = 割り当ての間違いや、対応していないドラム音源があれば、{ $issue }を作成するか、{ $email }までメールでお知らせください。
report-contact-issue = GitHubのIssue
report-unchanged = 変更なし
report-unchanged-hint = ほかのトラック・チャンネル
report-unchanged-entry = ほかのトラックやチャンネルのノート（そのまま）
report-channel = ドラムチャンネル →
report-nothing = 何も変換されませんでした
report-nothing-channel = — 選んだドラムチャンネルにノートがありません。別のドラムチャンネルか「全チャンネル」を選んでください。
report-nothing-notes = — このファイルにはドラムのノートがありません。
report-clean = 問題なく変換できました
report-clean-detail = — すべてのパーツを{ $target }にそのまま割り当てました。
report-heading = 変換レポート
converter-title = Drumverter — 無料のドラムMIDI変換・リマップツール
converter-description = 無料のドラムMIDIコンバーター：GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums、General MIDI、Guitar Proのあいだで、ドラムMIDIをブラウザ上でリマップ。
converter-og-description = GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなど80種類以上のドラム音源のあいだでドラムMIDIを変換。無料、ブラウザで動作。
converter-image-alt = Drumverter — ドラムMIDI変換・リマップツール
converter-twitter-description = ブラウザで使える無料のドラムMIDIリマップツール — ドラム音源ごとのノート配置に合わせてドラムMIDIをリマップ。
converter-app-description = ドラム音源ごとのノート配置に合わせてドラムMIDIをリマップする、ブラウザで使える無料ツール。
converter-noscript = Drumverterは無料のドラムMIDIリマップツールです。あるドラム音源のノート配置で作られたドラムMIDIファイルを、別の音源のノート配置に合わせて変換します。たとえばGetGood DrumsのMIDIを、EZdrummer、Superior Drummer、Addictive Drums、General MIDI、Guitar Pro用にリマップできます。パーツごとに対応を決めてあり、変換先にないパーツはいちばん近いパーツに置き換えます。処理はすべてブラウザ内で行います。コンバーターを使うにはJavaScriptを有効にしてください。
load-failed = Drumverterを読み込めませんでした。インターネット接続を確認して、ページを再読み込みしてください。
load-failed-reload = 再読み込み
maps-breadcrumb = パンくずリスト
maps-index-title = { $count }種類のドラム音源のMIDIノートマップ | Drumverter
maps-index-description = { $count }種類のドラム音源のMIDIノートマップと、GetGood Drums、EZdrummer、Superior Drummer、Addictive Drumsなどのあいだの変換表。
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
maps-engine-description-more = { $engineMidi }をほかのドラム音源用に無料で変換できます。
maps-engine-heading = { $engine }のドラムMIDIノートマップ
maps-engine-intro = { $engine }が反応するMIDIノート（全{ $total }個）を、パーツ別にまとめました。ノート名は、C-1（Reaper、Logic、Ableton、Guitar Pro）とC-2（Studio One、Cubase、FL Studio）のどちらのオクターブ表記でも表示できます。
maps-convert-to = { $engine }に変換
maps-convert-from = { $engine }から変換
maps-filter-drums-label = パーツを絞り込み
maps-filter-drums-placeholder = パーツ・ノートで検索…
maps-octave-naming = オクターブ表記
maps-column-note = ノート
maps-column-drum = パーツ
maps-conversion-tables = 変換表
maps-pair-heading = { $sourceMidi }を{ $target }用に変換
maps-pair-title = { $sourceMidi }を{ $target }用に変換 | Drumverter
maps-pair-description = { $source }のドラムMIDIを{ $target }用に変換：{ $exact ->
   *[other] 一致{ $exact }個
}、置き換え{ $approximated }個、削除{ $dropped }個。
maps-pair-description-more = ブラウザで使える無料コンバーター。
maps-pair-summary = { $source }の全{ $total }個のノートのうち、{ $exact ->
   *[other] { $exact }個
}は{ $target }にそのまま対応し、{ $approximated ->
   *[other] { $approximated }個
}はいちばん近いパーツに置き換わり、{ $dropped ->
   *[other] { $dropped }個
}は対応するパーツがありません。
maps-pair-convert = 変換：{ $source } → { $target }
maps-reverse = ⇄ 逆方向
maps-exact-count = 一致 { $count }
maps-approximated-count = 置き換え { $count }
maps-dropped-count = 削除 { $count }
maps-rows = 表示する行
maps-rows-changes = 変更{ $count }件
maps-column-engine-note = { $engine }のノート
maps-column-engine-drum = { $engine }のパーツ
maps-column-to = 変換後
maps-column-result = 結果
maps-no-equivalent = 該当なし
maps-status-exact = 一致
maps-status-approximated = 置き換え
maps-status-dropped = 削除
maps-more-from = { $engine }からのその他の変換
maps-full-maps = 各音源のノートマップ：

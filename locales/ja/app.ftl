brand-tagline = ドラムMIDI変換・リマップツール
nav-converter = コンバーター
nav-note-maps = ノートマップ
nav-drum-maps = ドラムマップ
section-guide-label = 使い方
section-guide-heading = ドラムMIDIを変換する方法
section-faq-label = FAQ
section-faq-heading = よくある質問
section-issue-label = 問題を報告
section-issue-heading = 問題を報告
section-contact-label = お問い合わせ
section-contact-heading = お問い合わせ
section-terms-label = 利用規約
section-terms-heading = 利用規約
skip-to-content = 本文へスキップ
nav-main = メイン
nav-site = サイト
lang-menu-label = 言語
lang-load-failed = { $language }を読み込めませんでした。インターネット接続を確認して、もう一度お試しください。
error-unknown-engine =
    不明な{ $role ->
        [source] 変換元
       *[target] 変換先
    }のドラム音源「{ $id }」
error-bad-midi = このファイルは読み込めません。MIDIファイルではないようです
error-bad-preset = プリセットファイルではありません
error-bad-overrides = ノートの編集内容を読み込めませんでした
error-bad-missing = 「足りないパーツ」の設定が不明です
error-internal = 問題が発生しました
error-wasm-unavailable = コンバーターを読み込めませんでした
error-detail = 詳細：{ $detail }
blocker-files-and-engines = { "." }midファイルを追加して、ドラム音源を2つとも選んでください
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
missing-hint-moved =
    { $count ->
        [0] 置き換えるパーツはなし
       *[other] { $count }個のパーツを置き換え
    }
missing-hint-dropped =
    { $count ->
        [0] 削除するパーツはなし
       *[other] { $count }個のパーツを削除
    }
files-unreadable =
    { $names }を読み込めませんでした。{ $count ->
       *[other] もう一度選んでください。
    }
preset-skipped =
    { $count ->
       *[other] 「{ $name }」の編集のうち{ $count }件は、このバージョンにないパーツのものなのでスキップしました。
    }
import-failed = { $file }をインポートできませんでした：{ $error }
import-at-cap = { $file }をインポートできませんでした：プリセットは{ $cap }個までです
presets-unsaved = プリセットを保存できませんでした：ブラウザーの保存領域がいっぱいか、ブロックされています。再読み込みすると消えます。
import-done = 「{ $name }」をインポートしました。
import-done-skipped =
    「{ $name }」をインポートしました（{ $count ->
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
unrecognized-label = 不明なノート
unrecognized-tip-title = 変換元のノート配置にないノートがあるとき
unrecognized-tip = ファイルには、変換元のノート配置にないノートが入っていることがあります（別のキット用に書かれたパートなど）。「削除」では、そのノートをファイルから消します。「そのまま残す」では、同じノートのまま変えずに書き出します。どちらの場合もレポートに表示されます。
unrecognized-remove = 削除
unrecognized-keep = そのまま残す
unrecognized-hint-remove = ファイルから削除する
unrecognized-hint-keep = 変えずにそのまま残す
edited-review =
    { $count ->
       *[other] { $count }個のパーツを編集済み
    } — 変更を確認
edited-review-saved =
    { $count ->
       *[other] { $count }個のパーツを編集済み
    } — 変更を確認（プリセット「{ $name }」）
edited-review-unsaved =
    { $count ->
       *[other] { $count }個のパーツを編集済み
    } — 変更を確認（「{ $name }」には未保存）
edited-differ =
    { $count ->
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
dropzone-heading = { "." }MIDをドロップ
dropzone-presets = プリセット（.json）もOK
convert-running = 変換中
convert-button = 変換する
convert-button-ready = { $count }個のファイルを{ $target }用に変換
settings-heading = 設定
engine-from = 変換元
engine-to = 変換先
engine-swap = 変換元と変換先を入れ替え
engine-choose = ドラム音源を選ぶ…
engine-picker-heading = { $side }のドラム音源を選ぶ
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
summary-remapped =
    { $total ->
       *[other] { $total }個中{ $remapped }個のパーツをリマップ
    }
summary-edit-tip-title = パーツごとに微調整
summary-edit-tip = どのパーツも、別の変換先ノートに割り当て直せます。パーツ一覧か鍵盤から選んでください。変更は変換に反映され、プリセットとして保存することもできます。
summary-edit = ノートを個別に編集 →
summary-rack-label = { $source } → { $target }用のAbletonラックをダウンロード（.adg）
summary-rack = Abletonラック
summary-rack-tip-title = Abletonでライブ演奏
summary-rack-tip = Live 11と12用のMIDI Effect Rackです。{ $target }の前に置けば、{ $source }のMIDIが正しく鳴ります。ファイルの変換は不要です。ノートの編集と「足りないパーツ」の設定が反映されます。
rack-saved = ラックを保存しました：{ $file }。MIDIトラックの{ $target }の前にドラッグしてください。クリップの各行に、パーツと今鳴らすノートが表示されます。
rack-saved-dropped =
    ラックを保存しました：{ $file }。MIDIトラックの{ $target }の前にドラッグしてください。{ $count ->
       *[other] { $target }にないパーツ{ $count }個は、クリップの行に名前がなくD1のようなノート名だけが表示され、鳴りません。
    }
rack-failed = ラックを作成できませんでした：{ $error }
missing-detail-moved = 別のパーツに置き換え
missing-detail-dropped = ファイルから削除
detail-edit = ノートエディターで変更 →
summary-detail-heading =
    { $total ->
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
row-extras-dropped =
    { $count ->
       *[other] ほかに{ $count }個の変換元ノートが{ $drum }を鳴らします：{ $notes }。どれも変換先がありません。
    }
row-extras =
    { $count ->
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
edit-changes =
    { $count ->
        [0] 変更なし
       *[other] { $count }件の変更
    }
edit-reset-all = すべてリセット
edit-done = 完了
row-no-source = 変換元なし
row-dropped = 削除
row-chain-hint = { $target }には{ $drum }がないため、{ $standIn }で鳴らします。編集により、{ $standIn }は{ $landed }に送られます。クリックすると{ $standIn }の行に移動します。
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
files-drop = { "." }midファイル（複数可）をページのどこかにドロップ
files-choose = ファイルを選択
files-presets = エクスポートしたプリセット（.json）も、同じようにドロップまたは選択できます。
files-sample = サンプルのグルーヴで試す
files-sample-needs-from = 先に変換元のドラム音源を選んでください
files-remove = { $name }を削除
files-add-more = + 追加
files-clear = すべてクリア
step-file = ドラムのファイル
step-engines = ドラムの配置を別の配置へ
step-convert = 変換
step-done = 完了
files-sample-lead = 手元にファイルがない場合
chip-rename = 名前を変更
chip-duplicate = 複製
chip-export = エクスポート
chip-rack = Abletonラック
chip-delete = 削除
chip-rename-label = { $name }の名前を変更
chip-rename-save = 名前を保存
chip-rename-cancel = 名前の変更をキャンセル
chip-overrides =
    { $count ->
       *[other] { $count }件の変更
    }
chip-unavailable = この音源は使えません
chip-edit = { $name }のノートを編集
chip-more = { $name }のその他の操作
chip-at-cap = プリセットはこれ以上保存できません
done-tag-converted =
    { $count ->
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
done-heading =
    { $count ->
       *[other] { $count }ファイル
    }を変換 → { $target }
done-edited =
    { $count ->
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
done-view-report = レポートを表示 →
done-convert-more = 続けて変換
done-convert-more-hint = 次のファイルも変換できます。ドラム音源と設定はそのままです。
done-report-mapping = 割り当ての間違いを報告
done-removed = ファイル内の{ $count }個のノートは{ $source }のノート配置にないため、削除しました。変換元が違いますか？
done-kept = ファイル内の{ $count }個のノートは{ $source }のノート配置にないため、そのまま残しました。変換元が違いますか？
done-pick-source = 別の変換元を選ぶ
done-assign-notes = ノートを割り当てる
source-fit-missing = ファイル内の{ $hits }個のノートのうち{ $missing }個が{ $source }のノート配置にありません。より合う変換元：{ $engines }
source-fit-all = { $engine }（全ノート）
source-fit-some = { $engine }（{ $count }個）
drop-missing = 足りないパーツを削除して再変換
report-dropped = 削除
report-approximated = 置き換え
report-unrecognized = 不明
report-dropped-hint = { $target }にはこのパーツがありません
report-approximated-hint = いちばん近いパーツで鳴らします
report-unrecognized-hint = { $source }のマップにないので、ファイルから削除します
report-unrecognized-hint-kept = { $source }のマップにないので、そのまま残します
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
maps-popular = 人気の変換
maps-pair-link = { $source }から{ $target }へ

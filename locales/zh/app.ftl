brand-tagline = 鼓 MIDI 转换与重映射工具
nav-converter = 转换器
nav-note-maps = 音符映射表
nav-drum-maps = 鼓映射文件
section-guide-label = 使用方法
section-guide-heading = 如何转换鼓 MIDI
section-faq-label = 常见问题
section-faq-heading = 常见问题
section-issue-label = 反馈问题
section-issue-heading = 反馈问题
section-contact-label = 联系方式
section-contact-heading = 联系方式
section-terms-label = 使用条款
section-terms-heading = 使用条款
skip-to-content = 跳到主要内容
nav-main = 主要
nav-site = 网站
lang-menu-label = 语言
lang-load-failed = 无法加载 { $language }。请检查网络后重试。
error-unknown-engine = 未知的{ $role ->
    [source] 来源
   *[target] 目标
}鼓音源“{ $id }”
error-bad-midi = 无法读取此文件，它似乎不是 MIDI 文件
error-bad-preset = 不是预设文件
error-bad-overrides = 无法读取音符修改
error-bad-missing = 无法识别“缺少的鼓件”设置
error-internal = 出错了
error-wasm-unavailable = 转换器加载失败
error-detail = 详细信息：{ $detail }
blocker-files-and-engines = 请添加 .mid 文件，并选择来源和目标鼓音源
blocker-files = 请先添加 .mid 文件
blocker-engines = 请选择来源和目标鼓音源
channel-auto = 自动
channel-all = 所有通道
channel-number = { $channel }
channel-hint-auto = 含通道 10 音符的轨道 · 其余不变
channel-hint-all = 转换所有通道
channel-hint-one = 只转换通道 { $channel }
missing-nearest = 替换
missing-drop = 删除
missing-hint-nearest = 换成最接近的鼓件
missing-hint-drop = 从文件中删除
missing-hint-moved = { $count ->
    [0] 没有需要替换的鼓件
   *[other] { $count } 个鼓件会被替换
}
missing-hint-dropped = { $count ->
    [0] 没有需要删除的鼓件
   *[other] { $count } 个鼓件会被删除
}
files-unreadable = 无法读取 { $names }，请重新选择{ $count ->
    [1] 该文件
   *[other] 这些文件
}。
preset-skipped = { $count ->
   *[other] “{ $name }”中有 { $count } 处修改用到了当前版本不认识的鼓件，已跳过。
}
import-failed = 无法导入 { $file }：{ $error }
import-at-cap = 无法导入 { $file }：最多只能保存 { $cap } 个预设
presets-unsaved = 无法保存预设：浏览器存储空间已满或被阻止。刷新页面后将丢失。
import-done = 已导入“{ $name }”。
import-done-skipped = 已导入“{ $name }”（跳过了 { $count ->
   *[other] { $count } 处修改
}）。
edit-line = { $drum }：{ $now }（默认 { $byDefault }）
edit-more = 另有 { $count } 项
app-intro = 把鼓 MIDI 转换到 GetGood Drums、EZdrummer、Superior Drummer 3、Addictive Drums 2、General MIDI、Guitar Pro 等 80 多款鼓音源的音符布局。全程在浏览器里完成，文件不会上传。
app-loading = 正在加载转换器…
convert-error = 错误：{ $error }
notice-dismiss = 关闭
channel-label = 鼓通道
channel-tip-title = 转换哪些音符
channel-tip = “自动”会转换所有使用通道 10（General MIDI 的鼓通道）的轨道，其他乐器保持不变。如果鼓不在这个通道上，请选择对应的通道或“所有通道”。
missing-label = 缺少的鼓件
missing-tip-title = 目标鼓音源里没有某个鼓件时
missing-tip = “替换”会换成目标鼓音源里最接近的鼓件，例如 China 换成 crash，Tom 4 换成 Tom 3。“删除”会把这些音符从文件中删掉。如果目标鼓音源有这个鼓件，只是没有鬼音、rimshot 等演奏法，这些音符一律按该鼓件的普通敲击处理。
edited-review = 已编辑 { $count ->
   *[other] { $count } 个鼓件
}，查看更改
edited-review-saved = 已编辑 { $count ->
   *[other] { $count } 个鼓件
}，查看更改（来自预设 { $name }）
edited-review-unsaved = 已编辑 { $count ->
   *[other] { $count } 个鼓件
}，查看更改（未保存到 { $name }）
edited-differ = { $count ->
   *[other] 有 { $count } 个鼓件
}与默认映射不同
edited-click = 点击查看或重置。
edited-count = 已编辑 { $count }
edited-count-unsaved = 已编辑 { $count } · 未保存
octave-label = 八度标记
octave-tip-title = 只影响显示
octave-tip = 设置 MIDI 音符 0 位于哪个八度，让音名与 DAW 里显示的一致。只改变显示，写入文件的音符不变。
canon-picker-label = { $note } 对应的鼓件
canon-picker-heading = 来源 · { $note }
close = 关闭
dropzone-heading = 拖放 .MID
dropzone-presets = 或导出的预设（.json）
convert-running = 转换中
convert-button = 开始转换
engine-from = 来源
engine-to = 目标
engine-swap = 交换来源和目标
filter-clear = 清除筛选
note-picker-label = { $drum } 的目标音符
note-picker-heading = 目标 · { $drum }
source-picker-label = { $drum } 的来源音符
source-picker-heading = 输入 · { $drum }
mid-badge = MID
plan-error = 音符编辑器无法加载：{ $error }
plan-error-reset = 重置修改
crash-heading = 出错了
crash-body = 转换器出错了，无法继续运行。通常刷新页面就能解决；如果反复出现，可能是某个已保存的预设损坏了。
crash-reload = 刷新
crash-reset = 重置已保存的数据…
crash-reset-confirm = 要删除已保存的预设、收藏和设置吗？
crash-reset-do = 删除并刷新
cancel = 取消
saved-group = 已保存的映射
saved-heading = 已保存
edit-back = ← 返回
edit-heading = 编辑音符
edit-advanced = 高级：重新分配来源音符
summary-remapped = { $total ->
   *[other] { $total } 个鼓件中已重新映射 { $remapped } 个
}
summary-edit-tip-title = 逐个微调鼓件
summary-edit-tip = 每个鼓件都可以改用其他目标音符，在鼓件列表或琴键上选择即可。修改会用于本次转换，也可以保存为预设。
summary-edit = 编辑单个音符 →
missing-detail-moved = 换成了其他鼓件
missing-detail-dropped = 已从文件中删除
detail-edit = 在音符编辑器中修改 →
summary-detail-heading = { $total ->
   *[other] 此映射共 { $total } 个鼓件
}
summary-detail-moved = 换到新音符
summary-detail-same = 已在正确音符上
summary-detail-variant = 改用相近的变体
summary-detail-swapped = 换成了其他鼓件
summary-detail-dropped = 已删除
summary-detail-unplayed = 来源鼓音源中没有
summary-reason-same = 两个音源中音符相同
summary-reason-variant = { $target } 中没有完全对应的鼓件，改用同一鼓件的变体
summary-reason-swapped = { $target } 中没有对应鼓件，改用最接近的鼓件
summary-reason-dropped = { $target } 中没有对应鼓件
summary-reason-unplayed = { $source } 中没有音符
row-extras-dropped = { $count ->
   *[other] 另有 { $count } 个来源音符触发 { $drum }：{ $notes }。都没有目标音符。
}
row-extras = { $count ->
    [1] 另有 { $count } 个来源音符触发 { $drum }：{ $notes }。两者都映射到 { $target }。
   *[other] 另有 { $count } 个来源音符触发 { $drum }：{ $notes }。全部映射到 { $target }。
}
row-reset = 重置 { $drum }
edit-filter-label = 筛选鼓件
edit-filter-placeholder = 筛选鼓件…
library-filter-placeholder = 筛选…
edit-show = 显示
edit-show-all = 全部 { $count }
edit-show-changed = 已更改 { $count }
edit-show-issues = 问题 { $count }
edit-actions = 编辑操作
edit-changes = { $count ->
    [0] 无更改
   *[other] { $count } 处更改
}
edit-reset-all = 全部重置
edit-done = 完成
row-no-source = 无来源
row-dropped = 已删除
row-chain-hint = { $target } 中没有 { $drum }，改用 { $standIn }。你的修改把 { $standIn } 送到了 { $landed }。点击可跳转到 { $standIn }。
rows-drum = 鼓件
rows-source = 来源
rows-target = 目标
rows-plays = 触发
rows-none = 没有匹配的鼓件
rows-reassigned = { $note } 原为 { $from }，现在触发 { $drum }
preset-tip-title = 以后再用这套映射
preset-tip = 把来源→目标组合和音符修改保存成主界面上的一个按钮，点一下就能重新载入。只保存在当前浏览器中。
preset-update-open = 更新预设
preset-save-open = 保存为预设
preset-name = 预设名称
preset-update = 更新
preset-save-new = 另存为
preset-save = 保存
preset-exists = { $pair } 的预设已存在。
preset-at-cap = 最多只能保存 { $cap } 个预设。
source-unassigned = — 未分配
source-unmapped = 未映射
source-clear = 清除来源音符 { $note }
source-add-label = 添加来源音符
source-add-placeholder = 添加音符 0–127
source-add = 添加
source-add-invalid = 请输入 0 到 127 之间的音符编号
library-group = { $side }鼓音源
library-filter = 筛选{ $side }鼓音源
library-hint = 输入文字即可筛选。方向键移动，Enter 选择，Ctrl+Enter 添加或取消收藏。
library-list = { $side }鼓音源列表
library-favourites = 收藏
library-all = 全部鼓音源
library-none = 无匹配项
files-skipped = 已跳过 { $names }：只能添加 .mid 文件和导出的预设（.json）
files-drop = 将一个或多个 .mid 文件拖放到任意位置
files-choose = 选择文件
files-presets = 导出的预设文件（.json）也可以用同样的方式拖放或选择。
files-remove = 移除 { $name }
files-add-more = + 添加更多
files-clear = 全部清除
chip-rename = 重命名
chip-duplicate = 创建副本
chip-export = 导出
chip-delete = 删除
chip-rename-label = 重命名 { $name }
chip-rename-save = 保存名称
chip-rename-cancel = 取消重命名
chip-overrides = { $count ->
   *[other] { $count } 处修改
}
chip-unavailable = 鼓音源不可用
chip-edit = 编辑 { $name } 的音符
chip-more = { $name } 的更多操作
chip-at-cap = 预设已满
done-tag-converted = { $count ->
   *[other] 已转换 { $count } 个音符
}
done-tag-nothing = 没有转换任何内容
done-tag-approximated = 替换 { $count } 个
done-tag-dropped = 删除 { $count } 个
done-tag-unrecognized = 未识别 { $count } 个
done-tag-untouched = 其他通道 { $count } 个未改动
done-tag-failed = 失败 { $count } 个
done-file-approximated = 替换 { $count }
done-file-dropped = 删除 { $count }
done-file-unrecognized = 未识别 { $count }
done-file-clean = 全部对应
done-heading = { $count ->
   *[other] 已转换 { $count } 个文件
} → { $target }
done-edited = { $count ->
   *[other] 已编辑 { $count } 个鼓件
}
done-download-one = ↓ 下载 .mid
done-download-zip = ↓ 下载 { $count } 个文件（.zip）
done-files = 已转换的文件
done-file-download = ↓ .mid
tip-link = 请我喝杯咖啡
tip-ask = Drumverter 是我一个人利用业余时间做的。如果它帮您省去了手动改音符的麻烦，请我喝杯咖啡吧，这能让它继续免费、无广告。
tip-amounts = 支持作者
tip-other = 其他金额
done-view-report = 查看报告 →
done-convert-more = 继续转换
done-report-mapping = 映射有误？反馈问题
drop-missing = 删除缺少的鼓件并重新转换
report-dropped = 已删除
report-approximated = 已替换
report-unrecognized = 未识别
report-dropped-hint = { $target } 没有这个鼓件
report-approximated-hint = 换成了最接近的鼓件
report-unrecognized-hint = 不在 { $source } 映射表中，已从文件中删除
report-pick-target = 选择目标 →
report-assign = 分配 →
report-across = { $summary }（共 { $count } 个文件）
report-contact = 映射有误或缺少鼓音源？请提交 { $issue } 或发邮件至 { $email }。
report-contact-issue = GitHub Issue
report-unchanged = 未改动
report-unchanged-hint = 其他轨道 / 通道
report-unchanged-entry = 其他轨道或通道上的音符，保持原样
report-channel = 鼓通道 →
report-nothing = 没有转换任何内容
report-nothing-channel = — 所选鼓通道上没有音符。请选择其他鼓通道或“所有通道”。
report-nothing-notes = — 这个文件里没有找到鼓音符。
report-clean = 全部一一对应
report-clean-detail = — 每个鼓件都直接对应到 { $target }。
report-heading = 转换报告
converter-title = Drumverter：免费的鼓 MIDI 重映射与转换工具
maps-popular = 热门转换
maps-pair-link = { $source } 转 { $target }

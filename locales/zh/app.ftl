brand-tagline = 鼓 MIDI 转换与重映射工具
nav-converter = 转换器
nav-note-maps = 音符映射表
section-guide-label = 使用方法
section-guide-heading = 如何转换鼓 MIDI
section-guide-title = 如何在鼓音源之间转换鼓 MIDI | Drumverter
section-guide-description = 只需四步，即可在 GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums 等 80 多款鼓音源之间转换鼓 MIDI。免费，直接在浏览器中完成。
section-faq-label = 常见问题
section-faq-heading = 常见问题
section-faq-title = 鼓 MIDI 转换器常见问题 | Drumverter
section-faq-description = 关于 Drumverter 的常见问题：费用、隐私、八度标记（C-1 还是 C-2）、批量转换，以及目标鼓音源中没有对应鼓件时会怎样。
section-issue-label = 反馈问题
section-issue-heading = 反馈问题
section-issue-title = 反馈问题 | Drumverter
section-issue-description = 发现鼓件映射有误，或希望 Drumverter 支持更多鼓音源？欢迎在 GitHub 上或通过电子邮件反馈。
section-contact-label = 联系方式
section-contact-heading = 联系方式
section-contact-title = 联系方式 | Drumverter
section-contact-description = 对 Drumverter（免费的浏览器端鼓 MIDI 转换器）有疑问、建议或想添加鼓音源？欢迎联系。
section-terms-label = 使用条款
section-terms-heading = 使用条款
section-terms-title = 使用条款 | Drumverter
section-terms-description = Drumverter（免费的浏览器端鼓 MIDI 转换器）使用条款：按“现状”提供，文件绝不上传，仅收集匿名、不使用 Cookie 的统计数据。
skip-to-content = 跳到主要内容
nav-main = 主要
nav-site = 网站
lang-menu-label = 语言
lang-load-failed = 无法加载 { $language }。请检查网络连接后重试。
lang-offer = 本页面有中文版 →
open-converter = 打开转换器 →
error-unknown-engine = 未知的{ $role ->
    [source] 来源
   *[target] 目标
}鼓音源“{ $id }”
error-bad-midi = 不是本转换器可读取的 MIDI 文件
error-bad-preset = 不是预设文件
error-bad-overrides = 无法读取音符修改
error-bad-missing = 未知的缺失鼓件设置
error-bad-channel = 未知的通道设置
error-internal = 出错了
error-wasm-unavailable = 转换器加载失败
error-detail = 详细信息：{ $detail }
blocker-files-and-engines = 请添加 .mid 文件并选择来源和目标鼓音源
blocker-files = 请添加要转换的 .mid 文件
blocker-engines = 请选择来源和目标鼓音源
channel-auto = 自动
channel-all = 所有通道
channel-number = { $channel }
channel-hint-auto = 含通道 10 音符的轨道 · 其余不变
channel-hint-all = 转换所有通道
channel-hint-one = 仅转换通道 { $channel }
missing-nearest = 就近
missing-drop = 丢弃
missing-hint-nearest = 改用最接近的鼓件
missing-hint-drop = 直接去掉
missing-hint-moved = { $count ->
    [0] 没有鼓件改用其他鼓件演奏
   *[other] { $count } 个鼓件改用其他鼓件演奏
}
missing-hint-dropped = { $count ->
    [0] 没有鼓件被丢弃
   *[other] 丢弃 { $count } 个鼓件
}
files-unreadable = 无法读取 { $names }，请重新选择{ $count ->
    [1] 该文件
   *[other] 这些文件
}。
preset-skipped = { $count ->
   *[other] “{ $name }”中有 { $count } 处修改用到了当前版本无法识别的鼓件，已跳过。
}
import-failed = 无法导入 { $file }：{ $error }
import-at-cap = 无法导入 { $file }：预设数量已达上限（{ $cap }）
import-done = 已导入“{ $name }”。
import-done-skipped = 已导入“{ $name }”（跳过了 { $count ->
   *[other] { $count } 处修改
}）。
edit-line = { $drum }：{ $now }（默认 { $byDefault }）
edit-more = 另有 { $count } 项
app-intro = 在 GetGood Drums、EZdrummer、Superior Drummer 3、Addictive Drums 2、General MIDI、Guitar Pro 及其他 80 多款鼓音源的音符布局之间转换鼓 MIDI。完全在浏览器中运行，文件绝不上传。
app-loading = 正在加载转换器…
convert-error = 错误：{ $error }
notice-dismiss = 关闭
channel-label = 鼓通道
channel-tip-title = 转换哪些音符
channel-tip = “自动”会转换所有使用通道 10（General MIDI 的鼓通道）的轨道，其他乐器保持不变。如果鼓不在该通道上，请选择具体通道或“所有通道”。
missing-label = 缺失的鼓件
missing-tip-title = 目标鼓音源缺少某个鼓件时
missing-tip = “就近”会用目标鼓音源中最接近的鼓件来演奏，例如 China 改用 crash，Tom 4 改用 Tom 3。“丢弃”则直接去掉。如果目标鼓音源有这个鼓件，只是缺少鬼音、rimshot 等演奏法，则始终退回为该鼓件的普通敲击。
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
octave-label = 八度起始于
octave-tip-title = 仅影响八度命名
octave-tip = 设置 MIDI 音符 0 所在的八度，使音名与 DAW 中一致。仅影响显示，写入文件的音符不会改变。
canon-picker-label = { $note } 对应的鼓件
canon-picker-heading = 来源 · { $note }
close = 关闭
dropzone-heading = 拖放 .MID
dropzone-presets = 或导出的预设（.drumverter.json）
convert-running = 转换中
convert-button = 转换并下载
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
crash-body = 转换器遇到了无法恢复的错误。刷新页面通常可以解决；如果问题反复出现，可能是某个已保存的预设已损坏。
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
summary-edit-tip = 可将任意鼓件改到其他目标音符，从鼓件列表或琴键上选择即可。修改会应用到本次转换，也可以保存为预设。
summary-edit = 编辑单个音符 →
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
row-dropped = 已丢弃
rows-drum = 鼓件
rows-source = 来源
rows-target = 目标
rows-plays = 触发
rows-none = 没有匹配的鼓件
rows-reassigned = { $note } 原为 { $from }，现在触发 { $drum }
preset-tip-title = 重复使用此映射
preset-tip = 将来源→目标组合及所有音符修改保存为主界面上的一个按钮，点击即可重新加载。仅保存在此浏览器中。
preset-update-open = 更新预设
preset-save-open = 保存为预设
preset-name = 预设名称
preset-update = 更新
preset-save-new = 另存为
preset-save = 保存
preset-exists = { $pair } 的预设已存在。
preset-at-cap = 预设数量已达上限（{ $cap }）。
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
files-skipped = 已跳过 { $names }：只能添加 .mid 文件和导出的预设（.drumverter.json）
files-drop = 将 .mid 拖放到任意位置，或点击选择
files-presets = 导出的预设文件（.drumverter.json）也可以用同样的方式拖放或选择。
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
chip-at-cap = 预设已达上限
done-tag-converted = { $count ->
   *[other] 已转换 { $count } 个音符
}
done-tag-nothing = 未转换任何内容
done-tag-approximated = 近似 { $count } 个
done-tag-dropped = 丢弃 { $count } 个
done-tag-unrecognized = 未识别 { $count } 个
done-tag-untouched = 其他通道 { $count } 个未改动
done-tag-failed = 失败 { $count } 个
done-file-approximated = 近似 { $count }
done-file-dropped = 丢弃 { $count }
done-file-unrecognized = 未识别 { $count }
done-file-clean = 精确
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
done-view-report = 查看报告 →
done-convert-more = 继续转换
drop-missing = 丢弃缺失鼓件并重新转换
report-dropped = 已丢弃
report-approximated = 近似
report-unrecognized = 未识别
report-dropped-hint = { $target } 没有这个鼓件
report-approximated-hint = 改用最接近的鼓件
report-unrecognized-hint = 不在 { $source } 映射表中，已从文件中移除
report-pick-target = 选择目标 →
report-assign = 分配 →
report-across = { $summary }（共 { $count } 个文件）
report-contact = 映射有误或缺少鼓音源？请提交 { $issue } 或发邮件至 { $email }。
report-contact-issue = GitHub Issue
report-unchanged = 未改动
report-unchanged-hint = 其他轨道 / 通道
report-unchanged-entry = 其他轨道或通道上的音符，保持原样
report-channel = 鼓通道 →
report-nothing = 未转换任何内容
report-nothing-channel = — 所选鼓通道上没有音符。请选择其他鼓通道或“所有通道”。
report-nothing-notes = — 此文件中未找到鼓音符。
report-clean = 全部精确映射
report-clean-detail = — 每个鼓件都直接映射到了 { $target }。
report-heading = 转换报告
converter-title = Drumverter：免费的鼓 MIDI 重映射与转换工具
converter-description = 免费的鼓 MIDI 转换器：直接在浏览器中将鼓 MIDI 在 GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums、General MIDI 和 Guitar Pro 之间重新映射。
converter-og-description = 在 GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums 等 80 多款鼓音源之间转换鼓 MIDI。免费，在浏览器中运行。
converter-image-alt = Drumverter：鼓 MIDI 转换与重映射工具
converter-twitter-description = 免费的浏览器端鼓 MIDI 重映射工具，在不同鼓音源的音符布局之间重新映射鼓 MIDI。
converter-app-description = 在不同鼓音源的音符布局之间重新映射鼓 MIDI 的免费浏览器端工具。
converter-noscript = Drumverter 是一款免费的鼓 MIDI 重映射工具。它可以把按某个鼓音源音符布局编写的鼓 MIDI 文件重新映射到另一个鼓音源的布局，例如把 GetGood Drums 重新映射到 EZdrummer、Superior Drummer、Addictive Drums、General MIDI 或 Guitar Pro。映射基于一套统一的标准鼓件表，并为每个位置提供备选方案。整个 MIDI 重映射过程都在浏览器中完成；请启用 JavaScript 以使用转换器。
load-failed = Drumverter 加载失败。请检查网络连接并刷新页面。
load-failed-reload = 刷新
maps-breadcrumb = 面包屑导航
maps-index-title = { $count } 款鼓音源的鼓 MIDI 音符映射表 | Drumverter
maps-index-description = { $count } 款鼓音源的鼓 MIDI 音符映射表，以及 GetGood Drums、EZdrummer、Superior Drummer、Addictive Drums 等鼓音源之间的转换对照表。
maps-index-heading = 鼓 MIDI 音符映射表
maps-index-intro = { $count } 款鼓音源的音符映射表，以及最热门鼓音源之间的转换对照表，与 Drumverter 转换器使用的映射数据完全相同。
maps-popular = 热门转换
maps-more-engines = 更多鼓音源
maps-matrix-corner = 来源 ↓ 目标 →
maps-pair-link = { $source } 转 { $target }
maps-matrix-hint = 点击箭头即可打开从该行鼓音源到该列鼓音源的转换对照表。
maps-all-engines = 全部 { $count } 款鼓音源
maps-filter-engines-label = 筛选鼓音源
maps-filter-engines-placeholder = 筛选鼓音源…
maps-no-engines = 没有匹配的鼓音源
maps-engine-title = { $engineMidi } 音符映射表与鼓件映射 | Drumverter
maps-engine-title-long-name = MIDI 音符映射表：{ $engine } | Drumverter
maps-engine-description = { $engine } 鼓 MIDI 音符映射表：全部 { $total } 个音符及对应鼓件名称，支持 C-1 和 C-2 两种八度标记。
maps-engine-description-short = { $engine } 鼓 MIDI 音符映射表，含 C-1 和 C-2 两种八度标记的音名。
maps-engine-description-more = 免费将 { $engineMidi } 转换为任意鼓音源。
maps-engine-heading = { $engine } 鼓 MIDI 音符映射表
maps-engine-intro = { $engine } 响应的全部 MIDI 音符（共 { $total } 个），按鼓件分组。音名可按任一八度标记显示：C-1（Reaper、Logic、Ableton、Guitar Pro）或 C-2（Studio One、Cubase、FL Studio）。
maps-convert-to = 转换为 { $engine }
maps-convert-from = 从 { $engine } 转换
maps-filter-drums-label = 筛选鼓件
maps-filter-drums-placeholder = 按鼓件或音符筛选…
maps-octave-naming = 八度标记
maps-column-note = 音符
maps-column-drum = 鼓件
maps-conversion-tables = 转换对照表
maps-pair-heading = 将 { $sourceMidi } 转换为 { $target }
maps-pair-title = 将 { $sourceMidi } 转换为 { $target } | Drumverter
maps-pair-description = 将 { $source } 鼓 MIDI 转换为 { $target }：{ $exact } 个音符{ $exact ->
   *[other] 精确映射
}，{ $approximated } 个近似，{ $dropped } 个丢弃。
maps-pair-description-more = 免费的浏览器端转换器。
maps-pair-summary = 在 { $source } 的 { $total } 个音符中，{ $exact } 个{ $exact ->
   *[other] 精确映射
}到 { $target }，{ $approximated } 个{ $approximated ->
   *[other] 以最接近的可用鼓件近似替代
}，{ $dropped } 个{ $dropped ->
   *[other] 没有对应鼓件
}。
maps-pair-convert = 转换 { $source } → { $target }
maps-reverse = ⇄ 反向转换
maps-exact-count = 精确 { $count }
maps-approximated-count = 近似 { $count }
maps-dropped-count = 丢弃 { $count }
maps-rows = 显示
maps-rows-changes = 有变化 { $count }
maps-column-engine-note = { $engine } 音符
maps-column-engine-drum = { $engine } 鼓件
maps-column-to = 到
maps-column-result = 结果
maps-no-equivalent = 无对应
maps-status-exact = 精确
maps-status-approximated = 近似
maps-status-dropped = 丢弃
maps-more-from = { $engine } 的更多转换
maps-full-maps = 完整音符映射表：

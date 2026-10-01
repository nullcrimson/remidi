brand-tagline = 드럼 MIDI 변환·리매핑 도구
nav-converter = 변환기
nav-note-maps = 노트 맵
section-guide-label = 사용 방법
section-guide-heading = 드럼 MIDI 변환 방법
section-guide-title = 드럼 MIDI를 다른 드럼 음원용으로 변환하는 방법 | Drumverter
section-guide-description = GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums 등 80개 이상의 드럼 음원에 맞게 드럼 MIDI를 세 단계로 변환하세요. 무료이고 브라우저에서 바로 됩니다.
section-faq-label = FAQ
section-faq-heading = 자주 묻는 질문
section-faq-title = 드럼 MIDI 변환기 자주 묻는 질문 | Drumverter
section-faq-description = Drumverter에 관한 질문과 답변: 비용, 개인정보, 옥타브 표기(C-1 또는 C-2), 여러 파일 한 번에 변환하기, 대상 음원에 없는 악기는 어떻게 되는지.
section-issue-label = 문제 신고
section-issue-heading = 문제 신고
section-issue-title = 문제 신고 | Drumverter
section-issue-description = 드럼 매핑이 잘못됐거나 Drumverter에 추가됐으면 하는 음원이 있나요? GitHub나 이메일로 알려 주세요.
section-contact-label = 문의
section-contact-heading = 문의
section-contact-title = 문의 | Drumverter
section-contact-description = 브라우저에서 쓰는 무료 드럼 MIDI 변환기 Drumverter에 대한 질문, 의견, 음원 추가 요청을 보내 주세요.
section-terms-label = 약관
section-terms-heading = 이용약관
section-terms-title = 이용약관 | Drumverter
section-terms-description = 브라우저에서 쓰는 무료 드럼 MIDI 변환기 Drumverter의 이용약관: 있는 그대로 제공되며, 파일은 업로드되지 않고, 쿠키 없는 익명 통계만 수집합니다.
skip-to-content = 본문 바로가기
nav-main = 주 메뉴
nav-site = 사이트 메뉴
lang-menu-label = 언어
lang-load-failed = 언어를 불러오지 못했습니다({ $language }). 인터넷 연결을 확인하고 다시 시도하세요.
lang-offer = 이 페이지를 한국어로 볼 수 있습니다 →
open-converter = 변환기 열기 →
error-unknown-engine = 알 수 없는 { $role ->
    [source] 원본
   *[target] 대상
} 음원 '{ $id }'
error-bad-midi = 파일을 읽을 수 없습니다. MIDI 파일이 아닌 것 같습니다
error-bad-preset = 프리셋 파일이 아닙니다
error-bad-overrides = 노트 편집 내용을 읽을 수 없습니다
error-bad-missing = 알 수 없는 '없는 악기' 설정입니다
error-bad-channel = 알 수 없는 채널 설정입니다
error-internal = 문제가 발생했습니다
error-wasm-unavailable = 변환기를 불러오지 못했습니다
error-detail = 세부 정보: { $detail }
blocker-files-and-engines = .mid 파일을 추가하고 음원을 둘 다 선택하세요
blocker-files = 먼저 .mid 파일을 추가하세요
blocker-engines = 원본 음원과 대상 음원을 선택하세요
channel-auto = 자동
channel-all = 모든 채널
channel-number = { $channel }
channel-hint-auto = 채널 10 노트가 있는 트랙 · 나머지는 그대로
channel-hint-all = 모든 채널 변환
channel-hint-one = 채널 { $channel }만 변환
missing-nearest = 대체
missing-drop = 제외
missing-hint-nearest = 가장 비슷한 악기로 대체
missing-hint-drop = 파일에서 제외
missing-hint-moved = { $count ->
    [0] 대체되는 악기 없음
   *[other] 악기 { $count }개 대체
}
missing-hint-dropped = { $count ->
    [0] 제외되는 악기 없음
   *[other] 악기 { $count }개 제외
}
files-unreadable = { $count ->
   *[other] 파일 { $count }개를 읽을 수 없습니다: { $names }. 다시 선택하세요.
}
preset-skipped = { $count ->
   *[other] '{ $name }'의 편집 { $count }개는 이 버전에 없는 악기가 들어 있어 건너뛰었습니다.
}
import-failed = { $file } 파일을 가져오지 못했습니다: { $error }
import-at-cap = { $file } 파일을 가져오지 못했습니다: 프리셋은 최대 { $cap }개까지입니다
import-done = '{ $name }' 프리셋을 가져왔습니다.
import-done-skipped = '{ $name }' 프리셋을 가져왔습니다(편집 { $count ->
   *[other] { $count }개
} 건너뜀).
edit-line = { $drum }: { $now } (기본값 { $byDefault })
edit-more = +{ $count }개 더
app-intro = GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro 등 80개 이상의 드럼 음원에 맞게 드럼 MIDI의 노트 배치를 바꿔 줍니다. 브라우저에서 바로 실행되고, 파일은 업로드되지 않습니다.
app-loading = 변환기 불러오는 중…
convert-error = 오류: { $error }
notice-dismiss = 닫기
channel-label = 드럼 채널
channel-tip-title = 어떤 노트가 변환되나요
channel-tip = '자동'은 General MIDI 드럼 채널인 채널 10을 쓰는 트랙을 모두 변환하고, 다른 악기는 건드리지 않습니다. 드럼이 다른 채널에 있다면 그 채널이나 '모든 채널'을 선택하세요.
missing-label = 없는 악기
missing-tip-title = 대상 음원에 없는 악기가 있을 때
missing-tip = '대체'는 대상 음원에 있는 가장 비슷한 악기로 연주합니다(예: China는 crash로, Tom 4는 Tom 3으로). '제외'는 그 악기의 노트를 파일에서 뺍니다. 고스트 노트, 림샷처럼 대상 음원에 있는 악기를 다른 주법으로 친 노트는 항상 그 악기의 기본 타격으로 바뀝니다.
edited-review = { $count ->
   *[other] 악기 { $count }개
} 편집됨 — 변경 사항 확인
edited-review-saved = { $count ->
   *[other] 악기 { $count }개
} 편집됨 — 변경 사항 확인 (프리셋: { $name })
edited-review-unsaved = { $count ->
   *[other] 악기 { $count }개
} 편집됨 — 변경 사항 확인 ({ $name }에 저장 안 됨)
edited-differ = { $count ->
   *[other] 악기 { $count }개가
} 기본 매핑과 다릅니다
edited-click = 클릭해서 확인하거나 초기화하세요.
edited-count = { $count }개 편집
edited-count-unsaved = { $count }개 편집 · 저장 안 됨
octave-label = 옥타브 표기
octave-tip-title = 표시만 바뀝니다
octave-tip = 노트 이름이 사용하는 DAW와 같아지도록 MIDI 노트 0의 옥타브를 정합니다. 화면 표시만 바뀌고, 파일에 기록되는 노트는 그대로입니다.
canon-picker-label = { $note }에 지정할 악기
canon-picker-heading = 원본 · { $note }
close = 닫기
dropzone-heading = .MID 놓기
dropzone-presets = 또는 내보낸 프리셋(.json)
convert-running = 변환 중
convert-button = 변환하기
engine-from = 원본
engine-to = 대상
engine-swap = 원본과 대상 바꾸기
filter-clear = 검색어 지우기
note-picker-label = { $drum }의 대상 노트
note-picker-heading = 대상 · { $drum }
source-picker-label = { $drum }의 원본 노트
source-picker-heading = 입력 · { $drum }
mid-badge = MID
plan-error = 노트 편집기를 불러오지 못했습니다: { $error }
plan-error-reset = 편집 초기화
crash-heading = 문제가 발생했습니다
crash-body = 변환기에 오류가 생겨 더 이상 진행할 수 없습니다. 대개 새로고침하면 해결됩니다. 계속 이런다면 저장된 프리셋이 손상되었을 수 있습니다.
crash-reload = 새로고침
crash-reset = 저장된 데이터 초기화…
crash-reset-confirm = 저장된 프리셋, 즐겨찾기, 설정을 삭제할까요?
crash-reset-do = 삭제 후 새로고침
cancel = 취소
saved-group = 저장된 매핑
saved-heading = 저장됨
edit-back = ← 뒤로
edit-heading = 노트 편집
edit-advanced = 고급 — 원본 노트 다시 지정
summary-remapped = { $total ->
   *[other] 악기 { $total }개 중 { $remapped }개 리매핑됨
}
summary-edit-tip-title = 악기별 세부 조정
summary-edit-tip = 어떤 악기든 다른 대상 노트로 바꿀 수 있습니다. 악기 목록이나 피아노에서 고르세요. 바꾼 내용은 변환에 적용되고, 프리셋으로 저장할 수도 있습니다.
summary-edit = 노트 개별 편집 →
missing-detail-moved = 다른 악기로 대체
missing-detail-dropped = 파일에서 제외
detail-edit = 노트 편집에서 변경 →
summary-detail-heading = { $total ->
   *[other] 이 매핑의 악기 { $total }개
}
summary-detail-moved = 새 노트로 이동
summary-detail-same = 이미 맞는 노트
summary-detail-variant = 비슷한 변형으로 연주
summary-detail-swapped = 다른 악기로 대체
summary-detail-dropped = 제외
summary-detail-unplayed = 원본 음원에 없음
summary-reason-same = 두 음원에서 같은 노트
summary-reason-variant = { $target }에 정확히 같은 악기가 없어 같은 악기의 변형으로 연주
summary-reason-swapped = { $target }에 해당 악기가 없어 가장 비슷한 악기로 연주
summary-reason-dropped = { $target }에 해당 악기 없음
summary-reason-unplayed = { $source }에 노트 없음
row-extras-dropped = { $count ->
   *[other] { $drum } 소리를 내는 원본 노트가 { $count }개 더 있습니다: { $notes }. 모두 대상 노트가 없습니다.
}
row-extras = { $count ->
   *[other] { $drum } 소리를 내는 원본 노트가 { $count }개 더 있습니다: { $notes }. 모두 { $target }에 연결됩니다.
}
row-reset = { $drum } 초기화
edit-filter-label = 악기 검색
edit-filter-placeholder = 악기 검색…
library-filter-placeholder = 검색…
edit-show = 표시
edit-show-all = 전체 { $count }
edit-show-changed = 변경됨 { $count }
edit-show-issues = 문제 { $count }
edit-actions = 편집 메뉴
edit-changes = { $count ->
    [0] 변경 사항 없음
   *[other] 변경 { $count }개
}
edit-reset-all = 모두 초기화
edit-done = 완료
row-no-source = 원본 없음
row-dropped = 제외됨
rows-drum = 악기
rows-source = 원본
rows-target = 대상
rows-plays = 연주
rows-none = 일치하는 악기 없음
rows-reassigned = { $note } 노트: 원래 { $from } — 이제 { $drum } 연주
preset-tip-title = 이 매핑 다시 쓰기
preset-tip = 원본→대상 조합과 노트 변경 사항을 메인 화면에 버튼으로 저장합니다. 한 번 클릭하면 다시 불러옵니다. 이 브라우저에만 저장됩니다.
preset-update-open = 프리셋 업데이트
preset-save-open = 프리셋으로 저장
preset-name = 프리셋 이름
preset-update = 업데이트
preset-save-new = 새로 저장
preset-save = 저장
preset-exists = { $pair } 조합의 프리셋이 이미 있습니다.
preset-at-cap = 프리셋은 최대 { $cap }개까지 저장할 수 있습니다.
source-unassigned = — 지정 안 됨
source-unmapped = 매핑 안 됨
source-clear = 원본 노트 { $note } 제거
source-add-label = 원본 노트 추가
source-add-placeholder = 노트 추가 0–127
source-add = 추가
source-add-invalid = 0부터 127 사이의 노트 번호를 입력하세요
library-group = { $side } 음원
library-filter = { $side } 음원 검색
library-hint = 입력하면 검색됩니다. 화살표 키로 이동, Enter로 선택, Ctrl+Enter로 즐겨찾기에 추가하거나 뺄 수 있습니다.
library-list = { $side } 음원 목록
library-favourites = 즐겨찾기
library-all = 전체 음원
library-none = 검색 결과 없음
files-skipped = { $names } 건너뜀 — .mid 파일과 내보낸 프리셋(.json)만 추가할 수 있습니다
files-drop = .mid 파일(여러 개 가능)을 아무 곳에나 끌어다 놓으세요
files-choose = 파일 선택
files-presets = 내보낸 프리셋 파일(.json)도 같은 방법으로 끌어다 놓거나 선택할 수 있습니다.
files-remove = { $name } 제거
files-add-more = + 더 추가
files-clear = 모두 제거
chip-rename = 이름 변경
chip-duplicate = 복제
chip-export = 내보내기
chip-delete = 삭제
chip-rename-label = { $name } 이름 변경
chip-rename-save = 이름 저장
chip-rename-cancel = 이름 변경 취소
chip-overrides = { $count ->
   *[other] { $count }개 변경
}
chip-unavailable = 음원 사용 불가
chip-edit = { $name } 노트 편집
chip-more = { $name } 더보기
chip-at-cap = 프리셋을 더 만들 수 없음
done-tag-converted = { $count ->
   *[other] 노트 { $count }개 변환됨
}
done-tag-nothing = 변환된 노트 없음
done-tag-approximated = { $count }개 대체됨
done-tag-dropped = { $count }개 제외됨
done-tag-unrecognized = { $count }개 인식 안 됨
done-tag-untouched = 다른 채널의 { $count }개는 그대로
done-tag-failed = { $count }개 실패
done-file-approximated = 대체 { $count }
done-file-dropped = 제외 { $count }
done-file-unrecognized = 미인식 { $count }
done-file-clean = 문제 없음
done-heading = { $count ->
   *[other] 파일 { $count }개
} 변환됨 → { $target }
done-edited = { $count ->
   *[other] 악기 { $count }개
} 편집됨
done-download-one = ↓ .mid 다운로드
done-download-zip = ↓ 파일 { $count }개 다운로드(.zip)
done-files = 변환된 파일
done-file-download = ↓ .mid
tip-link = 커피 한 잔 후원하기
tip-ask = Drumverter는 제가 혼자 여가 시간에 만들고 있습니다. 리매핑하는 수고를 덜었다면 커피 한 잔으로 응원해 주세요. 계속 무료로, 광고 없이 운영하는 데 큰 힘이 됩니다.
tip-amounts = 개발자 후원하기
tip-other = 다른 금액
thanks-title = 감사합니다 | Drumverter
thanks-description = 무료 드럼 MIDI 변환기 Drumverter를 후원해 주셔서 감사합니다.
thanks-heading = 감사합니다!
thanks-body = 보내 주신 커피 덕분에 Drumverter를 계속 무료로, 광고 없이 운영할 수 있습니다. 영수증은 Stripe에서 이메일로 보내 드립니다.
done-view-report = 보고서 보기 →
done-convert-more = 다른 파일 변환
done-report-mapping = 매핑이 잘못됐나요? 알려 주세요
drop-missing = 없는 악기를 빼고 다시 변환
report-dropped = 제외됨
report-approximated = 대체됨
report-unrecognized = 인식 안 됨
report-dropped-hint = { $target }에 이 악기가 없음
report-approximated-hint = 가장 비슷한 악기로 연주됨
report-unrecognized-hint = { $source } 노트 맵에 없음 — 파일에서 제거됨
report-pick-target = 대상 선택 →
report-assign = 지정 →
report-across = 파일 { $count }개 합계: { $summary }
report-contact = 매핑이 잘못됐거나 원하는 음원이 없나요? { $issue }를 등록하거나 { $email } 주소로 이메일을 보내 주세요.
report-contact-issue = GitHub 이슈
report-unchanged = 변경 없음
report-unchanged-hint = 다른 트랙 / 채널
report-unchanged-entry = 다른 트랙이나 채널의 노트는 그대로 둠
report-channel = 드럼 채널 →
report-nothing = 변환된 노트가 없습니다
report-nothing-channel = — 선택한 드럼 채널에 노트가 없습니다. 다른 드럼 채널이나 '모든 채널'을 선택하세요.
report-nothing-notes = — 이 파일에서 드럼 노트를 찾지 못했습니다.
report-clean = 문제없이 변환됨
report-clean-detail = — 모든 악기가 { $target }에 그대로 매핑되었습니다.
report-heading = 변환 보고서
converter-title = Drumverter — 무료 드럼 MIDI 변환·리매핑 도구
converter-description = 무료 드럼 MIDI 변환기: GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI, Guitar Pro 사이에서 드럼 MIDI를 브라우저로 바로 리매핑하세요.
converter-og-description = GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums 등 80개 이상의 드럼 음원에 맞게 드럼 MIDI를 변환하세요. 무료이고 브라우저에서 바로 됩니다.
converter-image-alt = Drumverter — 드럼 MIDI 변환·리매핑 도구
converter-twitter-description = 브라우저에서 쓰는 무료 드럼 MIDI 리매핑 도구 — 드럼 음원마다 다른 노트 배치에 맞게 드럼 MIDI를 리매핑합니다.
converter-app-description = 드럼 음원마다 다른 노트 배치에 맞게 드럼 MIDI를 리매핑하는 무료 브라우저 도구.
converter-noscript = Drumverter는 무료 드럼 MIDI 리매핑 도구입니다. 한 드럼 음원의 노트 배치로 만든 드럼 MIDI 파일을 다른 음원의 노트 배치에 맞게 바꿔 줍니다. 예를 들어 GetGood Drums용 MIDI를 EZdrummer, Superior Drummer, Addictive Drums, General MIDI, Guitar Pro용으로 바꿀 수 있습니다. 악기마다 대신 쓸 악기의 순서가 정해져 있어서, 대상 음원에 없는 악기는 가장 비슷한 악기로 연주됩니다. 모든 작업은 브라우저 안에서 이루어집니다. 변환기를 사용하려면 JavaScript를 켜 주세요.
load-failed = Drumverter를 불러오지 못했습니다. 인터넷 연결을 확인하고 페이지를 새로고침하세요.
load-failed-reload = 새로고침
maps-breadcrumb = 이동 경로
maps-index-title = 드럼 음원 { $count }개의 드럼 MIDI 노트 맵 | Drumverter
maps-index-description = 드럼 음원 { $count }개의 드럼 MIDI 노트 맵, 그리고 GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums 등 음원 사이의 변환표.
maps-index-heading = 드럼 MIDI 노트 맵
maps-index-intro = 드럼 음원 { $count }개의 노트 맵과 인기 음원 사이의 변환표입니다. Drumverter 변환기와 같은 매핑 데이터를 씁니다.
maps-popular = 인기 변환
maps-more-engines = 기타 음원
maps-matrix-corner = 원본 ↓ 대상 →
maps-pair-link = { $source } → { $target } 변환표
maps-matrix-hint = 화살표를 누르면 행의 음원에서 열의 음원으로 변환하는 표가 열립니다.
maps-all-engines = 전체 음원 { $count }개
maps-filter-engines-label = 음원 검색
maps-filter-engines-placeholder = 음원 검색…
maps-no-engines = 일치하는 음원 없음
maps-engine-title = { $engineMidi } 노트 맵 및 드럼 매핑 | Drumverter
maps-engine-title-long-name = MIDI 노트 맵: { $engine } | Drumverter
maps-engine-description = { $engine } 드럼 MIDI 노트 맵: 노트 { $total }개 전체와 악기 이름을 C-1, C-2 옥타브 표기로 보여 줍니다.
maps-engine-description-short = C-1, C-2 노트 이름으로 보는 { $engine } 드럼 MIDI 노트 맵.
maps-engine-description-more = { $engineMidi }를 다른 음원용으로 무료 변환하세요.
maps-engine-heading = { $engine } 드럼 MIDI 노트 맵
maps-engine-intro = { $engine }에서 소리가 나는 모든 MIDI 노트(총 { $total }개)를 악기별로 정리했습니다. 노트 이름은 C-1 방식(Reaper, Logic, Ableton, Guitar Pro)과 C-2 방식(Studio One, Cubase, FL Studio) 중 원하는 옥타브 표기로 볼 수 있습니다.
maps-convert-to = { $engine }용으로 변환
maps-convert-from = { $engine }에서 변환
maps-filter-drums-label = 악기 검색
maps-filter-drums-placeholder = 악기 또는 노트 검색…
maps-octave-naming = 옥타브 표기
maps-column-note = 노트
maps-column-drum = 악기
maps-conversion-tables = 변환표
maps-pair-heading = { $sourceMidi }를 { $target }용으로 변환
maps-pair-title = { $sourceMidi }를 { $target }용으로 변환 | Drumverter
maps-pair-description = { $source } 드럼 MIDI를 { $target }용으로 변환: 정확히 일치 { $exact ->
   *[other] { $exact }개
}, 대체 { $approximated }개, 제외 { $dropped }개.
maps-pair-description-more = 무료 브라우저 변환기.
maps-pair-summary = { $source } 노트 { $total }개 중 { $exact ->
   *[other] { $exact }개는
} { $target }에 정확히 매핑되고, { $approximated ->
   *[other] { $approximated }개는
} 가장 비슷한 악기로 대체되며, { $dropped ->
   *[other] { $dropped }개는
} 대응하는 악기가 없습니다.
maps-pair-convert = { $source } → { $target } 변환
maps-reverse = ⇄ 방향 바꾸기
maps-exact-count = 일치 { $count }
maps-approximated-count = 대체 { $count }
maps-dropped-count = 제외 { $count }
maps-rows = 표시할 행
maps-rows-changes = 변경 { $count }
maps-column-engine-note = { $engine } 노트
maps-column-engine-drum = { $engine } 악기
maps-column-to = 변환
maps-column-result = 결과
maps-no-equivalent = 대응 악기 없음
maps-status-exact = 일치
maps-status-approximated = 대체
maps-status-dropped = 제외
maps-more-from = { $engine }에서 다른 음원으로
maps-full-maps = 전체 노트 맵:

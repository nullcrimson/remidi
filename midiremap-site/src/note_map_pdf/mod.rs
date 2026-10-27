mod face;
mod layout;

use krilla::{
    action::{Action, LinkAction},
    annotation::{Annotation, LinkAnnotation, Target},
    color::rgb,
    error::KrillaError,
    geom::{Path, PathBuilder, Point, Rect, Size, Transform},
    image::Image,
    metadata::Metadata,
    num::NormalizedF32,
    page::PageSettings,
    paint::{Fill, FillRule},
    surface::Surface,
    Data, Document,
};

use self::{
    face::{Face, Faces},
    layout::{columns, lines, Line},
};
use crate::{
    pages::{EngineLink, EngineRow, FamilyGroup, NoteCell, NoteRole, Site},
    routes::{SitePath, DOMAIN, SITE_NAME},
};

static MARK: &[u8] = include_bytes!("../../../app/public/icon-512.png");

/// How a run of the reading guide is set.
#[derive(Clone, Copy)]
enum Weight {
    Regular,
    Strong,
}

type GuideLine = &'static [(Weight, &'static str)];

const GUIDE: &[GuideLine] = &[
    &[(
        Weight::Regular,
        "Every DAW uses the same note numbers. Only the note names differ, because DAWs count octaves differently.",
    )],
    &[
        (Weight::Strong, "Reaper:"),
        (Weight::Regular, " use the "),
        (Weight::Strong, "C-1"),
        (Weight::Regular, " column."),
    ],
    &[
        (Weight::Strong, "Ableton Live, Logic Pro, Cubase, Studio One:"),
        (Weight::Regular, " use the "),
        (Weight::Strong, "C-2"),
        (Weight::Regular, " column."),
    ],
    &[
        (Weight::Strong, "FL Studio:"),
        (
            Weight::Regular,
            " neither column matches, so find the note by its number.",
        ),
    ],
];

const EXTRA_GUIDE: GuideLine = &[
    (Weight::Strong, "Grey rows"),
    (
        Weight::Regular,
        " are extra notes for a drum that's already listed. They play the same drum.",
    ),
];

const INK: u32 = 0x16_15_1a;
const SUBTLE: u32 = 0x46_44_4b;
const MUTED: u32 = 0x5c_5a_60;
const DIM: u32 = 0x76_76_76;
const HAIRLINE: u32 = 0xe6_e4_e0;
const RULE: u32 = 0xd6_d3_ce;
const ACCENT: u32 = 0xc9_a4_3b;

const PAGE_W: f32 = 595.28;
const PAGE_H: f32 = 841.89;
const MARGIN_X: f32 = 45.0;
const MARGIN_TOP: f32 = 42.0;
const MARGIN_BOTTOM: f32 = 33.0;
const CONTENT_W: f32 = PAGE_W - 2.0 * MARGIN_X;
const COLUMN_GAP: f32 = 30.0;
const COLUMN_W: f32 = (CONTENT_W - COLUMN_GAP) / 2.0;
const MARK_SIZE: f32 = 22.5;
const TITLE_SIZE: f32 = 30.0;
const SUBLINE_SIZE: f32 = 9.0;
const SUBLINE_LEADING: f32 = 13.5;
const TABLE_HEADER_H: f32 = 15.0;
const LINE_H: f32 = 14.25;
const ROW_SIZE: f32 = 9.0;
const NAME_SIZE: f32 = 8.25;
const CAPS_SIZE: f32 = 6.75;
const NOTE_SIZE: f32 = 7.1;
const NOTE_LEADING: f32 = 11.0;
const FOOTER_RULE_Y: f32 = PAGE_H - MARGIN_BOTTOM - 20.0;
const NUMBER_W: f32 = 25.5;
const NAME_W: f32 = 33.0;
const CELL_GAP: f32 = 7.5;

/// A note map PDF the site could not write.
#[derive(Debug, thiserror::Error)]
#[error("cannot write the note map PDF of {engine}: {reason}")]
pub struct NoteMapError {
    engine: String,
    reason: String,
}

/// Every engine page's note map PDF, by address, in the order of the engine pages.
pub fn note_map_files(site: &Site) -> Result<Vec<(SitePath, Vec<u8>)>, NoteMapError> {
    let engines = site.index.all.len();
    site.engines
        .iter()
        .map(|page| {
            note_map_pdf(&page.engine, &page.groups, engines)
                .map(|pdf| (page.engine.note_map().href, pdf))
                .map_err(|e| NoteMapError {
                    engine: page.engine.id.clone(),
                    reason: e.to_string(),
                })
        })
        .collect()
}

/// The engine's note map as a PDF: its notes by family on A4 pages, closed by a note on the
/// octave conventions and a footer naming the site; `engines` is how many engines the site
/// covers.
pub fn note_map_pdf(
    engine: &EngineLink,
    groups: &[FamilyGroup<EngineRow>],
    engines: usize,
) -> Result<Vec<u8>, KrillaError> {
    let faces = Faces::load();
    let total: usize = groups.iter().map(|g| g.rows.len()).sum();
    let has_extra = groups
        .iter()
        .flat_map(|g| &g.rows)
        .any(|r| r.role == NoteRole::Extra);
    let guide = guide(has_extra);
    let title_size = fit(
        &faces.display_bold,
        &engine.name,
        TITLE_SIZE,
        0.0,
        CONTENT_W,
    );
    let subline = wrap(
        &format!(
            "{total} notes, grouped by drum. Each note with its number and its name in both \
             octave conventions."
        ),
        &faces.sans,
        SUBLINE_SIZE,
        CONTENT_W,
    );
    let title_baseline = MARGIN_TOP + MARK_SIZE + 30.0 + title_size * 0.8;
    let rule_y = title_baseline + 12.0 + SUBLINE_LEADING * len_f32(subline.len());
    let first_top = rule_y + 2.25 + 21.0;
    let later_top = MARGIN_TOP + MARK_SIZE + 24.0;
    let note_h = NOTE_LEADING * len_f32(guide.len() + 1);
    let table_bottom = FOOTER_RULE_Y - 12.0 - note_h - 10.0;
    let capacity = |top: f32| {
        let lines = ((table_bottom - top - TABLE_HEADER_H) / LINE_H).floor();
        format!("{lines:.0}").parse().unwrap_or(1)
    };
    let all = lines(groups);
    let pages = columns(
        &all,
        capacity(first_top),
        capacity(later_top),
        Line::is_heading,
    );

    let mut document = Document::new();
    document.set_metadata(
        Metadata::new()
            .title(format!("{} MIDI note map", engine.name))
            .authors(vec![SITE_NAME.to_owned()])
            .creator(SITE_NAME.to_owned())
            .language("en".to_owned()),
    );
    let size = Size::from_wh(PAGE_W, PAGE_H).expect("A4 is a size");
    let mark = Image::from_png(Data::from(MARK), true).expect("the bundled mark is a PNG");
    let href = engine.href().to_string();
    let address = format!("{DOMAIN}{}", href.trim_end_matches('/'));
    let url = format!("https://{DOMAIN}{href}");
    for (index, page_columns) in pages.iter().enumerate() {
        let mut page = document.start_page_with(PageSettings::new(size));
        let link = {
            let mut surface = page.surface();
            let label = if pages.len() > 1 {
                format!("MIDI note map · {}/{}", index + 1, pages.len())
            } else {
                "MIDI note map".to_owned()
            };
            header(&mut surface, &faces, &mark, &label.to_uppercase(), size);
            let top = if index == 0 {
                text(
                    &mut surface,
                    &faces.display_bold,
                    title_size,
                    -0.02,
                    INK,
                    MARGIN_X,
                    title_baseline,
                    &engine.name,
                );
                for (k, line) in subline.iter().enumerate() {
                    text(
                        &mut surface,
                        &faces.sans,
                        SUBLINE_SIZE,
                        0.0,
                        SUBTLE,
                        MARGIN_X,
                        title_baseline + 19.0 + SUBLINE_LEADING * len_f32(k),
                        line,
                    );
                }
                rect(&mut surface, ACCENT, MARGIN_X, rule_y, 36.0, 2.25);
                first_top
            } else {
                later_top
            };
            let alone = fills_one_column(&pages);
            for (side, column) in page_columns
                .iter()
                .enumerate()
                .filter(|(_, c)| !c.is_empty())
            {
                table(&mut surface, &faces, column_left(side, alone), top, column);
            }
            if index + 1 == pages.len() {
                reading_guide(&mut surface, &faces, FOOTER_RULE_Y - 12.0 - note_h, &guide);
            }
            let link = footer(&mut surface, &faces, &address, engines);
            surface.finish();
            link
        };
        if let Some(rect) = link {
            page.add_annotation(Annotation::new_link(
                LinkAnnotation::new(
                    rect,
                    Target::Action(Action::Link(LinkAction::new(url.clone()))),
                ),
                Some(address.clone()),
            ));
        }
        page.finish();
    }
    document.finish()
}

fn len_f32(n: usize) -> f32 {
    u16::try_from(n).map_or(f32::MAX, f32::from)
}

fn fill(color: u32) -> Fill {
    let [_, r, g, b] = color.to_be_bytes();
    Fill {
        paint: rgb::Color::new(r, g, b).into(),
        opacity: NormalizedF32::ONE,
        rule: FillRule::NonZero,
    }
}

#[allow(clippy::too_many_arguments)]
fn text(
    surface: &mut Surface,
    face: &Face,
    size: f32,
    tracking: f32,
    color: u32,
    x: f32,
    baseline: f32,
    line: &str,
) {
    surface.set_fill(Some(fill(color)));
    surface.draw_glyphs(
        Point::from_xy(x, baseline),
        &face.glyphs(line, tracking),
        face.font(),
        line,
        size,
        false,
    );
}

#[allow(clippy::too_many_arguments)]
fn text_right(
    surface: &mut Surface,
    face: &Face,
    size: f32,
    tracking: f32,
    color: u32,
    right: f32,
    baseline: f32,
    line: &str,
) {
    let x = right - face.width(line, size, tracking) + tracking * size;
    text(surface, face, size, tracking, color, x, baseline, line);
}

/// The size, at most `size`, at which `line` sets within `width`.
fn fit(face: &Face, line: &str, size: f32, tracking: f32, width: f32) -> f32 {
    let natural = face.width(line, size, tracking);
    if natural > width {
        size * width / natural
    } else {
        size
    }
}

/// `paragraph` broken into lines that set within `width`.
fn wrap(paragraph: &str, face: &Face, size: f32, width: f32) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    for word in paragraph.split(' ') {
        match lines.last_mut() {
            Some(line) if face.width(&format!("{line} {word}"), size, 0.0) <= width => {
                line.push(' ');
                line.push_str(word);
            }
            _ => lines.push(word.to_owned()),
        }
    }
    lines
}

fn draw(surface: &mut Surface, color: u32, path: Option<Path>) {
    if let Some(path) = path {
        surface.set_fill(Some(fill(color)));
        surface.draw_path(&path);
    }
}

fn rect(surface: &mut Surface, color: u32, x: f32, y: f32, w: f32, h: f32) {
    let mut builder = PathBuilder::new();
    if let Some(r) = Rect::from_xywh(x, y, w, h) {
        builder.push_rect(r);
    }
    draw(surface, color, builder.finish());
}

fn dot(surface: &mut Surface, color: u32, cx: f32, cy: f32, r: f32) {
    const K: f32 = 0.552_284_8;
    let k = K * r;
    let mut b = PathBuilder::new();
    b.move_to(cx + r, cy);
    b.cubic_to(cx + r, cy + k, cx + k, cy + r, cx, cy + r);
    b.cubic_to(cx - k, cy + r, cx - r, cy + k, cx - r, cy);
    b.cubic_to(cx - r, cy - k, cx - k, cy - r, cx, cy - r);
    b.cubic_to(cx + k, cy - r, cx + r, cy - k, cx + r, cy);
    b.close();
    draw(surface, color, b.finish());
}

fn header(surface: &mut Surface, faces: &Faces, mark: &Image, label: &str, page: Size) {
    if let Some(mark_size) = Size::from_wh(MARK_SIZE, MARK_SIZE) {
        surface.push_transform(&Transform::from_translate(MARGIN_X, MARGIN_TOP));
        surface.draw_image(mark.clone(), mark_size);
        surface.pop();
    }
    let baseline = MARGIN_TOP + 15.5;
    text(
        surface,
        &faces.display_semibold,
        11.25,
        0.01,
        INK,
        MARGIN_X + MARK_SIZE + 7.5,
        baseline,
        SITE_NAME,
    );
    text_right(
        surface,
        &faces.mono,
        8.25,
        0.12,
        MUTED,
        page.width() - MARGIN_X,
        baseline - 1.0,
        label,
    );
}

fn table(surface: &mut Surface, faces: &Faces, x: f32, top: f32, column: &[Line<'_>]) {
    let number_right = x + NUMBER_W;
    let drum_x = number_right + CELL_GAP;
    let c2_right = x + COLUMN_W;
    let c1_right = c2_right - NAME_W - CELL_GAP;
    let drum_w = c1_right - NAME_W - CELL_GAP - drum_x;
    let caps = |surface: &mut Surface, right: Option<f32>, left: f32, label: &str| {
        let baseline = top + 8.0;
        match right {
            Some(right) => text_right(
                surface,
                &faces.mono,
                CAPS_SIZE,
                0.1,
                MUTED,
                right,
                baseline,
                label,
            ),
            None => text(
                surface,
                &faces.mono,
                CAPS_SIZE,
                0.1,
                MUTED,
                left,
                baseline,
                label,
            ),
        }
    };
    caps(surface, Some(number_right), 0.0, "NO.");
    caps(surface, None, drum_x, "DRUM");
    caps(surface, Some(c1_right), 0.0, "C-1");
    caps(surface, Some(c2_right), 0.0, "C-2");
    rect(surface, INK, x, top + 12.0, COLUMN_W, 0.75);
    for (k, line) in column.iter().enumerate() {
        let y = top + TABLE_HEADER_H + LINE_H * len_f32(k);
        match line {
            Line::Family(family) => {
                let baseline = y + 11.5;
                dot(surface, ACCENT, x + 2.25, baseline - 3.0, 2.25);
                text(
                    surface,
                    &faces.display_semibold,
                    8.25,
                    0.06,
                    INK,
                    x + 9.0,
                    baseline,
                    &family.label().to_uppercase(),
                );
            }
            Line::Row(row) => {
                let baseline = y + 10.0;
                let (ink, names) = match row.role {
                    NoteRole::Main => (INK, SUBTLE),
                    NoteRole::Extra => (DIM, DIM),
                };
                let cell = &row.cell;
                text_right(
                    surface,
                    &faces.mono_medium,
                    ROW_SIZE,
                    0.0,
                    ink,
                    number_right,
                    baseline,
                    &cell.note.to_string(),
                );
                let label = cell.entry.label();
                let size = fit(&faces.sans, label, ROW_SIZE, 0.0, drum_w);
                text(
                    surface,
                    &faces.sans,
                    size,
                    0.0,
                    ink,
                    drum_x,
                    baseline,
                    label,
                );
                text_right(
                    surface,
                    &faces.mono,
                    NAME_SIZE,
                    0.0,
                    names,
                    c1_right,
                    baseline,
                    &cell.name_c1(),
                );
                text_right(
                    surface,
                    &faces.mono,
                    NAME_SIZE,
                    0.0,
                    names,
                    c2_right,
                    baseline,
                    &cell.name_c2(),
                );
                rect(surface, HAIRLINE, x, y + LINE_H - 0.75, COLUMN_W, 0.75);
            }
        }
    }
}

/// The lines of the reading guide; the grey-row line only when the map has extra rows.
fn guide(has_extra: bool) -> Vec<GuideLine> {
    let mut lines = GUIDE.to_vec();
    if has_extra {
        lines.push(EXTRA_GUIDE);
    }
    lines
}

/// Whether the whole map fits in one column of one page.
fn fills_one_column<T>(pages: &[[Vec<T>; 2]]) -> bool {
    matches!(pages, [[_, right]] if right.is_empty())
}

/// Where a table column starts; a map whose notes fill one column sits in the page's middle.
fn column_left(side: usize, alone: bool) -> f32 {
    if alone {
        (PAGE_W - COLUMN_W) / 2.0
    } else {
        MARGIN_X + len_f32(side) * (COLUMN_W + COLUMN_GAP)
    }
}

fn face(faces: &Faces, weight: Weight) -> &Face {
    match weight {
        Weight::Regular => &faces.sans,
        Weight::Strong => &faces.sans_semibold,
    }
}

fn reading_guide(surface: &mut Surface, faces: &Faces, top: f32, guide: &[GuideLine]) {
    text(
        surface,
        &faces.mono,
        CAPS_SIZE,
        0.1,
        DIM,
        MARGIN_X,
        top + 7.0,
        "HOW TO READ THIS MAP",
    );
    for (k, line) in guide.iter().enumerate() {
        let baseline = top + 7.0 + NOTE_LEADING * len_f32(k + 1);
        let mut x = MARGIN_X;
        for &(weight, run) in *line {
            let face = face(faces, weight);
            text(surface, face, NOTE_SIZE, 0.0, DIM, x, baseline, run);
            x += face.width(run, NOTE_SIZE, 0.0);
        }
    }
}

/// Draws the footer; the area of the address, which links to the engine's page.
fn footer(surface: &mut Surface, faces: &Faces, address: &str, engines: usize) -> Option<Rect> {
    rect(surface, RULE, MARGIN_X, FOOTER_RULE_Y, CONTENT_W, 0.75);
    let baseline = FOOTER_RULE_Y + 13.0;
    const ADDRESS_SIZE: f32 = 7.9;
    text(
        surface,
        &faces.mono,
        ADDRESS_SIZE,
        0.0,
        INK,
        MARGIN_X,
        baseline,
        address,
    );
    text_right(
        surface,
        &faces.sans,
        7.5,
        0.0,
        MUTED,
        PAGE_W - MARGIN_X,
        baseline,
        &format!("Free drum MIDI converter for {engines} engines"),
    );
    Rect::from_xywh(
        MARGIN_X,
        baseline - ADDRESS_SIZE,
        faces.mono.width(address, ADDRESS_SIZE, 0.0),
        ADDRESS_SIZE * 1.4,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{fixtures::site, pages::EnginePage, routes::note_map_href};

    const ENGINES: usize = 86;

    fn page(id: &str) -> &'static EnginePage {
        site()
            .engines
            .iter()
            .find(|p| p.engine.id == id)
            .expect("the engine is in the catalog")
    }

    fn pdf(page: &EnginePage) -> Vec<u8> {
        note_map_pdf(&page.engine, &page.groups, ENGINES).expect("a PDF")
    }

    fn text(pdf: &[u8]) -> String {
        let raw = pdf_extract::extract_text_from_mem(pdf).expect("a readable PDF");
        raw.split(' ')
            .filter(|w| !w.is_empty())
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn text_of(id: &str) -> String {
        text(&pdf(page(id)))
    }

    fn pages(pdf: &[u8]) -> usize {
        pdf_extract::extract_text_from_mem_by_pages(pdf)
            .expect("a readable PDF")
            .len()
    }

    fn rows(page: &EnginePage) -> impl Iterator<Item = &crate::pages::EngineRow> {
        page.groups.iter().flat_map(|g| &g.rows)
    }

    fn assert_rows_in_order(page: &EnginePage, text: &str) {
        let mut rest = text;
        for row in rows(page) {
            let label = row.cell.entry.label();
            let at = rest
                .find(label)
                .unwrap_or_else(|| panic!("{label} missing or out of order"));
            rest = &rest[at + label.len()..];
        }
    }

    #[test]
    fn the_pdf_lists_every_row_of_the_engine_page_in_order() {
        let page = page("ggd_invasion");
        let text = text(&pdf(page));
        assert_rows_in_order(page, &text);
        for row in rows(page) {
            assert!(text.contains(&row.cell.name_c1()), "{}", row.cell.name_c1());
            assert!(text.contains(&row.cell.name_c2()), "{}", row.cell.name_c2());
        }
    }

    #[test]
    fn the_pdf_names_its_engine_and_the_site() {
        let text = text(&pdf(page("ggd_invasion")));
        for needle in [
            "GetGood Drums Invasion",
            "drumverter.com/engines/ggd-invasion",
            "Free drum MIDI converter for 86 engines",
            "47 notes, grouped by drum.",
            "Reaper: use the C-1 column.",
            "Ableton Live, Logic Pro, Cubase, Studio One: use the C-2 column.",
            "find the note by its number.",
        ] {
            assert!(text.contains(needle), "{needle} in {text}");
        }
        assert!(
            text.replace(' ', "").contains("MIDINOTEMAP")
                && text.replace(' ', "").contains("HOWTOREADTHISMAP"),
            "label in {text}"
        );
    }

    #[test]
    fn the_extra_hint_appears_only_with_extra_rows() {
        const HINT: &str = "extra notes for a drum that's already listed";
        let extra = site()
            .engines
            .iter()
            .find(|p| rows(p).any(|r| r.role == NoteRole::Extra))
            .expect("an engine with extra notes");
        assert!(text(&pdf(extra)).contains(HINT));
        assert!(!text(&pdf(page("ggd_invasion"))).contains(HINT));
    }

    #[test]
    fn a_long_engine_takes_more_than_one_page() {
        let longest = site()
            .engines
            .iter()
            .max_by_key(|p| rows(p).count())
            .expect("engines");
        let bytes = pdf(longest);
        assert!(pages(&bytes) > 1, "{} rows", rows(longest).count());
        assert_rows_in_order(longest, &text(&bytes));
    }

    #[test]
    fn an_empty_column_gets_no_table_header() {
        let headers = |id: &str| text_of(id).replace(' ', "").matches("DRUM").count();
        assert_eq!(headers("mt_power"), 1);
        assert_eq!(headers("ggd_invasion"), 2);
    }

    #[test]
    fn a_short_engine_fits_one_page() {
        assert_eq!(pages(&pdf(page("ggd_invasion"))), 1);
    }

    #[test]
    fn non_ascii_names_survive() {
        let page = site()
            .engines
            .iter()
            .find(|p| !p.engine.name.is_ascii())
            .expect("an engine with a non-ASCII name");
        assert!(text(&pdf(page)).contains(&page.engine.name));
    }

    #[test]
    fn the_pdf_embeds_its_fonts_and_names_itself() {
        let bytes = pdf(page("ggd_invasion"));
        assert!(bytes.starts_with(b"%PDF-"));
        let raw = String::from_utf8_lossy(&bytes);
        assert!(raw.contains("/FontFile2") || raw.contains("/FontFile3"));
        assert!(raw.contains("GetGood Drums Invasion MIDI note map"));
    }

    fn guide_width(faces: &Faces, line: GuideLine) -> f32 {
        line.iter()
            .map(|&(weight, run)| face(faces, weight).width(run, NOTE_SIZE, 0.0))
            .sum()
    }

    #[test]
    fn guide_text_has_no_double_spaces() {
        for line in guide(true) {
            for (_, run) in line {
                assert!(!run.contains("  "), "{run}");
            }
        }
    }

    #[test]
    fn every_guide_line_fits_the_page() {
        let faces = Faces::load();
        for line in guide(true) {
            assert!(guide_width(&faces, line) <= CONTENT_W);
        }
    }

    #[test]
    fn only_a_map_in_one_column_of_one_page_is_centred() {
        assert!(fills_one_column(&[[vec![1], vec![]]]));
        assert!(!fills_one_column(&[[vec![1], vec![2]]]));
        assert!(!fills_one_column(&[[vec![1], vec![2]], [vec![3], vec![]]]));
    }

    #[test]
    fn a_lone_column_sits_in_the_middle_of_the_page() {
        let left = column_left(0, true);
        assert!((left + COLUMN_W / 2.0 - PAGE_W / 2.0).abs() < 0.01);
        assert!((column_left(0, false) - MARGIN_X).abs() < 0.01);
        assert!((column_left(1, false) + COLUMN_W - (PAGE_W - MARGIN_X)).abs() < 0.01);
    }

    #[test]
    fn every_engine_has_a_note_map_pdf() {
        let files = note_map_files(site()).expect("PDFs");
        assert_eq!(files.len(), site().engines.len());
        for (p, (href, bytes)) in site().engines.iter().zip(&files) {
            assert_eq!(*href, note_map_href(&p.engine.slug));
            assert_eq!(*href, p.engine.note_map().href);
            assert!(bytes.starts_with(b"%PDF-"), "{}", p.engine.id);
        }
        let footer = format!("for {} engines", site().index.all.len());
        assert!(text(&files[0].1).contains(&footer), "{footer}");
    }
}

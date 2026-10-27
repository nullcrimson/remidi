use krilla::{
    text::{Font, GlyphId, KrillaGlyph, Tag},
    Data,
};
use skrifa::{instance::Size, raw::TableProvider, FontRef, MetadataProvider};

static SANS: &[u8] = include_bytes!("../../assets/fonts/IBMPlexSans-Regular.ttf");
static SANS_SEMIBOLD: &[u8] = include_bytes!("../../assets/fonts/IBMPlexSans-SemiBold.ttf");
static MONO: &[u8] = include_bytes!("../../assets/fonts/IBMPlexMono-Regular.ttf");
static MONO_MEDIUM: &[u8] = include_bytes!("../../assets/fonts/IBMPlexMono-Medium.ttf");
static DISPLAY: &[u8] = include_bytes!("../../assets/fonts/SpaceGrotesk-Variable.ttf");

/// A typeface at one weight: what the PDF embeds and how wide its text sets.
pub(super) struct Face {
    font: Font,
    data: &'static [u8],
    weight: Option<f32>,
}

/// The faces a note map sets its text in.
pub(super) struct Faces {
    pub sans: Face,
    pub sans_semibold: Face,
    pub mono: Face,
    pub mono_medium: Face,
    pub display_semibold: Face,
    pub display_bold: Face,
}

impl Faces {
    pub(super) fn load() -> Self {
        Self {
            sans: Face::fixed(SANS),
            sans_semibold: Face::fixed(SANS_SEMIBOLD),
            mono: Face::fixed(MONO),
            mono_medium: Face::fixed(MONO_MEDIUM),
            display_semibold: Face::variable(DISPLAY, 600.0),
            display_bold: Face::variable(DISPLAY, 700.0),
        }
    }
}

impl Face {
    fn fixed(data: &'static [u8]) -> Self {
        Self {
            font: Font::new(Data::from(data), 0).expect("the bundled fonts parse"),
            data,
            weight: None,
        }
    }

    fn variable(data: &'static [u8], weight: f32) -> Self {
        Self {
            font: Font::new_variable(Data::from(data), 0, &[(Tag::new(b"wght"), weight)])
                .expect("the bundled fonts parse"),
            data,
            weight: Some(weight),
        }
    }

    pub(super) fn font(&self) -> Font {
        self.font.clone()
    }

    /// The glyphs of `text`, each advanced by its width plus `tracking` (in em).
    pub(super) fn glyphs(&self, text: &str, tracking: f32) -> Vec<KrillaGlyph> {
        let font = FontRef::new(self.data).expect("the bundled fonts parse");
        let units = font
            .head()
            .map_or(1000.0, |head| f32::from(head.units_per_em()));
        let location = font.axes().location(self.weight.map(|w| ("wght", w)));
        let metrics = font.glyph_metrics(Size::unscaled(), &location);
        let charmap = font.charmap();
        text.char_indices()
            .map(|(at, c)| {
                let glyph = charmap.map(c).unwrap_or_default();
                let advance = metrics.advance_width(glyph).unwrap_or_default() / units;
                KrillaGlyph::new(
                    GlyphId::new(glyph.to_u32()),
                    advance + tracking,
                    0.0,
                    0.0,
                    0.0,
                    at..at + c.len_utf8(),
                    None,
                )
            })
            .collect()
    }

    /// How wide `text` sets at `size` points with `tracking` (in em).
    pub(super) fn width(&self, text: &str, size: f32, tracking: f32) -> f32 {
        self.glyphs(text, tracking)
            .iter()
            .map(|g| krilla::text::Glyph::x_advance(g, size))
            .sum()
    }
}
